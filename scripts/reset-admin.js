/**
 * Script to delete existing admin user and create a new one with strong password
 * 
 * Usage:
 *   node scripts/reset-admin.js
 * 
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// Generate a strong random password
function generateStrongPassword(length = 24) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  // Use crypto for better randomness
  const randomValues = randomBytes(length);
  
  // Ensure at least one character from each category
  let password = '';
  password += uppercase[randomValues[0] % uppercase.length];
  password += lowercase[randomValues[1] % lowercase.length];
  password += numbers[randomValues[2] % numbers.length];
  password += symbols[randomValues[3] % symbols.length];
  
  // Fill the rest randomly using crypto
  for (let i = password.length; i < length; i++) {
    password += allChars[randomValues[i] % allChars.length];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function resetAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
    console.error('\nPlease set them in your environment or create a .env file:');
    console.error('  SUPABASE_URL=https://your-project.supabase.co');
    console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    process.exit(1);
  }

  // Create Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    console.log('🔍 Finding admin users...');
    
    // Find all admin users
    const { data: adminUsers, error: queryError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, auth.users!inner(id, email)')
      .eq('role', 'super_admin');

    if (queryError) {
      // Try alternative query
      const { data: users, error: altError } = await supabaseAdmin
        .rpc('get_auth_users_data')
        .then(async (result) => {
          if (result.error) throw result.error;
          const userIds = result.data.map(u => u.id);
          const { data: roles } = await supabaseAdmin
            .from('user_roles')
            .select('user_id, role')
            .eq('role', 'super_admin')
            .in('user_id', userIds);
          return { data: roles, error: null };
        });

      if (altError) {
        throw altError;
      }
    }

    // Get admin user IDs directly from user_roles
    const { data: adminRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin');

    if (roleError) {
      throw roleError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log('⚠️  No admin users found. Creating a new admin user...');
    } else {
      console.log(`📋 Found ${adminRoles.length} admin user(s)`);
      
      // Get user details before deletion
      for (const role of adminRoles) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(role.user_id);
        if (userData?.user) {
          console.log(`   - ${userData.user.email} (${role.user_id})`);
        }
      }

      // Delete all admin users
      console.log('\n🗑️  Deleting admin users...');
      for (const role of adminRoles) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(role.user_id);
        if (deleteError) {
          console.error(`   ❌ Failed to delete user ${role.user_id}:`, deleteError.message);
        } else {
          console.log(`   ✅ Deleted user ${role.user_id}`);
        }
      }
    }

    // Generate new admin credentials
    const newEmail = 'admin@reagents.com';
    const newPassword = generateStrongPassword(24);
    const firstName = 'Admin';
    const lastName = 'User';

    console.log('\n➕ Creating new admin user...');
    console.log(`   Email: ${newEmail}`);
    console.log(`   Password: ${newPassword}`);

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
    });

    if (createError) {
      throw createError;
    }

    if (!user) {
      throw new Error('Failed to create user');
    }

    console.log(`   ✅ User created: ${user.id}`);

    // Wait a moment for any triggers
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create profile
    console.log('\n📝 Creating profile...');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        status: 'active',
        slug: 'admin-user',
        listing_limit: { type: 'month', value: 999999 },
        subscription_status: 'pro',
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('   ⚠️  Profile creation error (non-fatal):', profileError.message);
    } else {
      console.log('   ✅ Profile created');
    }

    // Create super_admin role
    console.log('\n🔐 Assigning super_admin role...');
    const { error: roleCreateError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role: 'super_admin',
      }, { onConflict: 'user_id,role' });

    if (roleCreateError) {
      throw roleCreateError;
    }

    console.log('   ✅ Role assigned');

    console.log('\n✅ Admin user reset completed successfully!');
    console.log('\n📋 New Admin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email:    ${newEmail}`);
    console.log(`   Password: ${newPassword}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Save this password securely!');
    console.log('   You will not be able to retrieve it later.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.details) {
      console.error('   Details:', error.details);
    }
    process.exit(1);
  }
}

resetAdmin();

