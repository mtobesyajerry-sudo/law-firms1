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

            // Send activation email (non-fatal)
            try {
              const { data: paymentFull } = await supabaseAdmin
                .from("subscription_payments")
                .select("payment_reference, tier, billing_cycle, period_start, period_end, amount_gross_tzs")
                .eq("id", payment.id)
                .maybeSingle();

              const { data: org } = await supabaseAdmin
                .from("organizations")
                .select("name, contact_email")
                .eq("id", payment.organization_id)
                .maybeSingle();

              const resendKey    = Deno.env.get("RESEND_API_KEY");
              const contactEmail = org?.contact_email ?? null;

              if (!resendKey) {
                console.warn(`[payment-poller] RESEND_API_KEY not set — activation email not sent for ${payment.id}`);
              } else if (!contactEmail) {
                console.warn(`[payment-poller] No contact_email on org — activation email skipped for ${payment.id}`);
              } else {
                const emailPayload = buildActivationEmail(org.name ?? "Your organisation", paymentFull ?? {}, statusData.channel);
                const emailRes = await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ from: "Iuris Peritis Billing <onboarding@resend.dev>", to: [contactEmail], ...emailPayload }),
                });
                const emailBody = await emailRes.json().catch(() => ({}));
                if (!emailRes.ok) {
                  console.error(`[payment-poller] Activation email failed for ${payment.id}:`, emailBody);
                } else {
                  console.log(`[payment-poller] Activation email sent for ${payment.id}, Resend id:`, (emailBody as { id?: string }).id);
                }
              }
            } catch (emailErr) {
              console.error(`[payment-poller] Activation email error (non-fatal) for ${payment.id}:`, emailErr);
            }
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
