// action-transaction-alert — CO-only endpoint to confirm or clear transaction alerts.
// Role enforcement:
//   - staff role: 403
//   - compliance_officer / admin / system_admin: may confirm_suspicious or clear_false_positive
// Notes validation: min 10 chars, enforced server-side.
// STR deadline: set automatically 24 hours from confirmation (AMLA s.18(1)).
// Audit: every action written to screening_audit_log (shared, append-only table).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action = "confirm_suspicious" | "clear_false_positive" | "file_str";

interface ActionRequest {
  alert_id: string;
  action: Action;
  notes: string;
  str_reference_number?: string; // required for file_str
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

    // Role enforcement — staff gets 403, consistent with review-matches pattern
    const { data: profile } = await serviceClient
      .from("user_profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedRoles = ["compliance_officer", "admin", "system_admin"];
    if (!allowedRoles.includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Forbidden: only Compliance Officers may action transaction alerts" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ActionRequest = await req.json();
    const { alert_id, action, notes, str_reference_number } = body;

    const validActions: Action[] = ["confirm_suspicious", "clear_false_positive", "file_str"];
    if (!validActions.includes(action)) {
      return new Response(JSON.stringify({ error: `Invalid action. Must be one of: ${validActions.join(", ")}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!alert_id) {
      return new Response(JSON.stringify({ error: "alert_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side notes validation (same standard as review-matches)
    if (!notes || notes.trim().length < 10) {
      return new Response(JSON.stringify({ error: "notes must be at least 10 characters — regulators require a written reason" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.organization_id;
    const userId = user.id;
    const userEmail = user.email;
    const now = new Date().toISOString();

    // Verify alert belongs to this organisation
    const { data: alert } = await serviceClient
      .from("transaction_alerts")
      .select("id, investigation_status, str_filed, str_deadline, organization_id, alert_number, client_id")
      .eq("id", alert_id)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!alert) {
      return new Response(JSON.stringify({ error: "Alert not found in your organisation" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------------------
    // STR filing action
    // ----------------------------------------------------------------
    if (action === "file_str") {
      if (!alert.str_filed) {
        return new Response(JSON.stringify({ error: "STR can only be filed after the alert has been confirmed as suspicious" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!str_reference_number || str_reference_number.trim().length < 3) {
        return new Response(JSON.stringify({ error: "str_reference_number is required (min 3 chars)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: updated, error: updateError } = await serviceClient
        .from("transaction_alerts")
        .update({
          str_reference_number: str_reference_number.trim(),
          str_record_saved_at: now,
          str_record_saved_by: userId,
          updated_at: now,
        })
        .eq("id", alert_id)
        .select()
        .single();

      if (updateError) throw new Error(updateError.message);

      await serviceClient.from("screening_audit_log").insert({
        organization_id: orgId,
        action: "str_record_saved",
        actor_id: userId,
        actor_email: userEmail,
        details: {
          alert_id,
          alert_number: alert.alert_number,
          client_id: alert.client_id,
          str_reference_number: str_reference_number.trim(),
          saved_at: now,
          str_deadline: alert.str_deadline,
          overdue: alert.str_deadline ? new Date(now) > new Date(alert.str_deadline) : false,
          notes: notes.trim(),
        },
      });

      return new Response(JSON.stringify({ success: true, alert: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------------------
    // Already-resolved guard
    // ----------------------------------------------------------------
    if (alert.investigation_status === "resolved" && action !== "file_str") {
      return new Response(JSON.stringify({ error: "Alert has already been resolved" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------------------
    // confirm_suspicious — marks as suspicious, sets STR deadline 24h
    // ----------------------------------------------------------------
    let alertUpdate: Record<string, unknown> = { updated_at: now };
    let auditAction: string;

    if (action === "confirm_suspicious") {
      // 24-hour STR deadline per AMLA s.18(1)
      const strDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      alertUpdate = {
        ...alertUpdate,
        investigation_status: "escalated",
        str_filed: true,
        str_deadline: strDeadline,
        escalated_at: now,
        escalated_by: userId,
        investigation_notes: notes.trim(),
        is_false_positive: false,
      };
      auditAction = "alert_confirmed_suspicious";
    } else {
      // clear_false_positive
      alertUpdate = {
        ...alertUpdate,
        investigation_status: "resolved",
        is_false_positive: true,
        false_positive_reason: notes.trim(),
        resolved_by: userId,
        resolved_date: now,
        resolution_type: "false_positive",
        resolution_notes: notes.trim(),
      };
      auditAction = "alert_cleared_false_positive";
    }

    const { data: updated, error: updateError } = await serviceClient
      .from("transaction_alerts")
      .update(alertUpdate)
      .eq("id", alert_id)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    await serviceClient.from("screening_audit_log").insert({
      organization_id: orgId,
      action: auditAction,
      actor_id: userId,
      actor_email: userEmail,
      details: {
        alert_id,
        alert_number: alert.alert_number,
        client_id: alert.client_id,
        notes: notes.trim(),
        new_status: alertUpdate.investigation_status,
        ...(action === "confirm_suspicious" ? { str_deadline: alertUpdate.str_deadline } : {}),
      },
    });

    return new Response(JSON.stringify({ success: true, alert: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("action-transaction-alert error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
