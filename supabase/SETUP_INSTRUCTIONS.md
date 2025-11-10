# Supabase Database Setup Instructions

## Quick Start

Follow these steps to set up the ReAgents database in a new Supabase project:

### Step 1: Open SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run Migration Files (In Order)

Run these files **one by one** in the SQL Editor:

#### 1. Initial Schema (`0001_initial_schema.sql`)
- Creates all tables, enums, RLS policies, and storage buckets
- **Copy the entire contents** of `supabase/migrations/0001_initial_schema.sql`
- Paste into SQL Editor and click **Run**

#### 2. Functions (`0002_functions.sql`)
- Creates all database functions and triggers
- **Copy the entire contents** of `supabase/migrations/0002_functions.sql`
- Paste into SQL Editor and click **Run**

#### 3. Indexes (`0003_indexes.sql`)
- Creates performance indexes
- **Copy the entire contents** of `supabase/migrations/0003_indexes.sql`
- Paste into SQL Editor and click **Run**

### Step 3: Create Super Admin User

After running the migrations, create your first super admin user:

```sql
-- Replace 'your-user-id-here' with the actual UUID from auth.users table
-- You can find this in Authentication → Users → Copy the user ID

INSERT INTO public.user_roles (user_id, role)
VALUES ('your-user-id-here', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

To find your user ID:
1. Go to **Authentication** → **Users** in Supabase dashboard
2. Click on your user
3. Copy the **User UID**
4. Replace `'your-user-id-here'` in the SQL above

### Step 4: Verify Setup

Run these queries to verify everything is set up correctly:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Check your role
SELECT role 
FROM public.user_roles 
WHERE user_id = auth.uid();
```

### Step 5: Configure Edge Functions

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add the following secrets (see `R2-SETUP.md` for details):
   - `R2_ENDPOINT`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET`
   - `R2_PUBLIC_URL`

## Troubleshooting

### Error: "relation already exists"
- Some objects may already exist
- The migrations use `IF NOT EXISTS` and `CREATE OR REPLACE` to handle this
- You can safely run migrations multiple times

### Error: "permission denied"
- Make sure you're using the SQL Editor (which has proper permissions)
- Check that you're logged into the correct Supabase project

### Error: "extension already exists"
- This is normal if extensions are already enabled
- The migrations handle this with `IF NOT EXISTS`

### Trigger not working
- Verify the trigger exists:
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
  ```
- If it doesn't exist, re-run `0002_functions.sql`

## What Gets Created

### Tables
- `profiles` - User profiles
- `listings` - Property listings
- `user_roles` - User role assignments
- `subscription_requests` - Subscription upgrade requests

### Functions
- `handle_new_user()` - Auto-creates profile on signup
- `generate_unique_slug()` - Generates unique slugs
- `get_auth_users_data()` - Gets user emails (admin only)
- `has_role()` - Checks user roles
- `increment_listing_views()` - Tracks listing views
- `set_listing_expiration()` - Sets listing expiration
- `auto_set_listing_expiration()` - Auto-sets expiration on insert

### Triggers
- `on_auth_user_created` - Creates profile when user signs up
- `set_listing_expiration_on_insert` - Sets expiration when listing is created
- `handle_updated_at_*` - Updates `updated_at` timestamps

### Storage
- `receipts` bucket - For payment receipts

## Next Steps

1. **Test user signup:**
   - Create a test user account
   - Verify profile is created automatically
   - Verify role is assigned automatically

2. **Test listing creation:**
   - Create a test listing
   - Verify expiration is set to 2 months from creation

3. **Configure application:**
   - Update `.env.local` with your Supabase credentials
   - Set up Edge Functions (see `R2-SETUP.md`)
   - Test the application

## Support

If you encounter issues:
1. Check the migration files for comments
2. Review Supabase logs
3. Verify all steps were completed
4. Check RLS policies are correct

