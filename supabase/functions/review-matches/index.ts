// review-matches — CO-only endpoint to clear, escalate, or confirm a screening match.
// Role enforcement:
//   - staff role: 403
//   - compliance_officer / admin: may clear, escalate, confirm
//   - escalation when CO is also MLRO uses pending_second_review + escalation_justification
// Notes validation: min 10 chars, enforced server-side.
// STR deadline: set automatically on match_confirmed.
// Audit: every action written to screening_audit_log (append-only).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action = "clear" | "escalate" | "confirm" | "file_str";

interface ReviewRequest {
  match_id?: string;
  screening_result_id?: string; // used for file_str action
  action: Action;
  notes: string;
  escalation_justification?: string; // required when CO is also MLRO escalating
  str_reference_number?: string;     // required for file_str
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

    // --- FIX 2: Role enforcement ---
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
      return new Response(JSON.stringify({ error: "Forbidden: only Compliance Officers may review screening matches" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ReviewRequest = await req.json();
    const { action, notes, escalation_justification, str_reference_number } = body;

    // --- FIX 2: Server-side notes validation ---
    const validActions: Action[] = ["clear", "escalate", "confirm", "file_str"];
    if (!validActions.includes(action)) {
      return new Response(JSON.stringify({ error: `Invalid action. Must be one of: ${validActions.join(", ")}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action !== "file_str") {
      if (!notes || notes.trim().length < 10) {
        return new Response(JSON.stringify({ error: "notes must be at least 10 characters — regulators require a written reason" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const orgId = profile.organization_id;
    const userId = user.id;
    const userEmail = user.email;
    const now = new Date().toISOString();

    // ----------------------------------------------------------------
    // STR filing action (CO/MLRO only, no match_id needed)
    // ----------------------------------------------------------------
    if (action === "file_str") {
      const { screening_result_id } = body;
      if (!screening_result_id) {
        return new Response(JSON.stringify({ error: "screening_result_id is required for file_str" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!str_reference_number || str_reference_number.trim().length < 3) {
        return new Response(JSON.stringify({ error: "str_reference_number is required (min 3 chars)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify belongs to org
      const { data: sr } = await serviceClient
        .from("screening_results")
        .select("id, status, str_deadline, organization_id")
        .eq("id", screening_result_id)
        .eq("organization_id", orgId)
        .maybeSingle();

      if (!sr) {
        return new Response(JSON.stringify({ error: "Screening result not found in your organisation" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (sr.status !== "match_confirmed") {
        return new Response(JSON.stringify({ error: "STR can only be filed for confirmed matches" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: updated, error: updateError } = await serviceClient
        .from("screening_results")
        .update({
          str_reference_number: str_reference_number.trim(),
          str_filed_by: userId,
          str_filed_at: now,
        })
        .eq("id", screening_result_id)
        .select()
        .single();

      if (updateError) throw new Error(updateError.message);

      await serviceClient.from("screening_audit_log").insert({
        organization_id: orgId,
        screening_result_id,
        action: "str_filed",
        actor_id: userId,
        actor_email: userEmail,
        details: {
          str_reference_number: str_reference_number.trim(),
          filed_at: now,
          str_deadline: sr.str_deadline,
          overdue: sr.str_deadline ? new Date(now) > new Date(sr.str_deadline) : false,
        },
      });

      return new Response(JSON.stringify({ success: true, screening_result: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------------------
    // Match-level actions (clear / escalate / confirm)
    // ----------------------------------------------------------------
    const { match_id } = body;
    if (!match_id) {
      return new Response(JSON.stringify({ error: "match_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: match } = await serviceClient
      .from("screening_matches")
      .select("id, status, screening_result_id, organization_id, list_source")
      .eq("id", match_id)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!match) {
      return new Response(JSON.stringify({ error: "Match not found in your organisation" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (match.status === "confirmed_match" || match.status === "cleared_false_positive") {
      return new Response(JSON.stringify({ error: "Match has already been resolved" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let newMatchStatus: string;
    let auditAction: string;

    if (action === "clear") {
      newMatchStatus = "cleared_false_positive";
      auditAction = "match_cleared";
    } else if (action === "confirm") {
      newMatchStatus = "confirmed_match";
      auditAction = "match_confirmed";
    } else {
      // action === "escalate"
      // FIX 3: CO=MLRO distinction — use pending_second_review with mandatory escalation_justification
      if (!escalation_justification || escalation_justification.trim().length < 10) {
        return new Response(JSON.stringify({
          error: "escalation_justification is required (min 10 chars) — document why this needs further review before a final decision",
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      newMatchStatus = "pending_second_review";
      auditAction = "match_escalated";
    }

    // Update match
    const matchUpdate: Record<string, unknown> = {
      status: newMatchStatus,
      reviewer_id: userId,
      review_notes: notes.trim(),
      reviewed_at: now,
      updated_at: now,
    };

    if (action === "escalate") {
      matchUpdate.escalation_justification = escalation_justification!.trim();
      matchUpdate.escalated_at = now;
    }

    const { data: updatedMatch, error: matchUpdateError } = await serviceClient
      .from("screening_matches")
      .update(matchUpdate)
      .eq("id", match_id)
      .select()
      .single();

    if (matchUpdateError) throw new Error(matchUpdateError.message);

    // Audit entry for this action
    await serviceClient.from("screening_audit_log").insert({
      organization_id: orgId,
      screening_result_id: match.screening_result_id,
      match_id,
      action: auditAction,
      actor_id: userId,
      actor_email: userEmail,
      details: {
        notes: notes.trim(),
        ...(action === "escalate" ? { escalation_justification: escalation_justification!.trim() } : {}),
        list_source: match.list_source,
        new_status: newMatchStatus,
      },
    });

    // If confirmed — update parent screening_result + trigger sets str_deadline
    if (action === "confirm") {
      await serviceClient
        .from("screening_results")
        .update({ overall_risk: "critical", status: "match_confirmed" })
        .eq("id", match.screening_result_id);
    }

    // If cleared — check if all matches are now resolved → close the screening
    if (action === "clear") {
      const { data: openMatches } = await serviceClient
        .from("screening_matches")
        .select("id")
        .eq("screening_result_id", match.screening_result_id)
        .eq("status", "pending_review");

      if (!openMatches || openMatches.length === 0) {
        await serviceClient
          .from("screening_results")
          .update({ status: "cleared" })
          .eq("id", match.screening_result_id)
          .neq("status", "match_confirmed");
      }
    }

    return new Response(JSON.stringify({ success: true, match: updatedMatch }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("review-matches error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
