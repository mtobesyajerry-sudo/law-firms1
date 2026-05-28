import { createClient } from "npm:@supabase/supabase-js@2.39.0";

/*
  match-crdb-deposit
  ──────────────────
  Admin-only. Matches a crdb_deposits row to a pending bank-transfer claim,
  activates the subscription, and emails the organisation contact.

  Body: { deposit_id: uuid, payment_id: uuid }

  Steps:
  1. Validate admin JWT
  2. Load deposit — must be status='unmatched'
  3. Load payment — must be payment_method='bank_transfer_crdb' AND status='pending'
  4. Amounts must match
  5. UPDATE crdb_deposits → status='matched', matched_payment_id, matched_at, matched_by
  6. Call activate_subscription_after_payment(payment_id)
  7. Send confirmation email to org contact_email via Resend
  8. Return success
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // ── 1. Auth ─────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.slice(7);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) {
      return jsonResp({ error: "Invalid or expired token" }, 401);
    }

    // ── 2. Role check — admin only ──────────────────────────────────────────
    const { data: profile } = await admin
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return jsonResp({ error: "Admin access required" }, 403);
    }

    // ── 3. Parse body ───────────────────────────────────────────────────────
    let body: { deposit_id?: string; payment_id?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResp({ error: "Invalid JSON body" }, 400);
    }

    const { deposit_id, payment_id } = body;
    if (!deposit_id || !payment_id) {
      return jsonResp({ error: "deposit_id and payment_id are required" }, 400);
    }

    // ── 4. Load deposit ─────────────────────────────────────────────────────
    const { data: deposit, error: depErr } = await admin
      .from("crdb_deposits")
      .select("id, amount_tzs, status")
      .eq("id", deposit_id)
      .maybeSingle();

    if (depErr || !deposit) {
      return jsonResp({ error: "Deposit not found" }, 404);
    }
    if (deposit.status !== "unmatched") {
      return jsonResp({ error: `Deposit is already '${deposit.status}' — cannot match again` }, 409);
    }

    // ── 5. Load payment ─────────────────────────────────────────────────────
    const { data: payment, error: payErr } = await admin
      .from("subscription_payments")
      .select("id, amount_gross_tzs, payment_method, status, organization_id, payment_reference, tier, billing_cycle, period_start, period_end")
      .eq("id", payment_id)
      .maybeSingle();

    if (payErr || !payment) {
      return jsonResp({ error: "Payment claim not found" }, 404);
    }
    if (payment.payment_method !== "bank_transfer_crdb") {
      return jsonResp({ error: "Payment is not a CRDB bank transfer claim" }, 400);
    }
    if (!["pending", "pending_confirmation"].includes(payment.status)) {
      return jsonResp({ error: `Payment is already '${payment.status}' — cannot match` }, 409);
    }

    // ── 6. Amount check ─────────────────────────────────────────────────────
    if (Number(deposit.amount_tzs) !== Number(payment.amount_gross_tzs)) {
      return jsonResp({
        error: `Amount mismatch: deposit is TZS ${deposit.amount_tzs}, claim is TZS ${payment.amount_gross_tzs}`,
      }, 422);
    }

    // ── 7. Update deposit ───────────────────────────────────────────────────
    const { error: updateDepErr } = await admin
      .from("crdb_deposits")
      .update({
        status:             "matched",
        matched_payment_id: payment_id,
        matched_at:         new Date().toISOString(),
        matched_by:         user.id,
      })
      .eq("id", deposit_id);

    if (updateDepErr) {
      console.error("Failed to update deposit:", updateDepErr);
      return jsonResp({ error: "Failed to update deposit record" }, 500);
    }

    // ── 8. Activate subscription ────────────────────────────────────────────
    const { error: activateErr } = await admin.rpc("activate_subscription_after_payment", {
      p_payment_id: payment_id,
    });

    if (activateErr) {
      // Roll back deposit status
      await admin.from("crdb_deposits").update({ status: "unmatched", matched_payment_id: null, matched_at: null, matched_by: null }).eq("id", deposit_id);
      console.error("activate_subscription_after_payment failed:", activateErr);
      return jsonResp({ error: "Failed to activate subscription: " + activateErr.message }, 500);
    }

    // ── 9. Fetch org contact email ──────────────────────────────────────────
    const { data: org } = await admin
      .from("organizations")
      .select("name, contact_email")
      .eq("id", payment.organization_id)
      .maybeSingle();

    const orgName      = org?.name          ?? "Your organisation";
    const contactEmail = org?.contact_email ?? null;

    // ── 10. Send confirmation email via Resend ──────────────────────────────
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const tierLabel  = (payment.tier ?? "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    const cycleLabel = payment.billing_cycle === "annual" ? "Annual" : "Monthly";

    const formatDate = (d: string | null) =>
      d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—";

    const periodRow = (payment.period_start && payment.period_end)
      ? `<tr><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Subscription Period</td><td style="padding:10px 12px;color:#1a1a1a">${formatDate(payment.period_start)} — ${formatDate(payment.period_end)}</td></tr>`
      : "";
    const periodText = (payment.period_start && payment.period_end)
      ? `Period:       ${formatDate(payment.period_start)} — ${formatDate(payment.period_end)}`
      : "";

    const emailSubject = `Subscription activated — Ref ${payment.payment_reference}`;

    const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fafaf7;border:1px solid #e2e2dc;border-radius:8px;overflow:hidden">
  <div style="background:#0a1929;padding:20px 24px;border-bottom:3px solid #d4af37">
    <h2 style="color:#d4af37;margin:0;font-size:18px;letter-spacing:0.5px">Subscription Activated</h2>
    <p style="color:#f4e8b8;margin:6px 0 0;font-size:13px">${orgName}</p>
  </div>
  <div style="padding:24px">
    <p style="font-size:14px;color:#374151;margin:0 0 16px;line-height:1.6">
      Great news — your Iuris Peritis Compliance Platform subscription is now active.
      Your bank transfer payment has been received and verified.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
      <tr style="background:#f1f5f9"><td style="padding:10px 12px;color:#6b6b6b;width:170px;font-weight:600">Plan</td><td style="padding:10px 12px;font-weight:700;color:#0a1929">${tierLabel} — ${cycleLabel}</td></tr>
      <tr><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Payment Reference</td><td style="padding:10px 12px;font-family:monospace;font-weight:800;color:#0a1929;font-size:14px;letter-spacing:1px">${payment.payment_reference}</td></tr>
      ${periodRow}
      <tr style="background:#f1f5f9"><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Status</td><td style="padding:10px 12px;color:#166534;font-weight:700">Active</td></tr>
    </table>
    <p style="font-size:13px;color:#64748b;line-height:1.6">
      You can log in to your dashboard at any time to manage your subscription, users, and compliance activities.
      If you have any questions, contact us at <a href="mailto:info@iursperitis.co.tz" style="color:#2563eb">info@iursperitis.co.tz</a>.
    </p>
  </div>
  <div style="padding:12px 24px;background:#f0f0ec;border-top:1px solid #e2e2dc;font-size:11px;color:#6b6b6b">
    Automated notification from Iuris Peritis Compliance Platform. Do not reply to this email.
  </div>
</div>`;

    const textBody = [
      `Your Iuris Peritis Compliance Platform subscription is now active.`,
      ``,
      `Organisation: ${orgName}`,
      `Plan:         ${tierLabel} — ${cycleLabel}`,
      `Reference:    ${payment.payment_reference}`,
      ...(periodText ? [periodText] : []),
      `Status:       Active`,
      ``,
      `Your bank transfer payment has been received and verified.`,
      `Log in to your dashboard to get started.`,
      ``,
      `Questions? Email info@iursperitis.co.tz`,
    ].join("\n");

    if (!resendKey) {
      console.warn("[match-crdb-deposit] RESEND_API_KEY not set — confirmation email not sent.", { contactEmail });
    } else if (contactEmail) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Iuris Peritis Billing <billing@iursperitis.co.tz>",
          to: [contactEmail],
          subject: emailSubject,
          text: textBody,
          html: htmlBody,
        }),
      });
      const emailBody = await emailRes.json().catch(() => ({}));
      if (!emailRes.ok) {
        console.error("Resend confirmation email failed:", emailBody);
        // Non-fatal — subscription is already activated
      } else {
        console.log("Confirmation email sent, Resend id:", (emailBody as any).id);
      }
    } else {
      console.warn("[match-crdb-deposit] No contact_email on org — confirmation email skipped.", { org_id: payment.organization_id });
    }

    return jsonResp({
      success:            true,
      deposit_id,
      payment_id,
      payment_reference:  payment.payment_reference,
      org_name:           orgName,
      email_sent:         !!(resendKey && contactEmail),
    });

  } catch (err) {
    console.error("[match-crdb-deposit] Unhandled error:", err);
    return jsonResp({ error: "Internal server error" }, 500);
  }
});
