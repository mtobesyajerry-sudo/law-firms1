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
        await supabaseAdmin.rpc("activate_subscription_after_payment", { p_payment_id: payment.id });
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
