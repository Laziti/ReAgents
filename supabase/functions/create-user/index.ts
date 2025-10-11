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
    const { data: { user }, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: payload.user_metadata,
    })

    if (createUserError) {
      throw createUserError
    }

    if (!user) {
      throw new Error('Failed to create user')
    }

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

    // Create the profile with the unique slug
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.id,
        user_id: user.id,
        first_name: payload.user_metadata.first_name,
        last_name: payload.user_metadata.last_name,
        status: 'active',
        listing_limit: { type: 'month', value: 5 },
        subscription_status: 'free',
        social_links: {},
        slug: finalSlug,
        phone_number: payload.user_metadata.phone_number || '',
        company: payload.user_metadata.company || '',
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      console.error('Profile data being inserted:', {
        id: user.id,
        user_id: user.id,
        first_name: payload.user_metadata.first_name,
        last_name: payload.user_metadata.last_name,
        status: 'active',
        listing_limit: { type: 'month', value: 5 },
        subscription_status: 'free',
        social_links: {},
        slug: finalSlug,
        phone_number: payload.user_metadata.phone_number || '',
        company: payload.user_metadata.company || '',
      });
      // Clean up the created user since we couldn't create the profile
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      throw new Error(`Failed to create user profile: ${profileError.message}. Please try again or contact support if the issue persists.`);
    }

    // Create user role as 'agent' with retry logic
    let roleCreated = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (!roleCreated && retryCount < maxRetries) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'agent'
        });

      if (!roleError) {
        roleCreated = true;
        console.log('User role created successfully');
      } else {
        console.error(`Role creation attempt ${retryCount + 1} failed:`, roleError);
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
        }
      }
    }

    if (!roleCreated) {
      console.error('Failed to create user role after multiple attempts');
      // Clean up the created user and profile if role creation fails
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      throw new Error('Failed to create user role after multiple attempts. Please try again.')
    }

    return new Response(
      JSON.stringify({ user }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
}) 