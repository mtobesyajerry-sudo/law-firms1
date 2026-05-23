import { createClient } from "npm:@supabase/supabase-js@2.39.0";

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    // Step 1: Require Authorization header
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
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Step 2: Verify JWT — identity comes from the token, never from the request body
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2b: Check session revocation
    let jwtJti: string | null = null;
    let jwtSessionId: string | null = null;
    try {
      const payload = JSON.parse(atob(authHeader.replace("Bearer ", "").split(".")[1]));
      jwtJti = payload.jti ?? null;
      jwtSessionId = payload.session_id ?? null;
    } catch { /* non-fatal */ }
    const { data: isRevoked } = await supabaseAdmin.rpc("is_session_revoked", {
      p_user_id: user.id,
      p_session_id: jwtSessionId,
      p_jti: jwtJti,
    });
    if (isRevoked) {
      return new Response(JSON.stringify({ error: "Session revoked" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Verify admin role from JWT-identified user
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

    const isSystemAdmin = callerProfile.role === "system_admin";
    const isAdmin = callerProfile.role === "admin";
    // An admin with no organization_id is a global admin — same cross-org rights as system_admin
    const isGlobalAdmin = (isAdmin || isSystemAdmin) && callerProfile.organization_id === null;

    if (!isAdmin && !isSystemAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 4: Parse request body
    const { userId, newPassword }: { userId: string; newPassword: string } = await req.json();

    if (!userId || !newPassword) {
      return new Response(JSON.stringify({ error: "userId and newPassword are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (newPassword.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 5: Organization scoping — admin can only reset passwords within their own org.
    // system_admin and global admins (admin with no org) may cross organizations.
    if (!isSystemAdmin && !isGlobalAdmin) {
      const { data: targetProfile } = await supabaseAdmin
        .from("user_profiles")
        .select("organization_id")
        .eq("id", userId)
        .single();

      if (!targetProfile) {
        return new Response(JSON.stringify({ error: "Target user not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (targetProfile.organization_id !== callerProfile.organization_id) {
        return new Response(
          JSON.stringify({ error: "Cannot reset password for user in a different organization" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Step 6: Perform the password reset via Admin API
    const updateResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        },
        body: JSON.stringify({ password: newPassword }),
      },
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      return new Response(JSON.stringify({ error: "Failed to update password", details: errorData }), {
        status: updateResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userData = await updateResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Password updated successfully",
        user: { id: userData.id, email: userData.email },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("reset-user-password error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
