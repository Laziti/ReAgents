// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate a strong random password
function generateStrongPassword(length = 24): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  // Use crypto for better randomness
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  
  // Ensure at least one character from each category
  let password = '';
  password += uppercase[randomValues[0] % uppercase.length];
  password += lowercase[randomValues[1] % lowercase.length];
  password += numbers[randomValues[2] % numbers.length];
  password += symbols[randomValues[3] % symbols.length];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[randomValues[i] % allChars.length];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // Note: This function should be called with service role key for security
  // In production, consider adding additional authentication checks

  try {
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

    // Find all admin users
    const { data: adminRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin')

    if (roleError) {
      throw roleError
    }

    const adminUserIds = adminRoles?.map(r => r.user_id) || []

    // Delete all admin users
    for (const userId of adminUserIds) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError) {
        console.error(`Failed to delete user ${userId}:`, deleteError)
      } else {
        console.log(`Deleted admin user: ${userId}`)
      }
    }

    // Generate new admin credentials
    const newEmail = 'admin@reagents.com'
    const newPassword = generateStrongPassword(24)
    const firstName = 'Admin'
    const lastName = 'User'

    // Create new admin user
    const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: newEmail,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        created_by_admin: true,
      },
    })

    if (createError) {
      throw createError
    }

    if (!user) {
      throw new Error('Failed to create user')
    }

    // Wait for triggers
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Create profile
    const baseSlug = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        status: 'active',
        slug: baseSlug,
        listing_limit: { type: 'month', value: 999999 },
        subscription_status: 'pro',
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('Profile creation error (non-fatal):', profileError)
    }

    // Create super_admin role
    const { error: roleCreateError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role: 'super_admin',
      }, { onConflict: 'user_id,role' })

    if (roleCreateError) {
      throw roleCreateError
    }

    return new Response(
      JSON.stringify({
        success: true,
        email: newEmail,
        password: newPassword,
        userId: user.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

