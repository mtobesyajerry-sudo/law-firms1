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
    .from("management_user_registrations")
    .select("*")
    .eq("id", registrationId)
    .single();

  if (fetchError || !registration) {
    throw new Error("Registration not found");
  }

  // Determine effective trial tier.
  // large_firm trials use medium_firm capabilities; requested_tier is preserved for audit.
  const requestedTier: string = registration.requested_tier || "small_firm";
  const trialTier: string = requestedTier === "large_firm" ? "medium_firm" : requestedTier;

  // Derive sector and business_type from what the registrant selected.
  // Fall back to 'law_firm' only if neither field was captured (legacy registrations).
  const orgSector: string = registration.sector || registration.dnfbp_category || "law_firm";
  const orgBusinessType: string = registration.dnfbp_category || registration.sector || "law_firm";

  const tierMaxUsers: Record<string, number | null> = {
    small_firm: 12,
    medium_firm: 30,
    large_firm: null,
  };
  const maxUsers = tierMaxUsers[trialTier] ?? 12;

  const { data: orgData, error: orgError } = await supabaseAdmin
    .from("organizations")
    .insert({
      name: registration.law_firm_name,
      business_type: orgBusinessType,
      sector: orgSector,
      law_firm_type: trialTier,
      subscription_tier: trialTier,
      max_users: maxUsers,
      brela_registration: registration.brela_registration_number,
      tls_registration: registration.tls_registration_number,
      contact_email: registration.firm_email,
      is_active: true,
      subscription_status: "active",
      subscription_fee: 0,
      requested_tier: requestedTier,
    })
    .select()
    .single();

  if (orgError) throw new Error(`Failed to create organization: ${orgError.message}`);

  // Start the 14-day trial
  const { error: trialError } = await supabaseAdmin.rpc("start_trial", {
    p_org_id: orgData.id,
    p_chosen_tier: trialTier,
  });
  if (trialError) throw new Error(`Failed to start trial: ${trialError.message}`);

  // stamp payment_state = trialing (start_trial sets is_trialing but not payment_state)
  await supabaseAdmin
    .from("organizations")
    .update({ payment_state: "trialing" })
    .eq("id", orgData.id);

  const decryptedPassword = decryptPassword(registration.encrypted_password);
  if (!decryptedPassword) throw new Error("Failed to decrypt password");

  // Clean up any pre-existing auth user for this email (e.g. from a failed previous approval attempt)
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingAuthUser = existingUsers?.users?.find((u: any) => u.email === registration.firm_email);
  if (existingAuthUser) {
    await supabaseAdmin.from("user_profiles").delete().eq("id", existingAuthUser.id);
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
    if (deleteError) throw new Error(`Cannot remove existing auth user: ${deleteError.message}`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: registration.firm_email,
    password: decryptedPassword,
    email_confirm: true,
    user_metadata: { full_name: registration.user_full_name || registration.law_firm_name },
  });

  if (authError) throw new Error(`Failed to create user: ${authError.message}`);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const { error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .insert({
      id: authData.user.id,
      email: registration.firm_email,
      role: "management",
      full_name: registration.user_full_name || registration.law_firm_name,
      organization_id: orgData.id,
      password_change_required: false,
    });

  if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`);

  await supabaseAdmin
    .from("management_user_registrations")
    .update({ registration_status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", registrationId);

  // Fetch the trial_ends_at that start_trial just wrote so we can surface it in emails
  const { data: updatedOrg } = await supabaseAdmin
    .from("organizations")
    .select("trial_ends_at")
    .eq("id", orgData.id)
    .single();

  const trialStart = new Date();
  const trialEnd = updatedOrg?.trial_ends_at
    ? new Date(updatedOrg.trial_ends_at)
    : new Date(trialStart.getTime() + 14 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Dar_es_Salaam" });

  const tierLabels: Record<string, string> = {
    small_firm: "Small Firm",
    medium_firm: "Medium Firm",
    large_firm: "Large Firm",
  };
  const tierLabel = tierLabels[trialTier] ?? trialTier;

  const resendKey = Deno.env.get("RESEND_API_KEY");

  // Welcome email to the customer
  const welcomeSubject = "Welcome to Iuris Peritis — your trial is active";
  const welcomeBody = [
    `Dear ${registration.user_full_name || registration.law_firm_name},`,
    "",
    "Your Iuris Peritis Compliance account has been approved and your free trial is now active.",
    "",
    `Organisation:  ${registration.law_firm_name}`,
    `Plan:          ${tierLabel}`,
    `Trial started: ${fmt(trialStart)}`,
    `Trial ends:    ${fmt(trialEnd)}`,
    "",
    "You can log in immediately at https://iuris-peritis.co.tz using the email address",
    `and password you chose during registration (${registration.firm_email}).`,
    "",
    "If you have any questions, reply to this email or contact us at info@iurisperitis.co.tz.",
    "",
    "— The Iuris Peritis Team",
  ].join("\n");

  if (!resendKey) {
    console.warn("[create-user] RESEND_API_KEY not set — welcome email not sent.", {
      to: registration.firm_email,
      subject: welcomeSubject,
    });
  } else {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Iuris Peritis Compliance <onboarding@resend.dev>",
          to: [registration.firm_email],
          subject: welcomeSubject,
          text: welcomeBody,
        }),
      });
    } catch (emailErr) {
      console.error("[create-user] Failed to send welcome email:", emailErr);
    }
  }

  // For large_firm prospects, also notify the sales team to follow up during the trial
  if (requestedTier === "large_firm") {
    const salesSubject = `Large firm trial activated — sales follow-up needed: ${registration.law_firm_name}`;
    const salesBody = [
      "A large firm trial has been activated and requires a sales conversation before the trial ends.",
      "",
      `Organisation:   ${registration.law_firm_name}`,
      `BRELA number:   ${registration.brela_registration_number || "—"}`,
      `Contact name:   ${registration.user_full_name || "—"}`,
      `Contact email:  ${registration.firm_email}`,
      `Mobile:         ${registration.mobile_number || "—"}`,
      "Trial tier:     Medium Firm capabilities (large_firm requested)",
      `Trial start:    ${fmt(trialStart)}`,
      `Trial end:      ${fmt(trialEnd)}`,
      "",
      "Suggested action: Reach out to this firm during the trial to discuss large_firm pricing",
      "and onboarding. They will need a custom quote and migration plan.",
      "",
      "— Iuris Peritis Compliance Platform",
    ].join("\n");

    if (!resendKey) {
      console.warn("[create-user] RESEND_API_KEY not set — large firm sales alert not sent.", {
        to: "info@iurisperitis.co.tz",
        subject: salesSubject,
      });
    } else {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Iuris Peritis Compliance <onboarding@resend.dev>",
            to: ["info@iurisperitis.co.tz"],
            subject: salesSubject,
            text: salesBody,
          }),
        });
      } catch (emailErr) {
        console.error("[create-user] Failed to send large firm sales alert:", emailErr);
      }
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: "Registration approved successfully",
      organization_id: orgData.id,
      user_id: authData.user.id,
      trial_tier: trialTier,
      requested_tier: requestedTier,
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

    // TODO post-launch: re-enable AAL2 gate with proper UX prompt-and-retry flow
    // const jwtPayload = JSON.parse(atob(authHeader.replace("Bearer ", "").split(".")[1]));
    // if (jwtPayload.aal !== "aal2") { return jsonError("MFA required for this action", 403); }

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
