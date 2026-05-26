import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-clickpesa-signature",
};

// Maximum age of a webhook event before it is rejected as stale.
const WEBHOOK_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

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

    // --- Step 1: Verify signature BEFORE touching the database ---
    const isValid = await verifyWebhookSignature(rawBody, signature);

    // Parse JSON regardless so we can extract minimal identifiers for logging
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

    // --- Step 2: Reject invalid signature immediately, log minimal entry ---
    if (!isValid) {
      console.error("Invalid webhook signature for order:", payload.orderReference);
      await supabaseAdmin
        .from("clickpesa_webhook_log")
        .insert({
          transaction_id: payload.id || "unknown",
          order_reference: payload.orderReference || "unknown",
          status: payload.status || "unknown",
          // Store no payload content for unsigned requests — only metadata
          raw_payload: { rejected: true, reason: "invalid_signature" },
          signature_valid: false,
          processed: true,
          processed_at: new Date().toISOString(),
          processing_error: "Invalid signature",
        })
        // Ignore unique-constraint conflicts for repeated invalid attempts
        .select()
        .maybeSingle();
      return new Response("Invalid signature", { status: 401 });
    }

    // --- Step 3: Timestamp window check — reject missing, unparseable, stale, or future-dated events ---
    const eventTimestamp = payload.updatedAt || payload.createdAt;
    if (!eventTimestamp) {
      console.error(`Missing timestamp for order=${payload.orderReference}`);
      await supabaseAdmin
        .from("clickpesa_webhook_log")
        .insert({
          transaction_id: payload.id,
          order_reference: payload.orderReference,
          status: payload.status,
          raw_payload: { rejected: true, reason: "missing_timestamp" },
          signature_valid: true,
          processed: true,
          processed_at: new Date().toISOString(),
          processing_error: "Missing createdAt/updatedAt timestamp",
        })
        .maybeSingle();
      return new Response("stale", { status: 401 });
    }
    const eventMs = new Date(eventTimestamp).getTime();
    if (isNaN(eventMs)) {
      console.error(`Unparseable timestamp for order=${payload.orderReference}: ${eventTimestamp}`);
      await supabaseAdmin
        .from("clickpesa_webhook_log")
        .insert({
          transaction_id: payload.id,
          order_reference: payload.orderReference,
          status: payload.status,
          raw_payload: { rejected: true, reason: "invalid_timestamp", raw_timestamp: eventTimestamp },
          signature_valid: true,
          processed: true,
          processed_at: new Date().toISOString(),
          processing_error: `Unparseable timestamp: ${eventTimestamp}`,
        })
        .maybeSingle();
      return new Response("stale", { status: 401 });
    }
    const eventAgeMs = Date.now() - eventMs;
    // Reject if more than 10 minutes old OR more than 10 minutes in the future
    if (Math.abs(eventAgeMs) > WEBHOOK_MAX_AGE_MS) {
      const reason = eventAgeMs > 0 ? "stale_timestamp" : "future_timestamp";
      console.error(
        `Timestamp out of window: order=${payload.orderReference} reason=${reason} skew=${Math.round(eventAgeMs / 1000)}s`
      );
      await supabaseAdmin
        .from("clickpesa_webhook_log")
        .insert({
          transaction_id: payload.id,
          order_reference: payload.orderReference,
          status: payload.status,
          raw_payload: { rejected: true, reason, event_age_seconds: Math.round(eventAgeMs / 1000) },
          signature_valid: true,
          processed: true,
          processed_at: new Date().toISOString(),
          processing_error: `Timestamp out of window (${reason}): skew=${Math.round(eventAgeMs / 1000)}s`,
        })
        .maybeSingle();
      return new Response("stale", { status: 401 });
    }

    // --- Step 4: Log valid webhook — UNIQUE(transaction_id, status) deduplicates retries ---
    const { data: logEntry, error: logError } = await supabaseAdmin
      .from("clickpesa_webhook_log")
      .insert({
        transaction_id: payload.id,
        order_reference: payload.orderReference,
        status: payload.status,
        raw_payload: payload,
        signature_valid: true,
        processed: false,
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
        .update({ processing_error: "No matching payment record", processed: true, processed_at: new Date().toISOString() })
        .eq("id", logEntry.id);
      return new Response("OK", { status: 200 });
    }

    // --- Step 6: Update payment status ---
    const updates: Record<string, unknown> = {
      clickpesa_status: payload.status,
      clickpesa_channel: payload.channel,
      webhook_received_at: new Date().toISOString(),
      webhook_raw_payload: payload,
    };

    if (payload.status === "SUCCESS") {
      updates.completed_at = new Date().toISOString();
      updates.status = "completed";
    } else if (["FAILED", "CANCELLED", "EXPIRED"].includes(payload.status)) {
      updates.failed_at = new Date().toISOString();
      updates.failure_reason = payload.failureReason || `Payment ${payload.status.toLowerCase()}`;
      updates.status = "failed";
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
          .update({ processing_error: `Activation failed: ${activationError.message}`, processed: true, processed_at: new Date().toISOString() })
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

async function verifyWebhookSignature(
  rawBody: string,
  providedSignatureHex: string
): Promise<boolean> {
  const secret = Deno.env.get("CLICKPESA_WEBHOOK_SECRET");
  if (!secret) {
    console.error("CLICKPESA_WEBHOOK_SECRET not configured");
    return false;
  }
  if (!providedSignatureHex || typeof providedSignatureHex !== "string") {
    return false;
  }

  // Normalise the provided signature: trim, lowercase, strip an optional "sha256=" prefix
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
