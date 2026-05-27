import { createClient } from "npm:@supabase/supabase-js@2.39.0";

/*
  confirm-bank-transfer-claim
  ───────────────────────────
  Called by a management user after they've made the bank transfer.
  Transitions a pending bank-transfer claim → pending_confirmation and
  notifies the admin by email.

  Body: { payment_id: uuid }

  Steps:
  1. Verify JWT — 401 if missing/invalid
  2. Load user_profiles — 403 if role != 'management'
  3. Parse body { payment_id }
  4. Load subscription_payments row; validate ownership, method, status
  5. UPDATE status='pending_confirmation', customer_confirmed_at=NOW()
  6. Send admin notification email via Resend
  7. Return { status, confirmed_at }
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

    // ── 2. Profile + role check ─────────────────────────────────────────────
    const { data: profile } = await admin
      .from("user_profiles")
      .select("organization_id, role, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "management") {
      return jsonResp({ error: "Only management users can confirm bank transfers" }, 403);
    }
    if (!profile?.organization_id) {
      return jsonResp({ error: "User has no organisation" }, 403);
    }

    // ── 3. Parse body ───────────────────────────────────────────────────────
    let body: { payment_id?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResp({ error: "Invalid JSON body" }, 400);
    }

    const { payment_id } = body;
    if (!payment_id) {
      return jsonResp({ error: "payment_id is required" }, 400);
    }

    // ── 4. Load + validate payment ──────────────────────────────────────────
    const { data: payment, error: payErr } = await admin
      .from("subscription_payments")
      .select("id, organization_id, payment_method, status, payment_reference, amount_gross_tzs, payer_name, tier, billing_cycle")
      .eq("id", payment_id)
      .maybeSingle();

    if (payErr || !payment) {
      return jsonResp({ error: "Payment not found" }, 404);
    }
    if (payment.organization_id !== profile.organization_id) {
      return jsonResp({ error: "Access denied" }, 403);
    }
    if (payment.payment_method !== "bank_transfer_crdb") {
      return jsonResp({ error: "This payment is not a CRDB bank transfer" }, 400);
    }
    if (payment.status !== "pending") {
      return jsonResp({
        error: payment.status === "pending_confirmation"
          ? "Transfer already confirmed — awaiting receipt match by our team"
          : `Payment is already '${payment.status}'`,
      }, 409);
    }

    // ── 5. Transition to pending_confirmation ───────────────────────────────
    const confirmedAt = new Date().toISOString();
    const { error: updateErr } = await admin
      .from("subscription_payments")
      .update({
        status: "pending_confirmation",
        customer_confirmed_at: confirmedAt,
      })
      .eq("id", payment_id);

    if (updateErr) {
      console.error("[confirm-bank-transfer-claim] Update failed:", updateErr);
      return jsonResp({ error: "Failed to update payment status" }, 500);
    }

    // ── 6. Load org name for email ──────────────────────────────────────────
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", profile.organization_id)
      .maybeSingle();

    const orgName = org?.name ?? "Unknown Organisation";
    const tierLabel = (payment.tier ?? "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    const cycleLabel = payment.billing_cycle === "annual" ? "Annual" : "Monthly";
    const amountFormatted = `TZS ${Number(payment.amount_gross_tzs).toLocaleString()}`;
    const confirmedAtFormatted = new Date(confirmedAt).toLocaleString("en-GB", {
      timeZone: "Africa/Dar_es_Salaam",
      dateStyle: "long",
      timeStyle: "short",
    });
    const payerDisplay = payment.payer_name || profile.full_name || profile.email || user.email || "Unknown";

    // ── 7. Admin notification email ─────────────────────────────────────────
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const subject = `Bank transfer confirmed by customer: ${payment.payment_reference}`;

    const textBody = [
      `A customer has confirmed they have made the bank transfer.`,
      ``,
      `Organisation:      ${orgName}`,
      `Payer:             ${payerDisplay}`,
      `Payment reference: ${payment.payment_reference}`,
      `Amount:            ${amountFormatted}`,
      `Plan:              ${tierLabel} — ${cycleLabel}`,
      `Confirmed at:      ${confirmedAtFormatted} (EAT)`,
      ``,
      `Action required:`,
      `Look for a CRDB deposit of ${amountFormatted} received around this time.`,
      `Match it to reference ${payment.payment_reference} in the reconciliation tool.`,
      ``,
      `─────────────────────────────────────────────`,
      `Automated notification from Iuris Peritis Compliance Platform.`,
    ].join("\n");

    const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fafaf7;border:1px solid #e2e2dc;border-radius:8px;overflow:hidden">
  <div style="background:#0a1929;padding:20px 24px;border-bottom:3px solid #d4af37">
    <h2 style="color:#d4af37;margin:0;font-size:18px;letter-spacing:0.5px">Customer Transfer Confirmed</h2>
    <p style="color:#f4e8b8;margin:6px 0 0;font-size:13px">${orgName}</p>
  </div>
  <div style="padding:24px">
    <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:6px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#1d4ed8;line-height:1.5">
      <strong>${payerDisplay}</strong> has confirmed they have made the bank transfer.
      Look for this amount in your CRDB statement and match it in the reconciliation tool.
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
      <tr style="background:#f1f5f9"><td style="padding:10px 12px;color:#6b6b6b;width:160px;font-weight:600">Organisation</td><td style="padding:10px 12px;font-weight:700;color:#0a1929">${orgName}</td></tr>
      <tr><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Payer</td><td style="padding:10px 12px;color:#1a1a1a">${payerDisplay}</td></tr>
      <tr style="background:#f1f5f9"><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Payment Reference</td><td style="padding:10px 12px;font-family:monospace;font-weight:800;color:#0a1929;font-size:14px;letter-spacing:1px">${payment.payment_reference}</td></tr>
      <tr><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Amount</td><td style="padding:10px 12px;font-weight:800;color:#2563eb;font-size:15px">${amountFormatted}</td></tr>
      <tr style="background:#f1f5f9"><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Plan</td><td style="padding:10px 12px;color:#1a1a1a">${tierLabel} — ${cycleLabel}</td></tr>
      <tr><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Confirmed At</td><td style="padding:10px 12px;color:#1a1a1a">${confirmedAtFormatted} (EAT)</td></tr>
    </table>
    <p style="font-size:12px;color:#94a3b8;line-height:1.5">
      Use the Bank Transfer Reconciliation tool to match this claim to the incoming deposit.
      Contact <a href="mailto:info@iursperitis.co.tz" style="color:#2563eb">info@iursperitis.co.tz</a> with any questions.
    </p>
  </div>
  <div style="padding:12px 24px;background:#f0f0ec;border-top:1px solid #e2e2dc;font-size:11px;color:#6b6b6b">
    Automated notification from Iuris Peritis Compliance Platform. Do not reply to this email.
  </div>
</div>`;

    if (!resendKey) {
      console.warn("[confirm-bank-transfer-claim] RESEND_API_KEY not set — admin email not sent.");
    } else {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Iuris Peritis Billing <onboarding@resend.dev>",
          to: ["info@iursperitis.co.tz"],
          subject,
          text: textBody,
          html: htmlBody,
        }),
      });
      if (!emailRes.ok) {
        const errBody = await emailRes.json().catch(() => ({}));
        console.error("[confirm-bank-transfer-claim] Resend failed:", errBody);
        // Non-fatal — status was already updated
      } else {
        const okBody = await emailRes.json().catch(() => ({}));
        console.log("[confirm-bank-transfer-claim] Admin email sent, id:", (okBody as any).id);
      }
    }

    return jsonResp({ status: "pending_confirmation", confirmed_at: confirmedAt });

  } catch (err) {
    console.error("[confirm-bank-transfer-claim] Unhandled error:", err);
    return jsonResp({ error: "Internal server error" }, 500);
  }
});
