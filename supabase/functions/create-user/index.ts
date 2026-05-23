import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import CryptoJS from "npm:crypto-js@4.2.0";

async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ENCRYPTION_KEY = "user-registration-encryption-key-2026";

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

function decryptPassword(encryptedPassword: string | null): string | null {
  if (!encryptedPassword) return null;
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

async function handleApproveRegistration(supabaseAdmin: any, registrationId: string) {
  const { data: registration, error: fetchError } = await supabaseAdmin
    .from("law_firm_registrations")
    .select("*")
    .eq("id", registrationId)
    .single();

  if (fetchError || !registration) {
    throw new Error("Registration not found");
  }

  const { data: orgData, error: orgError } = await supabaseAdmin
    .from("organizations")
    .insert({
      name: registration.law_firm_name,
      business_type: "law_firm",
      law_firm_type: "small_firm",
      brela_registration: registration.brela_registration_number,
      tls_registration: registration.tls_registration_number,
      contact_email: registration.firm_email,
      is_active: true,
      subscription_status: "active",
      subscription_fee: 0,
    })
    .select()
    .single();

  if (orgError) throw new Error(`Failed to create organization: ${orgError.message}`);

  const decryptedPassword = decryptPassword(registration.encrypted_password);
  if (!decryptedPassword) throw new Error("Failed to decrypt password");

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: registration.firm_email,
    password: decryptedPassword,
    email_confirm: true,
    user_metadata: { full_name: registration.contact_person_name || registration.firm_name },
  });

  if (authError) throw new Error(`Failed to create user: ${authError.message}`);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const { error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .insert({
      id: authData.user.id,
      email: registration.firm_email,
      role: "management",
      full_name: registration.contact_person_name || registration.firm_name,
      organization_id: orgData.id,
      password_change_required: false,
    });

  if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`);

  await supabaseAdmin
    .from("law_firm_registrations")
    .update({ registration_status: "active", approved_at: new Date().toISOString() })
    .eq("id", registrationId);

  return new Response(
    JSON.stringify({
      success: true,
      message: "Registration approved successfully",
      organization_id: orgData.id,
      user_id: authData.user.id,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
  );
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

    // Step 2b: Check session revocation (defense-in-depth against still-valid revoked JWTs)
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

    // Step 3b: Require AAL2 — admins must have completed MFA to perform privileged actions
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

    // Step 4: Parse request body
    const requestBody = await req.json();
    const { action, registrationId } = requestBody;

    // Registration approval — admin or system_admin only
    if (action === "approve_registration" && registrationId) {
      return await handleApproveRegistration(supabaseAdmin, registrationId);
    }

    const { email, password, full_name, role, organization_id } = requestBody;

    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 5: Organization scoping — admin can only create users in their own org.
    // system_admin and global admins (admin with no org) may create users in any org.
    const targetOrgId = organization_id ?? callerProfile.organization_id;

    if (!isSystemAdmin && !isGlobalAdmin && organization_id && organization_id !== callerProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: "Cannot create user in a different organization" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 6: Validate admin-supplied password if provided; generate a compliant temp if not
    if (password) {
      const pwErrors: string[] = [];
      if (password.length < 12) pwErrors.push("Password must be at least 12 characters long");
      if (!/[A-Z]/.test(password)) pwErrors.push("Password must contain at least one uppercase letter");
      if (!/[a-z]/.test(password)) pwErrors.push("Password must contain at least one lowercase letter");
      if (!/\d/.test(password)) pwErrors.push("Password must contain at least one number");
      if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) pwErrors.push("Password must contain at least one special character");
      if (pwErrors.length > 0) {
        return new Response(JSON.stringify({ error: pwErrors.join("; ") }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Common password check against 9,865-entry DB table (exact match on md5(lower(candidate)))
      const { data: commonCheck } = await supabaseAdmin
        .rpc("check_common_password", { candidate: password });
      if (commonCheck === true) {
        return new Response(JSON.stringify({ error: "Password is too common" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Generate a cryptographically random temporary password when admin does not supply one.
    // The user will be required to change it on first login (password_change_required = true).
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const randomHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const userPassword = password || `T${randomHex.slice(0, 10)}!A${randomHex.slice(10, 14)}9`;

    // Check if a user with this email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

    if (existingUser) {
      console.log(`Existing user found for ${email}, removing before recreate...`);
      await supabaseAdmin.from("user_profiles").delete().eq("id", existingUser.id);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      if (deleteError) throw new Error(`Cannot delete existing user: ${deleteError.message}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true,
      user_metadata: { full_name: full_name || "" },
    });

    if (createError) throw new Error(`Failed to create user: ${createError.message}`);
    if (!authData.user) throw new Error("User creation succeeded but no user data returned");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 7: Create or update profile
    const { data: existingProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("id", authData.user.id)
      .maybeSingle();

    // Admins get immediate MFA enforcement; all others get 14-day grace period
    const assignedRole = role || "client";
    const isAdminRole = assignedRole === "admin" || assignedRole === "system_admin";
    const mfaGracePeriodEnds = isAdminRole
      ? new Date().toISOString()
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const profileData: Record<string, unknown> = {
      id: authData.user.id,
      email,
      role: assignedRole,
      full_name: full_name || "",
      password_change_required: !password,
      organization_id: targetOrgId ?? null,
      mfa_grace_period_ends: mfaGracePeriodEnds,
    };

    if (!existingProfile) {
      const { error: insertError } = await supabaseAdmin.from("user_profiles").insert(profileData);
      if (insertError) throw new Error(`Profile creation failed: ${insertError.message}`);
    } else {
      const { error: updateError } = await supabaseAdmin
        .from("user_profiles")
        .update(profileData)
        .eq("id", authData.user.id);
      if (updateError) throw new Error(`Profile update failed: ${updateError.message}`);
    }

    // Record initial password hash in history only when admin explicitly set a password.
    // Auto-generated temp passwords are not recorded — the user must change them immediately.
    if (password) {
      const newHash = await hashPassword(password);
      await supabaseAdmin.from("password_history").insert({
        user_id: authData.user.id,
        password_hash: newHash,
        created_by: user.id,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: authData.user,
        temporary_password: password ? undefined : userPassword,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("create-user error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to create user" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
