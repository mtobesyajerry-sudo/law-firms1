import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CLICKPESA_API_BASE = "https://api.clickpesa.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonError("Unauthorized", 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) return jsonError("Invalid token", 401);

    const { payment_id } = await req.json();
    if (!payment_id) return jsonError("payment_id required", 400);

    const { data: payment } = await supabaseAdmin
      .from("subscription_payments")
      .select("*")
      .eq("id", payment_id)
      .maybeSingle();

    if (!payment) return jsonError("Payment not found", 404);

    // Verify caller belongs to this payment's org
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.organization_id !== payment.organization_id) {
      return jsonError("Forbidden", 403);
    }

    // Return definitive status immediately
    if (["SUCCESS", "FAILED", "CANCELLED", "EXPIRED"].includes(payment.clickpesa_status)) {
      return json({
        status: payment.clickpesa_status,
        message: getStatusMessage(payment.clickpesa_status),
        completed_at: payment.completed_at,
        failed_at: payment.failed_at,
        failure_reason: payment.failure_reason,
      });
    }

    // Rate-limit polling to every 5 seconds
    if (payment.last_status_check_at) {
      const elapsed = (Date.now() - new Date(payment.last_status_check_at).getTime()) / 1000;
      if (elapsed < 5) {
        return json({ status: payment.clickpesa_status, message: getStatusMessage(payment.clickpesa_status) });
      }
    }

    // No transaction ID yet — still initiating
    if (!payment.clickpesa_transaction_id) {
      await supabaseAdmin
        .from("subscription_payments")
        .update({ last_status_check_at: new Date().toISOString() })
        .eq("id", payment.id);
      return json({ status: payment.clickpesa_status || "INITIATING", message: "Sending payment request to your phone..." });
    }

    // Query ClickPesa for current status
    const token = await getClickPesaToken();
    if (!token) {
      return json({ status: payment.clickpesa_status, message: "Status check unavailable; please wait" });
    }

    const statusResp = await fetch(
      `${CLICKPESA_API_BASE}/third-parties/payments/${payment.clickpesa_transaction_id}`,
      { headers: { "Authorization": `Bearer ${token}` } }
    );

    await supabaseAdmin
      .from("subscription_payments")
      .update({ last_status_check_at: new Date().toISOString() })
      .eq("id", payment.id);

    if (statusResp.ok) {
      const statusData = await statusResp.json();
      const newStatus = statusData.status;

      await supabaseAdmin
        .from("subscription_payments")
        .update({ clickpesa_status: newStatus })
        .eq("id", payment.id);

      // If now successful and not already activated, activate
      if (newStatus === "SUCCESS" && payment.clickpesa_status !== "SUCCESS") {
        const { error: activationError } = await supabaseAdmin.rpc("activate_subscription_after_payment", { p_payment_id: payment.id });

        if (!activationError) {
          // Send activation email (non-fatal)
          try {
            const { data: org } = await supabaseAdmin
              .from("organizations")
              .select("name, contact_email")
              .eq("id", payment.organization_id)
              .maybeSingle();

            const resendKey = Deno.env.get("RESEND_API_KEY");
            const contactEmail = org?.contact_email ?? null;

            if (!resendKey) {
              console.warn("[clickpesa-check-payment-status] RESEND_API_KEY not set — activation email not sent.");
            } else if (!contactEmail) {
              console.warn("[clickpesa-check-payment-status] No contact_email on org — activation email skipped.", { org_id: payment.organization_id });
            } else {
              const emailPayload = buildActivationEmail(org.name ?? "Your organisation", payment, statusData.channel);
              const emailRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ from: "Iuris Peritis Billing <onboarding@resend.dev>", to: [contactEmail], ...emailPayload }),
              });
              const emailBody = await emailRes.json().catch(() => ({}));
              if (!emailRes.ok) {
                console.error("[clickpesa-check-payment-status] Activation email failed:", emailBody);
              } else {
                console.log("[clickpesa-check-payment-status] Activation email sent, Resend id:", (emailBody as { id?: string }).id);
              }
            }
          } catch (emailErr) {
            console.error("[clickpesa-check-payment-status] Activation email error (non-fatal):", emailErr);
          }
        }
      } else if (["FAILED", "CANCELLED", "EXPIRED"].includes(newStatus)) {
        await supabaseAdmin
          .from("subscription_payments")
          .update({
            failed_at: new Date().toISOString(),
            failure_reason: statusData.failureReason || `Payment ${newStatus.toLowerCase()}`,
            status: "failed",
          })
          .eq("id", payment.id);
        await supabaseAdmin
          .from("organizations")
          .update({ payment_state: "payment_failed" })
          .eq("id", payment.organization_id);
      }

      return json({ status: newStatus, message: getStatusMessage(newStatus) });
    }

    return json({ status: payment.clickpesa_status, message: getStatusMessage(payment.clickpesa_status) });

  } catch (err) {
    console.error("Status check error:", err);
    return jsonError("Internal error", 500);
  }
});

function getStatusMessage(status: string): string {
  switch (status) {
    case "INITIATING": return "Sending payment request to your phone...";
    case "PROCESSING": return "Waiting for your PIN entry...";
    case "PENDING": return "Payment is being confirmed by your network...";
    case "SUCCESS": return "Payment confirmed! Your subscription is now active.";
    case "FAILED": return "Payment failed. Please try again.";
    case "CANCELLED": return "Payment was cancelled.";
    case "EXPIRED": return "Payment session expired. Please try again.";
    default: return "Checking payment status...";
  }
}

async function getClickPesaToken(): Promise<string | null> {
  try {
    const response = await fetch(`${CLICKPESA_API_BASE}/third-parties/generate-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "client-id": Deno.env.get("CLICKPESA_CLIENT_ID")!,
        "api-key": Deno.env.get("CLICKPESA_API_KEY")!,
      },
    });
    if (!response.ok) {
      console.error("ClickPesa token generation failed:", response.status, await response.text());
      return null;
    }
    const data = await response.json();
    const raw = data.token || data.access_token || data.accessToken;
    if (!raw || typeof raw !== "string") {
      console.error("ClickPesa token response missing token field:", JSON.stringify(data));
      return null;
    }
    // ClickPesa returns the token already prefixed with "Bearer ".
    // Strip it here so callers can prepend "Bearer " themselves consistently.
    return raw.replace(/^Bearer\s+/i, "").trim();
  } catch (err) {
    console.error("ClickPesa token error:", err);
    return null;
  }
}

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

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
