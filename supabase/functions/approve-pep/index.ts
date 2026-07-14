// approve-pep — PEP senior-approval endpoint with two-step role enforcement.
//
// Role model (mirrors Sanctions & Screening pattern):
//   - staff: 403 on all actions
//   - compliance_officer: may submit_assessment (prepare PEP review, set status to pending_senior)
//   - mlro / admin: may approve (final senior sign-off) OR submit_assessment
//   - When one person holds both CO and MLRO, they perform both steps — each audited separately.
//
// Actions:
//   submit_assessment — CO prepares the review (notes, sow/sof ref, family/associates, monitoring flag)
//   approve           — MLRO/admin gives final sign-off (sets pep_confirmed_by, pep_confirmed_at, pep_senior_approver_name)
//   reject            — MLRO/admin rejects the PEP (sets senior_approval_status to rejected)

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action = "submit_assessment" | "approve" | "reject";

interface PepApprovalRequest {
  client_id: string;
  action: Action;
  notes: string;
  senior_approver_name?: string;
  sow_sof_reference?: string;
  family_associates?: string;
  enhanced_monitoring?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Role enforcement
    const { data: profile } = await serviceClient
      .from("user_profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role;
    const isStaff = role === "staff";
    const isComplianceOfficer = role === "compliance_officer";
    const isMlro = role === "mlro";
    const isAdmin = role === "admin" || role === "system_admin";
    const isSenior = isMlro || isAdmin;

    // Admin/system_admin may have null organization_id — they can act on any client.
    // Non-admin users must belong to an organization.
    if (!profile?.organization_id && !isAdmin) {
      return new Response(JSON.stringify({ error: "No organization" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden: staff cannot perform PEP approval actions" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: PepApprovalRequest = await req.json();
    const { action, notes } = body;

    const validActions: Action[] = ["submit_assessment", "approve", "reject"];
    if (!validActions.includes(action)) {
      return new Response(JSON.stringify({ error: `Invalid action. Must be one of: ${validActions.join(", ")}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.client_id) {
      return new Response(JSON.stringify({ error: "client_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!notes || notes.trim().length < 10) {
      return new Response(JSON.stringify({ error: "notes must be at least 10 characters — regulators require a written reason" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action-level role enforcement:
    // submit_assessment: compliance_officer, mlro, admin
    // approve / reject:  mlro, admin only (not compliance_officer alone)
    if (action === "submit_assessment") {
      if (!isComplianceOfficer && !isMlro && !isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden: only Compliance Officers may submit PEP assessments" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // approve or reject — senior only
      if (!isSenior) {
        return new Response(JSON.stringify({ error: "Forbidden: only MLRO or Admin may give final PEP senior approval" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!body.senior_approver_name || body.senior_approver_name.trim().length < 2) {
        return new Response(JSON.stringify({ error: "senior_approver_name is required for final approval (min 2 chars)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const orgId = profile.organization_id;
    const userId = user.id;
    const userEmail = user.email;
    const now = new Date().toISOString();

    // Verify client exists and is a PEP.
    // Admin users (null org) can access any client; others are scoped to their org.
    let clientQuery = serviceClient
      .from("kyc_clients")
      .select("id, pep_status, pep_confirmed_at, senior_approval_status, organization_id")
      .eq("id", body.client_id);
    if (orgId) {
      clientQuery = clientQuery.eq("organization_id", orgId);
    }
    const { data: client } = await clientQuery.maybeSingle();

    if (!client) {
      return new Response(JSON.stringify({ error: "Client not found in your organisation" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!client.pep_status) {
      return new Response(JSON.stringify({ error: "Client is not flagged as a PEP" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // State machine: prevent actions on already-approved/rejected clients
    if (action === "submit_assessment" && client.senior_approval_status === "approved") {
      return new Response(JSON.stringify({ error: "PEP has already been approved — cannot submit a new assessment" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action === "approve" && client.pep_confirmed_at) {
      return new Response(JSON.stringify({ error: "PEP has already been confirmed" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action === "approve" && client.senior_approval_status !== "pending_senior" && client.senior_approval_status !== "pending") {
      return new Response(JSON.stringify({ error: "Cannot approve — a CO assessment must be submitted first (current status: " + client.senior_approval_status + ")" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------------------
    // submit_assessment — CO prepares the review
    // ----------------------------------------------------------------
    if (action === "submit_assessment") {
      const updateData: Record<string, unknown> = {
        pep_sow_sof_reference: body.sow_sof_reference?.trim() || null,
        pep_family_associates: body.family_associates ? JSON.parse(body.family_associates) : null,
        pep_enhanced_monitoring: body.enhanced_monitoring ?? false,
        pep_senior_approval_notes: notes.trim(),
        senior_approval_status: "pending_senior",
        updated_at: now,
      };

      const { data: updated, error: updateError } = await serviceClient
        .from("kyc_clients")
        .update(updateData)
        .eq("id", body.client_id)
        .select("id, pep_status, senior_approval_status, pep_enhanced_monitoring")
        .single();

      if (updateError) throw new Error(updateError.message);

      await serviceClient.from("screening_audit_log").insert({
        organization_id: orgId || client.organization_id,
        action: "pep_assessment_submitted",
        actor_id: userId,
        actor_email: userEmail,
        details: {
          client_id: body.client_id,
          notes: notes.trim(),
          sow_sof_reference: body.sow_sof_reference?.trim() || null,
          enhanced_monitoring: body.enhanced_monitoring ?? false,
          new_status: "pending_senior",
          actor_role: role,
        },
      });

      return new Response(JSON.stringify({ success: true, client: updated, next_step: "approve" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------------------
    // approve — MLRO/admin gives final sign-off
    // ----------------------------------------------------------------
    if (action === "approve") {
      const updateData = {
        pep_confirmed_by: userId,
        pep_confirmed_at: now,
        pep_senior_approver_name: body.senior_approver_name!.trim(),
        pep_senior_approved_at: now,
        pep_senior_approval_notes: notes.trim(),
        pep_enhanced_monitoring: body.enhanced_monitoring ?? false,
        senior_approval_status: "approved",
        senior_approval_by: userId,
        senior_approval_date: now,
        senior_approval_notes: notes.trim(),
        updated_at: now,
      };

      const { data: updated, error: updateError } = await serviceClient
        .from("kyc_clients")
        .update(updateData)
        .eq("id", body.client_id)
        .select("id, pep_status, pep_confirmed_by, pep_confirmed_at, pep_senior_approver_name, senior_approval_status")
        .single();

      if (updateError) throw new Error(updateError.message);

      await serviceClient.from("screening_audit_log").insert({
        organization_id: orgId || client.organization_id,
        action: "pep_senior_approved",
        actor_id: userId,
        actor_email: userEmail,
        details: {
          client_id: body.client_id,
          notes: notes.trim(),
          senior_approver_name: body.senior_approver_name!.trim(),
          enhanced_monitoring: body.enhanced_monitoring ?? false,
          new_status: "approved",
          actor_role: role,
        },
      });

      return new Response(JSON.stringify({ success: true, client: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------------------
    // reject — MLRO/admin rejects the PEP
    // ----------------------------------------------------------------
    const updateData = {
      pep_senior_approval_notes: notes.trim(),
      senior_approval_status: "rejected",
      senior_approval_by: userId,
      senior_approval_date: now,
      senior_approval_notes: notes.trim(),
      updated_at: now,
    };

    const { data: updated, error: updateError } = await serviceClient
      .from("kyc_clients")
      .update(updateData)
      .eq("id", body.client_id)
      .select("id, pep_status, senior_approval_status")
      .single();

    if (updateError) throw new Error(updateError.message);

    await serviceClient.from("screening_audit_log").insert({
      organization_id: orgId || client.organization_id,
      action: "pep_senior_rejected",
      actor_id: userId,
      actor_email: userEmail,
      details: {
        client_id: body.client_id,
        notes: notes.trim(),
        new_status: "rejected",
        actor_role: role,
      },
    });

    return new Response(JSON.stringify({ success: true, client: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("approve-pep error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
