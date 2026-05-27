import { createClient } from "npm:@supabase/supabase-js@2.39.0";

/*
  submit-bank-transfer-claim
  ──────────────────────────
  Called by the billing modal when a management user selects CRDB bank transfer.

  1. Validates the JWT and role (management only).
  2. Resolves the price server-side via calculate_payment_amount() — ignores any
     client-supplied amount to prevent amount forgery.
  3. Generates a unique payment reference (BNK prefix).
  4. Inserts a subscription_payments row with status = 'pending'.
  5. Sends an admin notification email via Resend.
  6. Returns { payment_reference, amount_gross_tzs, currency, status }.
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
    const { data: profile, error: profileErr } = await admin
      .from("user_profiles")
      .select("organization_id, role, email, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr || !profile?.organization_id) {
      return jsonResp({ error: "User profile or organisation not found" }, 403);
    }
    if (profile.role !== "management") {
      return jsonResp({ error: "Only management users can submit bank transfer claims" }, 403);
    }

    // ── 3. Parse + validate body ────────────────────────────────────────────
    let body: { tier?: string; billing_cycle?: string; payer_name?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResp({ error: "Invalid JSON body" }, 400);
    }

    const { tier, billing_cycle, payer_name } = body;

    if (!tier || typeof tier !== "string") {
      return jsonResp({ error: "tier is required" }, 400);
    }
    if (!["monthly", "annual"].includes(billing_cycle ?? "")) {
      return jsonResp({ error: "billing_cycle must be 'monthly' or 'annual'" }, 400);
    }

    // Verify plan exists and is active (and is not contact_sales)
    const { data: plan, error: planErr } = await admin
      .from("subscription_plans")
      .select("tier, name, contact_sales, price_monthly_tzs, price_annual_tzs")
      .eq("tier", tier)
      .eq("is_active", true)
      .maybeSingle();

    if (planErr || !plan) {
      return jsonResp({ error: "Plan not found or inactive" }, 400);
    }
    if (plan.contact_sales) {
      return jsonResp({ error: "This tier requires contacting sales — bank transfer not available" }, 400);
    }

    // ── 4. Server-side amount calculation ───────────────────────────────────
    const { data: priceData, error: priceErr } = await admin.rpc("calculate_payment_amount", {
      p_tier: tier,
      p_billing_cycle: billing_cycle,
    });

    if (priceErr || !priceData?.[0]) {
      console.error("calculate_payment_amount failed:", priceErr, priceData);
      return jsonResp({ error: "Plan pricing not configured" }, 500);
    }

    const {
      total_tzs: amountGross,
      vat_tzs: vatAmount,
      subtotal_tzs: amountNet,
    } = priceData[0];

    if (!amountGross || amountGross <= 0) {
      return jsonResp({ error: "Plan pricing not configured" }, 500);
    }

    // ── 5. Organisation details ─────────────────────────────────────────────
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", profile.organization_id)
      .maybeSingle();

    const orgName = org?.name ?? "Unknown Organisation";

    // ── 6. Generate payment reference ───────────────────────────────────────
    // BNK (3) + org6 (6) + ts11 (11) = 20 chars, alphanumeric only
    const orgShort = profile.organization_id.replace(/-/g, "").slice(0, 6).toUpperCase();
    const tsShort = String(Date.now()).slice(-11);
    const paymentReference = `BNK${orgShort}${tsShort}`;

    // ── 7. Period dates ─────────────────────────────────────────────────────
    const now = new Date();
    const periodStart = now.toISOString().slice(0, 10);
    const periodEnd = billing_cycle === "annual"
      ? new Date(now.setFullYear(now.getFullYear() + 1)).toISOString().slice(0, 10)
      : new Date(now.setMonth(now.getMonth() + 1)).toISOString().slice(0, 10);

    // ── 8. Insert payment record ────────────────────────────────────────────
    const { data: payment, error: insertErr } = await admin
      .from("subscription_payments")
      .insert({
        organization_id:   profile.organization_id,
        payment_reference: paymentReference,
        payment_type:      "subscription_initial",
        payment_method:    "bank_transfer_crdb",
        status:            "pending",
        amount_gross_tzs:  amountGross,
        amount_net_tzs:    amountNet,
        vat_amount_tzs:    vatAmount,
        vat_rate:          18.00,
        tier,
        billing_cycle,
        subscription_tier: tier,
        billing_period:    billing_cycle === "monthly" ? "monthly" : "annual",
        payer_name:        payer_name ?? null,
        initiated_by:      user.id,
        initiated_at:      new Date().toISOString(),
        period_start:      periodStart,
        period_end:        periodEnd,
        currency:          "TZS",
        // Legacy aliases kept for PaymentRow display compatibility
        amount_tzs:        amountGross,
        vat_tzs:           vatAmount,
        subtotal_tzs:      amountNet,
        clickpesa_status:  "N/A",
        clickpesa_order_reference: paymentReference,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("subscription_payments insert failed:", { insertErr, paymentReference });
      return jsonResp({ error: "Could not record payment claim. Please try again." }, 500);
    }

    console.log("Bank transfer claim created:", {
      id: payment.id,
      reference: paymentReference,
      org: orgName,
      amount: amountGross,
      tier,
      billing_cycle,
    });

    // ── 9. Admin notification email ─────────────────────────────────────────
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const submittedAt = new Date().toLocaleString("en-GB", {
      timeZone: "Africa/Dar_es_Salaam",
      dateStyle: "long",
      timeStyle: "short",
    });
    const cycleLabel = billing_cycle === "annual" ? "Annual" : "Monthly";
    const amountFormatted = `TZS ${Number(amountGross).toLocaleString()}`;
    const userEmail = profile.email ?? user.email ?? "(unknown)";
    const submitterName = profile.full_name ?? userEmail;

    const emailSubject = `Bank transfer claim submitted: ${paymentReference}`;

    const textBody = [
      `A bank transfer claim has been submitted via the billing portal.`,
      ``,
      `Organisation:   ${orgName}`,
      `Plan:           ${plan.name} — ${cycleLabel}`,
      `Total amount:   ${amountFormatted}`,
      `Payment ref:    ${paymentReference}`,
      `Submitted by:   ${submitterName} <${userEmail}>`,
      `Submitted at:   ${submittedAt} (EAT)`,
      ``,
      `Action required:`,
      `Verify this transfer against the CRDB statement for account 0152235949800.`,
      `Look for the reference "${paymentReference}" in the narration.`,
      `Once confirmed, activate the subscription via:`,
      `  SELECT activate_subscription_after_payment('${payment.id}');`,
      ``,
      `─────────────────────────────────────────────`,
      `This is an automated notification from Iuris Peritis Compliance Platform.`,
    ].join("\n");

    const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fafaf7;border:1px solid #e2e2dc;border-radius:8px;overflow:hidden">
  <div style="background:#0a1929;padding:20px 24px;border-bottom:3px solid #d4af37">
    <h2 style="color:#d4af37;margin:0;font-size:18px;letter-spacing:0.5px">Bank Transfer Claim Submitted</h2>
    <p style="color:#f4e8b8;margin:6px 0 0;font-size:13px">${orgName}</p>
  </div>
  <div style="padding:24px">
    <p style="font-size:14px;color:#374151;margin:0 0 20px;line-height:1.6">
      A customer has submitted a bank transfer claim. Please verify against the CRDB statement and activate once confirmed.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
      <tr style="background:#f1f5f9"><td style="padding:10px 12px;color:#6b6b6b;width:160px;font-weight:600">Organisation</td><td style="padding:10px 12px;font-weight:700;color:#0a1929">${orgName}</td></tr>
      <tr><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Plan</td><td style="padding:10px 12px;color:#1a1a1a">${plan.name} — ${cycleLabel}</td></tr>
      <tr style="background:#f1f5f9"><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Total Amount</td><td style="padding:10px 12px;font-weight:800;color:#2563eb;font-size:15px">${amountFormatted}</td></tr>
      <tr><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Payment Reference</td><td style="padding:10px 12px;font-family:monospace;font-weight:800;color:#0a1929;font-size:14px;letter-spacing:1px">${paymentReference}</td></tr>
      <tr style="background:#f1f5f9"><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Submitted By</td><td style="padding:10px 12px;color:#1a1a1a">${submitterName} &lt;${userEmail}&gt;</td></tr>
      <tr><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Submitted At</td><td style="padding:10px 12px;color:#1a1a1a">${submittedAt} (EAT)</td></tr>
    </table>
    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:14px 16px;margin-bottom:20px">
      <p style="margin:0 0 8px;font-weight:700;font-size:13px;color:#92400e">Action Required</p>
      <p style="margin:0 0 6px;font-size:13px;color:#92400e;line-height:1.5">
        1. Check CRDB account <strong>0152235949800</strong> for a transfer of <strong>${amountFormatted}</strong>.<br>
        2. Look for reference <strong style="font-family:monospace">${paymentReference}</strong> in the narration.<br>
        3. Once confirmed, run the following SQL to activate:
      </p>
      <pre style="background:#fffbeb;border:1px solid #fcd34d;border-radius:4px;padding:10px;font-size:12px;margin:8px 0 0;color:#713f12;overflow-x:auto">SELECT activate_subscription_after_payment('${payment.id}');</pre>
    </div>
  </div>
  <div style="padding:12px 24px;background:#f0f0ec;border-top:1px solid #e2e2dc;font-size:11px;color:#6b6b6b">
    Automated notification from Iuris Peritis Compliance Platform. Do not reply to this email.
  </div>
</div>`;

    if (!resendKey) {
      console.warn("[submit-bank-transfer-claim] RESEND_API_KEY not set — email not sent.", {
        to: "info@iuris-peritis.co.tz",
        subject: emailSubject,
      });
    } else {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Iuris Peritis Billing <onboarding@resend.dev>",
          to: ["info@iuris-peritis.co.tz"],
          subject: emailSubject,
          text: textBody,
          html: htmlBody,
        }),
      });
      const emailBody = await emailRes.json().catch(() => ({}));
      if (!emailRes.ok) {
        console.error("Resend admin notification failed:", emailBody);
        // Non-fatal — payment record is already created
      } else {
        console.log("Admin notification sent, Resend id:", (emailBody as any).id);
      }
    }

    // ── 10. Return ──────────────────────────────────────────────────────────
    return jsonResp({
      payment_reference: paymentReference,
      amount_gross_tzs:  amountGross,
      currency:          "TZS",
      status:            "pending",
    });

  } catch (err) {
    console.error("[submit-bank-transfer-claim] Unhandled error:", err);
    return jsonResp({ error: "Internal server error" }, 500);
  }
});
