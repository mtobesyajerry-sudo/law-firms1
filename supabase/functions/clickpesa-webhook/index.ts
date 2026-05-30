import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-clickpesa-signature",
};

// 60 minutes: real-world ClickPesa delivery can exceed 10 min (confirmed during Test B).
// Replay-attack protection is provided by the UNIQUE(transaction_id, status) constraint
// on clickpesa_webhook_log, so widening this window is safe.
const WEBHOOK_MAX_AGE_MS = 60 * 60 * 1000;

interface ClickPesaWebhookPayload {
  id: string;
  status: string;
  channel: string;
  orderReference: string;
  collectedAmount?: string;
  collectedCurrency?: string;
  createdAt: string;
  updatedAt?: string;
  failureReason?: string;
  checksum?: string;
  checksumMethod?: string;
}

// HMAC-SHA256 over the raw request body; signature arrives in x-clickpesa-signature header.
// Falls back to CLICKPESA_CHECKSUM_KEY if CLICKPESA_WEBHOOK_SECRET is absent.
async function verifyWebhookSignature(
  rawBody: string,
  providedSignatureHex: string
): Promise<boolean> {
  const secret =
    Deno.env.get("CLICKPESA_WEBHOOK_SECRET") ||
    Deno.env.get("CLICKPESA_CHECKSUM_KEY");
  if (!secret) {
    console.error("CLICKPESA_WEBHOOK_SECRET/CHECKSUM_KEY not configured");
    return false;
  }
  if (!providedSignatureHex || typeof providedSignatureHex !== "string") {
    return false;
  }

  const cleanHex = providedSignatureHex.trim().toLowerCase().replace(/^sha256=/, "");
  if (!/^[0-9a-f]+$/.test(cleanHex) || cleanHex.length % 2 !== 0) {
    return false;
  }

  const sigBytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < sigBytes.length; i++) {
    sigBytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  // crypto.subtle.verify is constant-time by Web Crypto spec
  return await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(rawBody));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-clickpesa-signature") || "";

    const sourceIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      null;

    // --- Step 1: Parse JSON first so we always have identifiers for logging ---
    let payload: ClickPesaWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error("Webhook payload not valid JSON:", rawBody.slice(0, 200));
      return new Response("Bad payload", { status: 400 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // --- Step 2: Verify signature ---
    const isValid = await verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.error("Invalid webhook signature for order:", payload.orderReference);
      // Log FIRST with processed=false so the rejection is fully visible in the audit trail
      await supabaseAdmin
        .from("clickpesa_webhook_log")
        .insert({
          transaction_id:   payload.id || "unknown",
          order_reference:  payload.orderReference || "unknown",
          status:           payload.status || "unknown",
          raw_payload:      payload,
          signature_valid:  false,
          processed:        false,
          processing_error: "signature_invalid",
          source_ip:        sourceIp,
          received_at:      new Date().toISOString(),
        });
      return new Response("Invalid signature", { status: 401 });
    }

    // --- Step 3: Timestamp window check ---
    const eventTimestamp = payload.updatedAt || payload.createdAt;

    if (!eventTimestamp) {
      console.error(`Missing timestamp for order=${payload.orderReference}`);
      await supabaseAdmin
        .from("clickpesa_webhook_log")
        .insert({
          transaction_id:   payload.id,
          order_reference:  payload.orderReference,
          status:           payload.status,
          raw_payload:      payload,
          signature_valid:  true,
          processed:        false,
          processing_error: "timestamp_out_of_window:missing",
          source_ip:        sourceIp,
          received_at:      new Date().toISOString(),
        });
      return new Response("stale", { status: 401 });
    }

    const eventMs = new Date(eventTimestamp).getTime();
    if (isNaN(eventMs)) {
      console.error(`Unparseable timestamp for order=${payload.orderReference}: ${eventTimestamp}`);
      await supabaseAdmin
        .from("clickpesa_webhook_log")
        .insert({
          transaction_id:   payload.id,
          order_reference:  payload.orderReference,
          status:           payload.status,
          raw_payload:      payload,
          signature_valid:  true,
          processed:        false,
          processing_error: `timestamp_out_of_window:unparseable:${eventTimestamp}`,
          source_ip:        sourceIp,
          received_at:      new Date().toISOString(),
        });
      return new Response("stale", { status: 401 });
    }

    const eventAgeMs = Date.now() - eventMs;
    if (Math.abs(eventAgeMs) > WEBHOOK_MAX_AGE_MS) {
      const reason = eventAgeMs > 0 ? "stale_timestamp" : "future_timestamp";
      console.error(
        `Timestamp out of window: order=${payload.orderReference} reason=${reason} skew=${Math.round(eventAgeMs / 1000)}s`
      );
      await supabaseAdmin
        .from("clickpesa_webhook_log")
        .insert({
          transaction_id:   payload.id,
          order_reference:  payload.orderReference,
          status:           payload.status,
          raw_payload:      payload,
          signature_valid:  true,
          processed:        false,
          processing_error: `timestamp_out_of_window:${reason}:skew=${Math.round(eventAgeMs / 1000)}s`,
          source_ip:        sourceIp,
          received_at:      new Date().toISOString(),
        });
      return new Response("stale", { status: 401 });
    }

    // --- Step 4: Log valid webhook — UNIQUE(transaction_id, status) deduplicates retries ---
    const { data: logEntry, error: logError } = await supabaseAdmin
      .from("clickpesa_webhook_log")
      .insert({
        transaction_id:  payload.id,
        order_reference: payload.orderReference,
        status:          payload.status,
        raw_payload:     payload,
        signature_valid: true,
        processed:       false,
        source_ip:       sourceIp,
        received_at:     new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      if (logError.code === "23505") {
        console.log(`Duplicate webhook for ${payload.id} status ${payload.status} — ignoring`);
        return new Response("Already processed", { status: 200 });
      }
      console.error("Webhook log insert failed:", logError);
      return new Response("Log error", { status: 500 });
    }

    // --- Step 5: Find matching payment record ---
    const { data: payment } = await supabaseAdmin
      .from("subscription_payments")
      .select("*")
      .eq("clickpesa_order_reference", payload.orderReference)
      .maybeSingle();

    if (!payment) {
      console.error(`No payment found for order ${payload.orderReference}`);
      await supabaseAdmin
        .from("clickpesa_webhook_log")
        .update({
          processing_error: "no_matching_payment_record",
          processed:        true,
          processed_at:     new Date().toISOString(),
        })
        .eq("id", logEntry.id);
      return new Response("OK", { status: 200 });
    }

    // --- Step 6: Update payment status ---
    const updates: Record<string, unknown> = {
      clickpesa_status:     payload.status,
      clickpesa_channel:    payload.channel,
      webhook_received_at:  new Date().toISOString(),
      webhook_raw_payload:  payload,
    };

    if (payload.status === "SUCCESS") {
      updates.status = "completed";
    } else if (["FAILED", "CANCELLED", "EXPIRED"].includes(payload.status)) {
      updates.failed_at      = new Date().toISOString();
      updates.failure_reason = payload.failureReason || `Payment ${payload.status.toLowerCase()}`;
      updates.status         = "failed";
    }

    await supabaseAdmin.from("subscription_payments").update(updates).eq("id", payment.id);

    // --- Step 7: Activate subscription on success ---
    if (payload.status === "SUCCESS") {
      const { error: activationError } = await supabaseAdmin.rpc(
        "activate_subscription_after_payment",
        { p_payment_id: payment.id }
      );

      if (activationError) {
        console.error(`Activation failed for payment ${payment.id}:`, activationError);
        await supabaseAdmin
          .from("clickpesa_webhook_log")
          .update({
            processing_error: `activation_failed:${activationError.message}`,
            processed:        true,
            processed_at:     new Date().toISOString(),
          })
          .eq("id", logEntry.id);
        return new Response("OK with errors", { status: 200 });
      }

      // --- Step 7b: Send subscription activation email (non-fatal) ---
      try {
        const { data: org } = await supabaseAdmin
          .from("organizations")
          .select("name, contact_email")
          .eq("id", payment.organization_id)
          .maybeSingle();

        const resendKey = Deno.env.get("RESEND_API_KEY");
        const contactEmail = org?.contact_email ?? null;

        if (!resendKey) {
          console.warn("[clickpesa-webhook] RESEND_API_KEY not set — activation email not sent.");
        } else if (!contactEmail) {
          console.warn("[clickpesa-webhook] No contact_email on org — activation email skipped.", { org_id: payment.organization_id });
        } else {
          const emailPayload = buildActivationEmail(org.name ?? "Your organisation", payment, payload.channel);
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: "Iuris Peritis Billing <onboarding@resend.dev>", to: [contactEmail], ...emailPayload }),
          });
          const emailBody = await emailRes.json().catch(() => ({}));
          if (!emailRes.ok) {
            console.error("[clickpesa-webhook] Activation email failed:", emailBody);
          } else {
            console.log("[clickpesa-webhook] Activation email sent, Resend id:", (emailBody as { id?: string }).id);
          }
        }
      } catch (emailErr) {
        console.error("[clickpesa-webhook] Activation email error (non-fatal):", emailErr);
      }
    } else if (["FAILED", "CANCELLED", "EXPIRED"].includes(payload.status)) {
      await supabaseAdmin
        .from("organizations")
        .update({ payment_state: "payment_failed" })
        .eq("id", payment.organization_id);
    }

    await supabaseAdmin
      .from("clickpesa_webhook_log")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("id", logEntry.id);

    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Unhandled error in clickpesa-webhook:", err);
    return new Response("Internal error", { status: 500 });
  }
});

interface PaymentRow {
  payment_reference?: string;
  tier?: string;
  billing_cycle?: string;
  period_start?: string | null;
  period_end?: string | null;
  amount_gross_tzs?: number;
}

function buildActivationEmail(
  orgName: string,
  payment: PaymentRow,
  channel?: string
): { subject: string; text: string; html: string } {
  const tierLabel  = (payment.tier ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const cycleLabel = payment.billing_cycle === "annual" ? "Annual" : "Monthly";
  const ref        = payment.payment_reference ?? "—";
  const amount     = payment.amount_gross_tzs ? `TZS ${Number(payment.amount_gross_tzs).toLocaleString()}` : "—";

  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—";

  const periodStr = (payment.period_start && payment.period_end)
    ? `${formatDate(payment.period_start)} — ${formatDate(payment.period_end)}`
    : "—";

  const methodLabel = channel
    ? channel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Mobile Money";

  const subject = `Subscription activated — Ref ${ref}`;

  const text = [
    `Your Iuris Peritis Compliance Platform subscription is now active.`,
    ``,
    `Organisation: ${orgName}`,
    `Plan:         ${tierLabel} — ${cycleLabel}`,
    `Period:       ${periodStr}`,
    `Amount:       ${amount}`,
    `Reference:    ${ref}`,
    `Method:       ${methodLabel}`,
    ``,
    `Manage your subscription at: https://lawfirms1.iursperitis.co.tz/billing`,
    `Questions? Email info@iursperitis.co.tz`,
    ``,
    `— Iuris Peritis`,
    `  AML/CFT/CPF Compliance for Tanzanian Advocates`,
  ].join("\n");

  const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fafaf7;border:1px solid #e2e2dc;border-radius:8px;overflow:hidden">
  <div style="background:#0a1929;padding:20px 24px;border-bottom:3px solid #d4af37">
    <h2 style="color:#d4af37;margin:0;font-size:18px;letter-spacing:0.5px">Subscription Activated</h2>
    <p style="color:#f4e8b8;margin:6px 0 0;font-size:13px">${orgName}</p>
  </div>
  <div style="padding:24px">
    <p style="font-size:14px;color:#374151;margin:0 0 16px;line-height:1.6">
      Great news — your Iuris Peritis Compliance Platform subscription is now active.
      Your payment has been confirmed.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
      <tr style="background:#f1f5f9"><td style="padding:10px 12px;color:#6b6b6b;width:170px;font-weight:600">Plan</td><td style="padding:10px 12px;font-weight:700;color:#0a1929">${tierLabel} — ${cycleLabel}</td></tr>
      <tr><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Subscription Period</td><td style="padding:10px 12px;color:#1a1a1a">${periodStr}</td></tr>
      <tr style="background:#f1f5f9"><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Amount</td><td style="padding:10px 12px;color:#1a1a1a">${amount}</td></tr>
      <tr><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Payment Reference</td><td style="padding:10px 12px;font-family:monospace;font-weight:800;color:#0a1929;font-size:14px;letter-spacing:1px">${ref}</td></tr>
      <tr style="background:#f1f5f9"><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Payment Method</td><td style="padding:10px 12px;color:#1a1a1a">${methodLabel}</td></tr>
      <tr><td style="padding:10px 12px;color:#6b6b6b;font-weight:600">Status</td><td style="padding:10px 12px;color:#166534;font-weight:700">Active</td></tr>
    </table>
    <p style="font-size:13px;color:#64748b;line-height:1.6">
      Manage your subscription and view payment history at
      <a href="https://lawfirms1.iursperitis.co.tz/billing" style="color:#2563eb">lawfirms1.iursperitis.co.tz/billing</a>.
      Questions? <a href="mailto:info@iursperitis.co.tz" style="color:#2563eb">info@iursperitis.co.tz</a>
    </p>
  </div>
  <div style="padding:12px 24px;background:#f0f0ec;border-top:1px solid #e2e2dc;font-size:11px;color:#6b6b6b">
    Automated notification from Iuris Peritis Compliance Platform. Do not reply to this email.
  </div>
</div>`;

  return { subject, text, html };
}
