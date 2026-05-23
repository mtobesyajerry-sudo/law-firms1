import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function hashCode(code: string): Promise<string> {
  const encoded = new TextEncoder().encode(code.toUpperCase());
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Verify caller identity from JWT
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Caller must be at aal1 (passed password, not yet aal2) — this is the valid state for backup auth
    // We accept aal1 here since that's exactly when backup codes are used
    const { code }: { code: string } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "code is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(normalized)) {
      return new Response(JSON.stringify({ error: "Invalid backup code format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const codeHash = await hashCode(normalized);

    // Look up unused backup codes for this user
    const { data: rows, error: lookupError } = await supabaseAdmin
      .from("mfa_backup_codes")
      .select("id, code_hash, used_at")
      .eq("user_id", user.id)
      .is("used_at", null);

    if (lookupError) throw new Error(`Lookup failed: ${lookupError.message}`);

    const match = rows?.find((r: { id: string; code_hash: string; used_at: string | null }) => r.code_hash === codeHash);

    if (!match) {
      // Log failed attempt
      try {
        await supabaseAdmin.from("failed_login_attempts").insert({
          user_id: user.id,
          attempt_type: "mfa_backup_code",
          ip_address: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
        });
      } catch { /* non-fatal */ }

      try {
        await supabaseAdmin.from("audit_logs").insert({
          user_id: user.id,
          action_type: "login",
          entity_type: "mfa_backup_code",
          action_description: "Failed MFA backup code attempt",
        });
      } catch { /* non-fatal */ }

      return new Response(JSON.stringify({ error: "Invalid or already-used backup code" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark the code as used
    const { error: updateError } = await supabaseAdmin
      .from("mfa_backup_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", match.id);

    if (updateError) throw new Error(`Failed to mark code used: ${updateError.message}`);

    // Elevate the session to aal2 by enrolling a one-time TOTP challenge
    // Supabase doesn't have a direct admin API to elevate AAL — the client must complete
    // the MFA verify step. Instead we unenroll MFA factors temporarily is not an option.
    // The correct pattern: return a signed session elevation token for the client to present.
    // However, Supabase native TOTP is the only path to aal2 via the SDK.
    //
    // Practical approach: the Edge Function confirms the backup code is valid and consumed.
    // The client session remains at aal1. We set a short-lived DB flag that the AuthContext
    // reads to treat this user as "backup-code verified" for the current session.
    // A separate mfa_session_elevations table holds this.
    const elevationToken = crypto.randomUUID();
    try {
      await supabaseAdmin.from("mfa_session_elevations").insert({
        user_id: user.id,
        token: elevationToken,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
    } catch { /* non-fatal */ }

    try {
      await supabaseAdmin.from("audit_logs").insert({
        user_id: user.id,
        action_type: "login",
        entity_type: "mfa_backup_code",
        action_description: "MFA backup code verified successfully",
      });
    } catch { /* non-fatal */ }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Backup code accepted. Code marked as used.",
        elevation_token: elevationToken,
        remaining_codes: (rows?.length ?? 1) - 1,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("verify-mfa-backup-code error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
