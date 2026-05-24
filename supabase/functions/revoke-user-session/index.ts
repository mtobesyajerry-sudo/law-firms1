import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function isBlockedIP(req: Request): Promise<boolean> {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : null;
  if (!ip) return false;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data } = await supabase
    .from("ip_reputation")
    .select("permanently_blocked")
    .eq("ip_address", ip)
    .maybeSingle();
  return data?.permanently_blocked === true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (await isBlockedIP(req)) {
    return new Response(JSON.stringify({ error: "Too Many Requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller identity from JWT
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller revocation status
    let callerJti: string | null = null;
    let callerSessionId: string | null = null;
    try {
      const payload = JSON.parse(atob(authHeader.replace("Bearer ", "").split(".")[1]));
      callerJti = payload.jti ?? null;
      callerSessionId = payload.session_id ?? null;
    } catch { /* non-fatal */ }

    const { data: callerRevoked } = await supabaseAdmin.rpc("is_session_revoked", {
      p_user_id: user.id,
      p_session_id: callerSessionId,
      p_jti: callerJti,
    });
    if (callerRevoked) {
      return new Response(JSON.stringify({ error: "Session revoked" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: callerProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("role, is_active, organization_id")
      .eq("id", user.id)
      .single();

    if (!callerProfile || !callerProfile.is_active) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["admin", "system_admin"].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Require AAL2 — admins must have completed MFA to perform privileged actions
    try {
      const jwtPayload = JSON.parse(atob(authHeader.replace("Bearer ", "").split(".")[1]));
      if (jwtPayload.aal !== "aal2") {
        return new Response(JSON.stringify({ error: "MFA required for this action" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch {
      return new Response(JSON.stringify({ error: "MFA required for this action" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Accept target_user_id (canonical) or legacy userId/user_id
    const body = await req.json();
    const target_user_id: string = body.target_user_id ?? body.user_id ?? body.userId;
    const { session_id, reason } = body;

    if (!target_user_id) {
      return new Response(JSON.stringify({ error: "target_user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!reason || reason.trim().length < 10) {
      return new Response(JSON.stringify({ error: "reason must be at least 10 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Organization scoping: org-admins can only revoke within their org
    const isSystemAdmin = callerProfile.role === "system_admin";
    const isGlobalAdmin = callerProfile.role === "admin" && callerProfile.organization_id === null;
    if (!isSystemAdmin && !isGlobalAdmin) {
      const { data: targetProfile } = await supabaseAdmin
        .from("user_profiles")
        .select("organization_id")
        .eq("id", target_user_id)
        .single();
      if (!targetProfile) {
        return new Response(JSON.stringify({ error: "Target user not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (targetProfile.organization_id !== callerProfile.organization_id) {
        return new Response(
          JSON.stringify({ error: "Cannot revoke session for user in a different organization" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Step 1: Sign out at the Supabase Auth level
    // If session_id given, sign out that specific session; otherwise sign out all
    if (session_id) {
      const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(session_id);
      if (signOutError) {
        console.error("Supabase signOut error (non-fatal):", signOutError.message);
      }
    } else {
      // Sign out all sessions for this user via the admin API
      const signOutResp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users/${target_user_id}/logout`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          },
        }
      );
      if (!signOutResp.ok) {
        console.error("Supabase admin logout error (non-fatal):", await signOutResp.text());
      }
    }

    // Step 2: Insert revocation record (defense-in-depth for still-valid JWTs)
    const { error: revokeError } = await supabaseAdmin
      .from("revoked_sessions")
      .insert({
        user_id: target_user_id,
        session_id: session_id ?? null,
        jti: null,
        revoked_by: user.id,
        reason: reason.trim(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

    if (revokeError) {
      throw new Error(`Failed to record revocation: ${revokeError.message}`);
    }

    // Step 3: Mark user_sessions rows inactive
    await supabaseAdmin
      .from("user_sessions")
      .update({ is_active: false })
      .eq("user_id", target_user_id)
      .eq("is_active", true);

    // Step 4: Audit log
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      action_type: "update",
      entity_type: "user_session",
      entity_id: target_user_id,
      action_description: `Admin revoked session for user ${target_user_id}. Reason: ${reason.trim()}`,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Session revoked successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("revoke-user-session error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to revoke session" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
