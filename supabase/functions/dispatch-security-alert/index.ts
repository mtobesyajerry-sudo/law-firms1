import { createClient } from "npm:@supabase/supabase-js@2.39.0";

/*
  dispatch-security-alert
  ───────────────────────
  Called by a Postgres trigger on suspicious_activity_alerts AFTER INSERT.
  Reads the alert, resolves admin recipients, and sends an email via Resend.

  IMPORTANT: Set RESEND_API_KEY in Edge Function secrets before this will send
  real emails. Until it is set the function logs the would-be recipient list and
  returns a 200 so the trigger does not error.

  Also set APP_URL in Edge Function secrets (e.g. https://yourapp.com).
  If not set, falls back to the Supabase project URL.
*/

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const alertId: string = body?.alert_id;

    if (!alertId) {
      return new Response(
        JSON.stringify({ error: "alert_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 1. Fetch the alert ──────────────────────────────────────────────────
    const { data: alert, error: alertErr } = await supabase
      .from("suspicious_activity_alerts")
      .select("*, organizations(name)")
      .eq("id", alertId)
      .maybeSingle();

    if (alertErr || !alert) {
      console.error("Alert not found:", alertErr);
      return new Response(
        JSON.stringify({ error: "Alert not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orgName: string = (alert.organizations as any)?.name ?? "Unknown Organisation";

    // ── 2. Resolve admin recipients ─────────────────────────────────────────
    // (a) Org-level admins
    const orgAdminQuery = supabase
      .from("user_profiles")
      .select("email, full_name")
      .eq("role", "admin")
      .eq("is_active", true);

    if (alert.organization_id) {
      orgAdminQuery.eq("organization_id", alert.organization_id);
    }

    const { data: orgAdmins } = await orgAdminQuery;

    // (b) Global admins (no org)
    const { data: globalAdmins } = await supabase
      .from("user_profiles")
      .select("email, full_name")
      .eq("role", "admin")
      .eq("is_active", true)
      .is("organization_id", null);

    const recipients = [
      ...(orgAdmins ?? []),
      ...(globalAdmins ?? []),
    ].filter(
      (r, i, arr) => r.email && arr.findIndex(x => x.email === r.email) === i
    );

    if (recipients.length === 0) {
      console.warn("No admin recipients found for alert", alertId);
      return new Response(
        JSON.stringify({ success: true, message: "No admin recipients found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Build email content ──────────────────────────────────────────────
    const appUrl = Deno.env.get("APP_URL") ?? Deno.env.get("SUPABASE_URL");
    const detectedAt = new Date(alert.created_at).toLocaleString("en-GB", {
      timeZone: "Africa/Dar_es_Salaam",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const subject = `[Security Alert] ${alert.alert_type} — ${alert.severity?.toUpperCase()} — ${orgName}`;

    const textBody = [
      `A security alert has been triggered on your account.`,
      ``,
      `Type:          ${alert.alert_type}`,
      `Severity:      ${alert.severity?.toUpperCase()}`,
      `Organisation:  ${orgName}`,
      `Detected at:   ${detectedAt} (EAT)`,
      ``,
      `Details:`,
      alert.description ?? "(no description)",
      ``,
      `Review and investigate at:`,
      `${appUrl}/security/alerts/${alert.id}`,
      ``,
      `This is an automated message from the AML Compliance Platform.`,
      `Do not reply to this email.`,
    ].join("\n");

    const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fafaf7;border:1px solid #e2e2dc;border-radius:8px;overflow:hidden">
  <div style="background:#0a1929;padding:20px 24px;border-bottom:2px solid #d4af37">
    <h2 style="color:#d4af37;margin:0;font-size:16px;letter-spacing:0.5px">SECURITY ALERT — ${alert.severity?.toUpperCase()}</h2>
    <p style="color:#f4e8b8;margin:4px 0 0;font-size:12px">${orgName}</p>
  </div>
  <div style="padding:24px">
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr><td style="padding:6px 0;color:#6b6b6b;width:130px">Type</td><td style="padding:6px 0;font-weight:600">${alert.alert_type}</td></tr>
      <tr><td style="padding:6px 0;color:#6b6b6b">Severity</td><td style="padding:6px 0;font-weight:600;color:${alert.severity === "critical" ? "#c0392b" : alert.severity === "high" ? "#e67e22" : "#2980b9"}">${alert.severity?.toUpperCase()}</td></tr>
      <tr><td style="padding:6px 0;color:#6b6b6b">Organisation</td><td style="padding:6px 0">${orgName}</td></tr>
      <tr><td style="padding:6px 0;color:#6b6b6b">Detected at</td><td style="padding:6px 0">${detectedAt} (EAT)</td></tr>
    </table>
    <div style="margin-top:16px;padding:12px 16px;background:#fff;border:1px solid #e2e2dc;border-radius:4px;font-size:13px;color:#1a1a1a;line-height:1.6">
      ${alert.description ?? "(no description)"}
    </div>
    <div style="margin-top:20px">
      <a href="${appUrl}/security/alerts/${alert.id}"
         style="display:inline-block;padding:10px 20px;background:#0a1929;color:#d4af37;text-decoration:none;border-radius:4px;font-size:12px;font-weight:700;letter-spacing:0.5px;border:1px solid #d4af37">
        Review Alert
      </a>
    </div>
  </div>
  <div style="padding:12px 24px;background:#f0f0ec;border-top:1px solid #e2e2dc;font-size:11px;color:#6b6b6b">
    This is an automated message from the AML Compliance Platform. Do not reply.
  </div>
</div>`;

    // ── 4. Send via Resend ──────────────────────────────────────────────────
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!resendKey) {
      // Key not yet configured — log and return success so trigger doesn't error
      console.warn(
        "[dispatch-security-alert] RESEND_API_KEY not set. " +
        "Would have sent to:", recipients.map(r => r.email).join(", "),
        "Subject:", subject
      );
      return new Response(
        JSON.stringify({
          success: true,
          message: "RESEND_API_KEY not configured — email not sent",
          would_send_to: recipients.map(r => r.email),
          subject,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FROM_EMAIL = "onboarding@resend.dev";
    const sendResults: { email: string; status: number }[] = [];

    for (const recipient of recipients) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `AML Compliance Platform <${FROM_EMAIL}>`,
          to: [recipient.email],
          subject,
          text: textBody,
          html: htmlBody,
        }),
      });

      const resBody = await res.json().catch(() => ({}));
      sendResults.push({ email: recipient.email, status: res.status });

      if (!res.ok) {
        console.error(`Resend failed for ${recipient.email}:`, resBody);
      } else {
        console.log(`Alert email sent to ${recipient.email}, Resend id: ${(resBody as any).id}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: sendResults.length, results: sendResults }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[dispatch-security-alert] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
