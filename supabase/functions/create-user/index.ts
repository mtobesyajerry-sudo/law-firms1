import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import CryptoJS from 'npm:crypto-js@4.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') || 'default-encryption-key-change-in-production';

function decryptPassword(encryptedPassword: string | null): string | null {
  if (!encryptedPassword) return null;
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

interface CreateUserRequest {
  admin_user_id: string;
  email: string;
  password?: string;
  full_name: string;
  role: 'admin' | 'client' | 'management' | 'staff' | 'compliance_officer' | 'lawyer' | 'mlro' | 'senior_partner';
  organization_id?: string;
}

async function handleApproveRegistration(supabaseAdmin: any, registrationId: string) {
  console.log('Approving registration:', registrationId);

  // Get the registration details
  const { data: registration, error: fetchError } = await supabaseAdmin
    .from('law_firm_registrations')
    .select('*')
    .eq('id', registrationId)
    .single();

  if (fetchError || !registration) {
    throw new Error('Registration not found');
  }

  console.log('Registration details:', registration);

  // Create organization
  const { data: orgData, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({
      name: registration.firm_name,
      business_type: 'law_firm',
      brela_registration: registration.brela_number,
      contact_email: registration.firm_email,
      law_firm_type: 'small_firm',
      is_active: true,
      subscription_status: 'active',
      subscription_fee: 0
    })
    .select()
    .single();

  if (orgError) {
    console.error('Organization creation error:', orgError);
    throw new Error(`Failed to create organization: ${orgError.message}`);
  }

  console.log('Organization created:', orgData.id);

  // Decrypt password
  const decryptedPassword = decryptPassword(registration.encrypted_password);
  if (!decryptedPassword) {
    throw new Error('Failed to decrypt password');
  }

  // Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: registration.firm_email,
    password: decryptedPassword,
    email_confirm: true,
    user_metadata: {
      full_name: registration.contact_person_name || registration.firm_name
    }
  });

  if (authError) {
    console.error('Auth user creation error:', authError);
    throw new Error(`Failed to create user: ${authError.message}`);
  }

  console.log('Auth user created:', authData.user.id);

  // Wait for user to be fully created
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Create user profile
  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      email: registration.firm_email,
      role: 'management',
      full_name: registration.contact_person_name || registration.firm_name,
      organization_id: orgData.id,
      password_change_required: false
    });

  if (profileError) {
    console.error('Profile creation error:', profileError);
    throw new Error(`Failed to create profile: ${profileError.message}`);
  }

  console.log('Profile created successfully');

  // Update registration status
  const { error: updateError } = await supabaseAdmin
    .from('law_firm_registrations')
    .update({
      registration_status: 'active',
      approved_at: new Date().toISOString()
    })
    .eq('id', registrationId);

  if (updateError) {
    console.error('Registration update error:', updateError);
    throw new Error(`Failed to update registration: ${updateError.message}`);
  }

  console.log('Registration approved successfully');

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Registration approved successfully',
      organization_id: orgData.id,
      user_id: authData.user.id
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const requestBody = await req.json();
    const { action, registrationId } = requestBody;

    // Handle registration approval
    if (action === 'approve_registration' && registrationId) {
      return await handleApproveRegistration(supabaseAdmin, registrationId);
    }

    const { admin_user_id, email, password, full_name, role, organization_id }: CreateUserRequest = requestBody;

    if (!admin_user_id) {
      throw new Error('Admin user ID is required');
    }

    // Verify the calling user has permission to create users
    console.log('Verifying admin user:', admin_user_id);

    // Use raw SQL query to bypass RLS with service role
    const { data: profiles, error: profileError } = await supabaseAdmin
      .rpc('get_user_profile_for_admin', { user_id: admin_user_id });

    const profile = profiles && profiles.length > 0 ? profiles[0] : null;

    if (profileError) {
      console.error('Profile verification error:', profileError);
      throw new Error(`User verification failed: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error('User profile not found');
    }

    console.log('Admin user profile found:', profile);

    // Allow admins and management roles to create users
    const allowedRoles = ['admin', 'management', 'senior_partner', 'partner'];
    if (!allowedRoles.includes(profile.role)) {
      throw new Error('Only administrators and management can create users');
    }

    if (!email) {
      throw new Error('Email is required');
    }

    // Generate a temporary password if none provided
    const userPassword = password || `Temp${Math.random().toString(36).slice(-8)}!${Date.now().toString().slice(-4)}`;

    // Check if a user with this email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      console.log(`Found existing user with email ${email}, attempting to delete...`);

      // Delete the existing user profile first
      const { error: deleteProfileError } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', existingUser.id);

      if (deleteProfileError) {
        console.error('Error deleting existing profile:', deleteProfileError);
      }

      // Delete the existing auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      if (deleteError) {
        console.error('Error deleting existing auth user:', deleteError);
        throw new Error(`Cannot delete existing user: ${deleteError.message}`);
      }

      console.log('Successfully deleted existing user, waiting for cleanup...');
      // Wait longer for deletion to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Create the new user
    console.log('Creating auth user with email:', email);
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true,
      user_metadata: { full_name: full_name || '' },
    });

    if (createError) {
      console.error('Create user error:', createError);
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    if (!authData.user) {
      throw new Error('User creation succeeded but no user data returned');
    }

    console.log('Auth user created successfully:', authData.user.id);

    // Wait a bit for the auth user to be fully created
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if profile already exists
    console.log('Checking for existing profile...');
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing profile:', checkError);
      throw new Error(`Profile check failed: ${checkError.message}`);
    }

    if (!existingProfile) {
      // Create the user profile with organization_id if provided
      console.log('Creating new profile for user:', authData.user.id);
      const profileData: any = {
        id: authData.user.id,
        email: email,
        role: role || 'client',
        full_name: full_name || '',
        password_change_required: password ? false : true,
      };

      // Only add organization_id if provided (non-admin users need it)
      if (organization_id) {
        profileData.organization_id = organization_id;
      }

      console.log('Profile data to insert:', profileData);

      const { error: insertError } = await supabaseAdmin
        .from('user_profiles')
        .insert(profileData);

      if (insertError) {
        console.error('Profile insert error:', insertError);
        throw new Error(`Profile creation failed: ${insertError.message}`);
      }

      console.log('Profile created successfully');
    } else {
      // Update existing profile
      console.log('Updating existing profile:', authData.user.id);
      const updateData: any = {
        role: role || 'client',
        full_name: full_name || '',
        password_change_required: password ? false : true,
      };

      // Only update organization_id if provided
      if (organization_id) {
        updateData.organization_id = organization_id;
      }

      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update(updateData)
        .eq('id', authData.user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error(`Profile update failed: ${updateError.message}`);
      }

      console.log('Profile updated successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: authData.user,
        temporary_password: password ? undefined : userPassword // Only return temp password if we generated one
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Create user error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create user',
        details: error.stack
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});