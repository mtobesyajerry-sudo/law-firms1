import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ipAddress = forwarded
      ? forwarded.split(",")[0].trim()
      : (realIp ?? "unknown");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const {
      email,
      success,
      user_id = null,
      failure_reason = null,
      mfa_used = false,
      user_agent = null,
    } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Write login_history record
    const { error: historyError } = await supabaseAdmin.from("login_history").insert({
      user_id,
      email,
      success: success === true,
      failure_reason,
      ip_address: ipAddress,
      user_agent,
      mfa_used: mfa_used === true,
    });

    if (historyError) {
      console.error("log-login-event insert error:", historyError.message, historyError.code);
    }

    // On failed login: upsert into failed_login_attempts so detect_security_threats
    // has data to work with. We upsert by (email, ip_address) within a 15-minute window
    // to aggregate rapid repeat attempts into a single counter row.
    if (success !== true) {
      try {
        const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        // Look for an existing row for this email+ip within the current 15-min window
        const { data: existing } = await supabaseAdmin
          .from("failed_login_attempts")
          .select("id, attempt_count")
          .eq("email", email)
          .eq("ip_address", ipAddress)
          .gte("last_attempt_at", windowStart)
          .maybeSingle();

        if (existing) {
          await supabaseAdmin
            .from("failed_login_attempts")
            .update({
              attempt_count: (existing.attempt_count ?? 1) + 1,
              last_attempt_at: new Date().toISOString(),
              failure_reason,
              user_agent,
            })
            .eq("id", existing.id);
        } else {
          await supabaseAdmin
            .from("failed_login_attempts")
            .insert({
              email,
              ip_address: ipAddress,
              attempt_count: 1,
              first_attempt_at: new Date().toISOString(),
              last_attempt_at: new Date().toISOString(),
              failure_reason,
              user_agent,
            });
        }
      } catch (attemptErr) {
        // Non-fatal — never block the response due to tracking failure
        console.error("failed_login_attempts write error:", attemptErr);
      }
    }

    // On failed login: write audit_logs server-side with service role.
    // Replaces the client-side auditService.logSecurityEvent call which returned 401
    // because the browser has no session at the point of a failed login.
    if (success !== true) {
      try {
        await supabaseAdmin.from("audit_logs").insert({
          action_type: "login_failed",
          event_category: "security",
          entity_type: "auth.session",
          action_description: `Failed login attempt for ${email}`,
          severity: "warning",
          ip_address: ipAddress,
          user_agent,
          changes: { reason: failure_reason },
        });
      } catch (auditErr) {
        console.error("audit_logs write error:", auditErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("log-login-event error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
