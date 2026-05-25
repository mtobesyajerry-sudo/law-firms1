import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-clickpesa-signature",
};

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

    const isValid = await verifyWebhookSignature(rawBody, signature);

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

    // Log webhook — UNIQUE(transaction_id, status) deduplicates retries
    const { data: logEntry, error: logError } = await supabaseAdmin
      .from("clickpesa_webhook_log")
      .insert({
        transaction_id: payload.id,
        order_reference: payload.orderReference,
        status: payload.status,
        raw_payload: payload,
        signature_valid: isValid,
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

    if (!isValid) {
      console.error("Invalid webhook signature:", payload.orderReference);
      await supabaseAdmin
        .from("clickpesa_webhook_log")
        .update({ processing_error: "Invalid signature", processed: true, processed_at: new Date().toISOString() })
        .eq("id", logEntry.id);
      return new Response("Invalid signature", { status: 401 });
    }

    // Find matching payment record
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

    // Update payment status
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

    // On success, activate the subscription
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
