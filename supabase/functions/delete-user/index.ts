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

    // Step 2: Verify JWT — identity from token, never from request body
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
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

    // Step 4: Parse request body — admin_user_id no longer accepted; identity is JWT-derived
    const { user_id }: { user_id: string } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 5: Organization scoping — admin can only delete users within their own org.
    // system_admin and global admins (admin with no org) may cross organizations.
    if (!isSystemAdmin && !isGlobalAdmin) {
      const { data: targetProfile } = await supabaseAdmin
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user_id)
        .single();

      if (!targetProfile) {
        return new Response(JSON.stringify({ error: "Target user not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (targetProfile.organization_id !== callerProfile.organization_id) {
        return new Response(
          JSON.stringify({ error: "Cannot delete user in a different organization" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Step 6: Delete profile first (cascade removes related data), then auth user
    const { error: deleteProfileError } = await supabaseAdmin
      .from("user_profiles")
      .delete()
      .eq("id", user_id);

    if (deleteProfileError) {
      console.error("Profile deletion error:", deleteProfileError);
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteAuthError) {
      if (!deleteAuthError.message.includes("User not found")) {
        throw new Error(`Failed to delete user from auth: ${deleteAuthError.message}`);
      }
      console.log("User not found in auth.users — profile-only cleanup completed");
    }

    return new Response(
      JSON.stringify({ success: true, message: "User deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("delete-user error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to delete user" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
