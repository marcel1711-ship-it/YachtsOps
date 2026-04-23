import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userRole = requestingUser.user_metadata?.role;
    if (userRole !== 'master_admin' && userRole !== 'customer_admin') {
      return new Response(JSON.stringify({ error: 'Only admins can manage users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, user_id, full_name, role, password } = body;

    if (!user_id || !action) {
      return new Response(JSON.stringify({ error: 'Missing required fields: action, user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update') {
      const { data: { user: targetUser }, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (targetErr || !targetUser) {
        return new Response(JSON.stringify({ error: targetErr?.message || 'User not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (userRole === 'customer_admin') {
        const requesterCompany = requestingUser.user_metadata?.company_id;
        const targetCompany = targetUser.user_metadata?.company_id;
        if (requesterCompany !== targetCompany) {
          return new Response(JSON.stringify({ error: 'Cannot manage users from other companies' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const updatedMetadata: Record<string, any> = { ...targetUser.user_metadata };
      if (full_name !== undefined) updatedMetadata.full_name = full_name;
      if (role !== undefined) updatedMetadata.role = role;

      const updatePayload: Record<string, any> = { user_metadata: updatedMetadata };
      if (password) updatePayload.password = password;

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, updatePayload);
      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      if (user_id === requestingUser.id) {
        return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (userRole === 'customer_admin') {
        const { data: { user: targetUser }, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(user_id);
        if (targetErr || !targetUser) {
          return new Response(JSON.stringify({ error: targetErr?.message || 'User not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const requesterCompany = requestingUser.user_metadata?.company_id;
        const targetCompany = targetUser.user_metadata?.company_id;
        if (requesterCompany !== targetCompany) {
          return new Response(JSON.stringify({ error: 'Cannot manage users from other companies' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (deleteError) {
        console.error('Delete error:', JSON.stringify(deleteError));
        return new Response(JSON.stringify({ error: deleteError.message, code: deleteError.code }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error managing user:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
