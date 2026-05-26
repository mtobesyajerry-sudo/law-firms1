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

    // --- Step 3: Timestamp window check — reject stale events ---
    const eventTimestamp = payload.updatedAt || payload.createdAt;
    if (eventTimestamp) {
      const eventAgeMs = Date.now() - new Date(eventTimestamp).getTime();
      if (eventAgeMs > WEBHOOK_MAX_AGE_MS) {
        console.error(
          `Stale webhook rejected: order=${payload.orderReference} age=${Math.round(eventAgeMs / 1000)}s`
        );
        await supabaseAdmin
          .from("clickpesa_webhook_log")
          .insert({
            transaction_id: payload.id,
            order_reference: payload.orderReference,
            status: payload.status,
            raw_payload: { rejected: true, reason: "stale_timestamp", event_age_seconds: Math.round(eventAgeMs / 1000) },
            signature_valid: true,
            processed: true,
            processed_at: new Date().toISOString(),
            processing_error: `Stale event: ${Math.round(eventAgeMs / 60000)} minutes old`,
          })
          .maybeSingle();
        return new Response("stale", { status: 401 });
      }
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

async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  const secret = Deno.env.get("CLICKPESA_WEBHOOK_SECRET");
  if (!secret) {
    console.error("CLICKPESA_WEBHOOK_SECRET not configured");
    return false;
  }
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const computedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const computedHex = Array.from(new Uint8Array(computedSig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return computedHex === signature.toLowerCase();
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}
