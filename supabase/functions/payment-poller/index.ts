import { createClient } from "npm:@supabase/supabase-js@2";

/*
  payment-poller
  ──────────────
  Scheduled fallback for ClickPesa payments whose webhook was never delivered.

  Finds subscription_payments rows that are:
    - status = 'processing'
    - payment_method != 'bank_transfer_crdb'  (mobile money only)
    - clickpesa_transaction_id IS NOT NULL     (initiation succeeded)
    - initiated_at < NOW() - 5 min            (give webhook first chance)
    - initiated_at > NOW() - 2 hours          (abandon after 2 hrs)

  For each, queries ClickPesa for the current status and acts accordingly.

  Invoked by pg_cron every 5 minutes via:
    SELECT net.http_post(url, headers, body) FROM cron.job ...
  (see migration 20260527_schedule_payment_poller_cron.sql)

  Can also be called ad-hoc via a service-role HTTP POST with no body.
*/

const CLICKPESA_API_BASE = "https://api.clickpesa.com";

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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const fiveMinutesAgo  = new Date(Date.now() - 5  * 60 * 1000).toISOString();
    const twoHoursAgo     = new Date(Date.now() - 2  * 60 * 60 * 1000).toISOString();

    const { data: stuckPayments, error: fetchError } = await supabaseAdmin
      .from("subscription_payments")
      .select("id, clickpesa_transaction_id, clickpesa_order_reference, organization_id, period_start, period_end, billing_cycle, initiated_at")
      .eq("status", "processing")
      .neq("payment_method", "bank_transfer_crdb")
      .not("clickpesa_transaction_id", "is", null)
      .lt("initiated_at", fiveMinutesAgo)
      .gt("initiated_at", twoHoursAgo);

    if (fetchError) {
      console.error("[payment-poller] Failed to fetch stuck payments:", fetchError);
      return jsonResp({ error: "Failed to fetch payments" }, 500);
    }

    const payments = stuckPayments ?? [];
    console.log(`[payment-poller] Found ${payments.length} stuck payment(s)`);

    if (payments.length === 0) {
      return jsonResp({ checked: 0, activated: 0, failed: 0 });
    }

    const token = await getClickPesaToken();
    if (!token) {
      console.error("[payment-poller] Could not obtain ClickPesa token — aborting poll cycle");
      return jsonResp({ error: "ClickPesa auth failed" }, 502);
    }

    let activated = 0;
    let markedFailed = 0;

    for (const payment of payments) {
      try {
        const statusResp = await fetch(
          `${CLICKPESA_API_BASE}/third-parties/payments/${payment.clickpesa_transaction_id}`,
          { headers: { "Authorization": `Bearer ${token}` } }
        );

        if (!statusResp.ok) {
          console.warn(`[payment-poller] ClickPesa status fetch failed for ${payment.id}: HTTP ${statusResp.status}`);
          continue;
        }

        const statusData = await statusResp.json();
        const cpStatus: string = statusData.status ?? "UNKNOWN";

        console.log(`[payment-poller] payment=${payment.id} order=${payment.clickpesa_order_reference} cpStatus=${cpStatus}`);

        if (cpStatus === "SUCCESS" || cpStatus === "SETTLED") {
          // Ensure period dates are set — they must have been set at initiation time,
          // but guard here as a safety net.
          if (!payment.period_end) {
            const start = new Date(payment.initiated_at);
            const end   = new Date(start);
            if (payment.billing_cycle === "annual") {
              end.setFullYear(end.getFullYear() + 1);
            } else {
              end.setMonth(end.getMonth() + 1);
            }
            await supabaseAdmin
              .from("subscription_payments")
              .update({
                period_start: start.toISOString().split("T")[0],
                period_end:   end.toISOString().split("T")[0],
              })
              .eq("id", payment.id);
          }

          // Set clickpesa_status = SUCCESS so activate_subscription_after_payment
          // passes its status guard (it checks for 'SUCCESS', not 'SETTLED').
          await supabaseAdmin
            .from("subscription_payments")
            .update({ clickpesa_status: "SUCCESS" })
            .eq("id", payment.id);

          const { error: activationError } = await supabaseAdmin.rpc(
            "activate_subscription_after_payment",
            { p_payment_id: payment.id }
          );

          if (activationError) {
            console.error(`[payment-poller] Activation failed for ${payment.id}:`, activationError);
          } else {
            activated++;
            console.log(`[payment-poller] Activated subscription for payment ${payment.id}`);
          }

        } else if (["FAILED", "CANCELLED", "EXPIRED"].includes(cpStatus)) {
          await supabaseAdmin
            .from("subscription_payments")
            .update({
              clickpesa_status: cpStatus,
              status:           "failed",
              failed_at:        new Date().toISOString(),
              failure_reason:   statusData.failureReason || `Payment ${cpStatus.toLowerCase()} (detected by poller)`,
            })
            .eq("id", payment.id);

          await supabaseAdmin
            .from("organizations")
            .update({ payment_state: "payment_failed" })
            .eq("id", payment.organization_id);

          markedFailed++;
          console.log(`[payment-poller] Marked payment ${payment.id} as ${cpStatus}`);

        } else {
          // PROCESSING / PENDING / INITIATING — leave for next cycle
          console.log(`[payment-poller] payment=${payment.id} still ${cpStatus} — leaving for next cycle`);
        }

      } catch (err) {
        console.error(`[payment-poller] Error processing payment ${payment.id}:`, err);
      }
    }

    const result = { checked: payments.length, activated, failed: markedFailed };
    console.log("[payment-poller] Cycle complete:", result);
    return jsonResp(result);

  } catch (err) {
    console.error("[payment-poller] Unhandled error:", err);
    return jsonResp({ error: "Internal server error" }, 500);
  }
});

async function getClickPesaToken(): Promise<string | null> {
  try {
    const response = await fetch(`${CLICKPESA_API_BASE}/third-parties/generate-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "client-id": Deno.env.get("CLICKPESA_CLIENT_ID")!,
        "api-key":   Deno.env.get("CLICKPESA_API_KEY")!,
      },
    });
    if (!response.ok) {
      console.error("[payment-poller] ClickPesa token generation failed:", response.status, await response.text());
      return null;
    }
    const data = await response.json();
    const raw = data.token || data.access_token || data.accessToken;
    if (!raw || typeof raw !== "string") {
      console.error("[payment-poller] ClickPesa token response missing field:", JSON.stringify(data));
      return null;
    }
    return raw.replace(/^Bearer\s+/i, "").trim();
  } catch (err) {
    console.error("[payment-poller] Token error:", err);
    return null;
  }
}

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
