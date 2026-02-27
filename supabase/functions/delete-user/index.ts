import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DeleteUserRequest {
  admin_user_id: string;
  user_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { admin_user_id, user_id }: DeleteUserRequest = await req.json();

    if (!admin_user_id) {
      throw new Error('Admin user ID is required');
    }

    if (!user_id) {
      throw new Error('User ID is required');
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', admin_user_id)
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error('Admin verification failed');
    }

    if (profile.role !== 'admin') {
      throw new Error('Only admins can delete users');
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteAuthError) {
      if (deleteAuthError.message.includes('User not found')) {
        console.log('User not found in auth.users, proceeding to clean up profile');
      } else {
        throw new Error(`Failed to delete user from auth: ${deleteAuthError.message}`);
      }
    }

    const { error: deleteProfileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', user_id);

    if (deleteProfileError) {
      console.error('Profile deletion error (may already be deleted by cascade):', deleteProfileError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Delete user error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to delete user',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
