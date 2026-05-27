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
