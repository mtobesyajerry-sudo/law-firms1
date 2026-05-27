import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CLICKPESA_API_BASE = "https://api.clickpesa.com";

interface InitiateRequest {
  tier: string;
  billing_cycle: string;
  payment_method: string;
  phone_number: string;
  payer_name?: string;
}

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
    if (userError || !user) {
      return jsonError("Invalid token", 401);
    }

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.organization_id) {
      return jsonError("No organization found for user", 403);
    }

    if (profile.role !== "management") {
      return jsonError("Only management users can initiate payments", 403);
    }

    const body: InitiateRequest = await req.json();

    if (!["small_firm", "medium_firm", "launch_smoke_test"].includes(body.tier)) {
      return jsonError("Invalid tier; only small_firm and medium_firm are self-serve payable", 400);
    }
    if (!["monthly", "annual"].includes(body.billing_cycle)) {
      return jsonError("Invalid billing_cycle", 400);
    }
    if (!["mpesa", "mixx_by_yas", "airtel_money", "halopesa", "bank_transfer_crdb"].includes(body.payment_method)) {
      return jsonError("Invalid payment_method", 400);
    }
    if (!body.phone_number || !/^255\d{9}$/.test(body.phone_number)) {
      return jsonError("Invalid phone_number; must be Tanzanian format 255XXXXXXXXX", 400);
    }

    // Compute amount server-side — never trust client
    const { data: priceData, error: priceError } = await supabaseAdmin
      .rpc("calculate_payment_amount", {
        p_tier: body.tier,
        p_billing_cycle: body.billing_cycle,
      });

    if (priceError || !priceData?.[0]) {
      console.error("Price calculation failed:", priceError);
      return jsonError("Could not determine payment amount", 500);
    }

    const { total_tzs: totalTzs, vat_tzs: vatTzs, subtotal_tzs: subtotalTzs, plan_name: planName } = priceData[0];

    // Generate unique order reference
    const orgShortId = profile.organization_id.replace(/-/g, "").slice(0, 8);
    const timestamp = Date.now();
    const orderReference = `IUC-${orgShortId}-${timestamp}`;

    // Get ClickPesa auth token
    const token = await getClickPesaToken(CLICKPESA_API_BASE);
    if (!token) {
      return jsonError("Failed to authenticate with payment gateway. Please try again.", 502);
    }

    // Compute checksum for ClickPesa request
    const checksum = await computeChecksum({
      amount: totalTzs.toString(),
      currency: "TZS",
      orderReference,
      secret: Deno.env.get("CLICKPESA_API_KEY")!,
    });

    // Insert payment record before calling ClickPesa (so we have an ID on failure too)
    const { data: payment, error: insertError } = await supabaseAdmin
      .from("subscription_payments")
      .insert({
        organization_id: profile.organization_id,
        payment_reference: orderReference,
        payment_type: "subscription_initial",
        payment_method: body.payment_method,
        amount_gross_tzs: totalTzs,
        amount_net_tzs: subtotalTzs,
        vat_amount_tzs: vatTzs,
        vat_rate: 18.00,
        subscription_tier: body.tier,
        billing_period: body.billing_cycle === "monthly" ? "monthly" : "annual",
        status: "processing",
        tier: body.tier,
        billing_cycle: body.billing_cycle,
        amount_tzs: totalTzs,
        vat_tzs: vatTzs,
        subtotal_tzs: subtotalTzs,
        clickpesa_order_reference: orderReference,
        clickpesa_status: "INITIATING",
        payer_phone_number: body.phone_number,
        payer_name: body.payer_name || null,
        initiated_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Payment record creation failed:", insertError);
      return jsonError("Could not create payment record", 500);
    }

    // Call ClickPesa USSD-Push API
    const ussdResponse = await fetch(
      `${CLICKPESA_API_BASE}/third-parties/payments/initiate-ussd-push-request`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: totalTzs.toString(),
          currency: "TZS",
          orderReference,
          phoneNumber: body.phone_number,
          checksum,
        }),
      }
    );

    if (!ussdResponse.ok) {
      const errorText = await ussdResponse.text();
      console.error(`ClickPesa USSD-Push failed (${ussdResponse.status}):`, errorText);

      await supabaseAdmin
        .from("subscription_payments")
        .update({
          clickpesa_status: "FAILED",
          failed_at: new Date().toISOString(),
          failure_reason: `ClickPesa API error ${ussdResponse.status}: ${errorText.slice(0, 200)}`,
          status: "failed",
        })
        .eq("id", payment.id);

      return jsonError("Payment gateway error. Please try again.", 502);
    }

    const ussdData = await ussdResponse.json();

    // Update payment record with ClickPesa response
    await supabaseAdmin
      .from("subscription_payments")
      .update({
        clickpesa_transaction_id: ussdData.id,
        clickpesa_status: ussdData.status || "PROCESSING",
        clickpesa_channel: ussdData.channel || null,
      })
      .eq("id", payment.id);

    // Update org payment state
    await supabaseAdmin
      .from("organizations")
      .update({ payment_state: "payment_pending" })
      .eq("id", profile.organization_id);

    return new Response(
      JSON.stringify({
        payment_id: payment.id,
        transaction_id: ussdData.id,
        status: ussdData.status || "PROCESSING",
        order_reference: orderReference,
        amount_tzs: totalTzs,
        plan_name: planName,
        message: "USSD prompt sent to your phone. Please enter your PIN to complete payment.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unhandled error in clickpesa-initiate-payment:", err);
    return jsonError("Internal server error", 500);
  }
});

async function getClickPesaToken(baseUrl: string): Promise<string | null> {
  try {
    const response = await fetch(`${baseUrl}/third-parties/generate-token`, {
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

async function computeChecksum(opts: {
  amount: string;
  currency: string;
  orderReference: string;
  secret: string;
}): Promise<string> {
  const message = `${opts.amount}${opts.currency}${opts.orderReference}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(opts.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
