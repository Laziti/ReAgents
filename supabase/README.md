# Supabase Database Setup

This folder contains all SQL files needed to set up the ReAgents database in a new Supabase project.

## Quick Setup

**📖 For detailed step-by-step instructions, see [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)**

### Option 1: Complete Setup (Recommended for New Projects)

1. Open your Supabase project SQL Editor
2. Copy and paste the contents of `migrations/0001_initial_schema.sql`
3. Run it
4. Copy and paste the contents of `migrations/0002_functions.sql`
5. Run it
6. Copy and paste the contents of `migrations/0003_indexes.sql`
7. Run it
8. Create a super admin user (see SETUP_INSTRUCTIONS.md)

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Run all migrations
supabase db push
```

## File Structure

```
supabase/
├── migrations/
│   ├── 0001_initial_schema.sql    # Complete database schema (tables, RLS, storage)
│   ├── 0002_functions.sql          # Database functions and triggers
│   ├── 0003_indexes.sql            # Performance indexes
│   ├── 20240318000000_create_subscription_requests.sql  # (Legacy - included in 0001)
│   ├── 20240319000000_alter_subscription_requests.sql   # (Legacy - included in 0001)
│   ├── add_listing_progress_fields.sql                  # (Legacy - included in 0001)
│   └── optimize_database_performance.sql                # (Legacy - included in 0003)
├── functions/
│   ├── handle_new_user.sql         # (Legacy - included in 0002)
│   ├── generate_unique_slug.sql    # (Legacy - included in 0002)
│   ├── create-user/                # Edge function for user creation
│   └── upload-to-r2/               # Edge function for R2 uploads
└── README.md                        # This file
```

## Migration Files

### 0001_initial_schema.sql
- Creates all database tables (profiles, listings, user_roles, subscription_requests)
- Sets up enums (app_role, subscription_request_status)
- Configures Row Level Security (RLS) policies
- Creates storage buckets and policies
- Sets up triggers for updated_at timestamps

### 0002_functions.sql
- Creates trigger function for new user signup (handle_new_user)
- Creates function to generate unique slugs (generate_unique_slug)
- Creates RPC function to get auth users data (get_auth_users_data)
- Creates function to check user roles (has_role)
- Creates function to increment listing views (increment_listing_views)
- Creates function to set listing expiration (set_listing_expiration)

### 0003_indexes.sql
- Creates indexes for all frequently queried columns
- Creates composite indexes for common query patterns
- Analyzes tables for query optimization

## Database Schema

### Tables

1. **profiles** - User profiles with subscription information
2. **listings** - Property listings
3. **user_roles** - User role assignments (super_admin, agent)
4. **subscription_requests** - Subscription upgrade requests

### Enums

1. **app_role** - User roles: 'super_admin', 'agent'
2. **subscription_request_status** - Request status: 'pending', 'approved', 'rejected'

### Functions

1. **handle_new_user()** - Trigger function that creates profile and assigns role on signup
2. **generate_unique_slug(first_name, last_name)** - Generates unique slug from name
3. **get_auth_users_data()** - Returns user IDs and emails (admin only)
4. **has_role(_user_id, _role)** - Checks if user has specific role
5. **increment_listing_views(listing_id)** - Increments view count for listing
6. **set_listing_expiration(listing_id)** - Sets expiration date for listing

### Storage Buckets

1. **receipts** - Storage for payment receipts (public bucket)

## Security

All tables have Row Level Security (RLS) enabled with appropriate policies:

- Users can view/update their own data
- Admins can view/update all data
- Public listings are viewable by everyone
- Storage policies restrict access to user's own files

## After Setup

1. **Create a super admin user:**
   ```sql
   -- Replace 'user-id-here' with the actual user ID from auth.users
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('user-id-here', 'super_admin');
   ```

2. **Configure Edge Functions:**
   - Set up R2 secrets in Supabase Dashboard → Project Settings → Edge Functions → Secrets
   - See `R2-SETUP.md` for detailed instructions

3. **Test the setup:**
   - Create a test user account
   - Verify profile is created automatically
   - Verify role is assigned automatically
   - Test listing creation
   - Test subscription request creation

## Troubleshooting

### Issue: "relation already exists"
- Some tables or functions may already exist
- The migrations use `IF NOT EXISTS` and `CREATE OR REPLACE` to handle this
- You can safely run the migrations multiple times

### Issue: "permission denied"
- Make sure you're running the SQL as a database superuser
- In Supabase, use the SQL Editor (which runs with appropriate permissions)

### Issue: "trigger already exists"
- Drop the existing trigger first:
  ```sql
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  ```
- Then run the migration again

## Legacy Files

The following files are kept for reference but are now included in the new migration files:
- `20240318000000_create_subscription_requests.sql`
- `20240319000000_alter_subscription_requests.sql`
- `add_listing_progress_fields.sql`
- `optimize_database_performance.sql`
- `functions/handle_new_user.sql`
- `functions/generate_unique_slug.sql`

## Support

For issues or questions:
1. Check the migration files for comments
2. Review the RLS policies
3. Check Supabase logs for errors
4. Verify all extensions are enabled

