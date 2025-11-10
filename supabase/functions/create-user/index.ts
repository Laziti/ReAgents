// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers to allow requests from localhost
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

interface CreateUserPayload {
  email: string
  password: string
  user_metadata: {
    first_name: string
    last_name: string
    role?: string
    phone_number?: string
    company?: string
    created_by_admin?: boolean
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, // Use 204 for preflight success
      headers: corsHeaders 
    })
  }

  try {
    // Get the request body
    let payload: CreateUserPayload;
    try {
      payload = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: e instanceof Error ? e.message : e }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate required fields
    if (!payload.email) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    if (!payload.password) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: password' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    if (!payload.user_metadata) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: user_metadata' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    if (!payload.user_metadata.first_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: user_metadata.first_name' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    if (!payload.user_metadata.last_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: user_metadata.last_name' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    // Log payload for debugging
    console.log('Received payload:', payload);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Create user with admin privileges
    // Set created_by_admin flag to prevent the handle_new_user trigger from creating a profile
    // We'll create the profile ourselves with all the correct values
    const userMetadata = {
      first_name: payload.user_metadata.first_name,
      last_name: payload.user_metadata.last_name,
      phone_number: payload.user_metadata.phone_number || null,
      company: payload.user_metadata.company || null,
      career: payload.user_metadata.career || 'real_estate_agent',
      created_by_admin: true, // Prevent trigger from creating profile
    };

    const { data: { user }, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: userMetadata,
    })

    if (createUserError) {
      throw createUserError
    }

    if (!user) {
      throw new Error('Failed to create user')
    }

    // Wait a moment for the trigger to complete (if it runs despite created_by_admin flag)
    // This prevents race conditions
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate a simple slug from the user's name
    const baseSlug = `${payload.user_metadata.first_name}-${payload.user_metadata.last_name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let finalSlug = baseSlug;
    let slugCounter = 0;
    let slugUnique = false;

    // Keep trying until we find a unique slug
    while (!slugUnique) {
      const { data: existingSlug, error: slugCheckError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle();

      if (slugCheckError) {
        console.error('Error checking slug uniqueness:', slugCheckError);
        throw new Error('Failed to verify profile URL uniqueness');
      }

      if (!existingSlug) {
        slugUnique = true;
      } else {
        slugCounter++;
        finalSlug = `${baseSlug}-${slugCounter}`;
      }
    }

    // Remove any existing profile with the same id to avoid duplicate key issues
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (deleteProfileError) {
      console.error('Profile delete error before insert:', deleteProfileError)
      // Non-fatal; continue and attempt insert anyway
    }

    const profileData = {
      id: user.id,
      user_id: user.id,
      first_name: payload.user_metadata.first_name,
      last_name: payload.user_metadata.last_name,
      status: 'active',
      listing_limit: { type: 'month', value: 10 },
      subscription_status: 'free',
      slug: finalSlug,
      phone_number: payload.user_metadata.phone_number || null,
      company: payload.user_metadata.company || null,
      career: payload.user_metadata.career || 'real_estate_agent',
      social_links: {},
    };

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert(profileData)

    if (profileError) {
      console.error('Profile creation error:', profileError);
      console.error('Profile error details:', JSON.stringify(profileError, null, 2));
      console.error('Profile data being upserted:', {
        id: user.id,
        user_id: user.id,
        first_name: payload.user_metadata.first_name,
        last_name: payload.user_metadata.last_name,
        status: 'active',
        listing_limit: { type: 'month', value: 10 },
        subscription_status: 'free',
        social_links: {},
        slug: finalSlug,
        phone_number: payload.user_metadata.phone_number || null,
        company: payload.user_metadata.company || null,
        career: payload.user_metadata.career || null,
      });
      // Clean up the created user since we couldn't create the profile
      try {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      } catch (deleteError) {
        console.error('Error deleting user during cleanup:', deleteError);
      }
      throw new Error(`Failed to create user profile: ${profileError.message}. Please try again or contact support if the issue persists.`);
    }

    // Create user role as 'agent' (use upsert to avoid duplicate errors)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role: 'agent'
      }, { onConflict: 'user_id,role' });

    if (roleError) {
      console.error('Role creation error:', roleError);
      // Clean up the created user and profile if role creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      } catch (deleteError) {
        console.error('Error deleting user during cleanup:', deleteError);
      }
      throw new Error(`Failed to create user role: ${roleError.message}. Please try again.`)
    }

    return new Response(
      JSON.stringify({ user }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Edge Function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    // Log full error for debugging (including all properties)
    const errorObj = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error as any),
    } : error;
    console.error('Full error details:', JSON.stringify(errorObj, null, 2));
    
    // Return error with helpful message
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        message: errorMessage, // Also include as 'message' for consistency
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
}) 