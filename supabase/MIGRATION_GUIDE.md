# Migration Guide

## Migration Files Organization

The database setup is organized into three main migration files that should be run in order:

### 1. `0001_initial_schema.sql`
**Purpose:** Creates the complete database schema

**Contains:**
- Extensions (uuid-ossp, moddatetime)
- Enums (app_role, subscription_request_status)
- Tables (profiles, listings, user_roles, subscription_requests)
- Row Level Security (RLS) policies
- Storage buckets and policies
- Triggers for updated_at timestamps
- Table comments

**Run first:** This establishes the foundation of the database.

### 2. `0002_functions.sql`
**Purpose:** Creates all database functions and triggers

**Contains:**
- `handle_new_user()` - Trigger function for new user signup
- `generate_unique_slug()` - Generates unique slugs for profiles
- `get_auth_users_data()` - RPC function for admin access to user emails
- `has_role()` - Checks if user has a specific role
- `increment_listing_views()` - Tracks listing view counts
- `set_listing_expiration()` - Sets listing expiration dates
- `auto_set_listing_expiration()` - Trigger function for automatic expiration
- Triggers that call these functions

**Run second:** Functions depend on tables existing.

### 3. `0003_indexes.sql`
**Purpose:** Creates performance indexes

**Contains:**
- Indexes for listings table (user_id, status, created_at, expires_at, city, progress_status, views)
- Indexes for profiles table (slug, status, subscription_status, created_at)
- Indexes for subscription_requests table (user_id, status, created_at)
- Indexes for user_roles table (user_id, role)
- Composite indexes for common query patterns
- Table analysis for query optimization

**Run third:** Indexes are created after tables and data exist.

## Legacy Files

The following files are kept for reference but are now included in the new migration files:

- `20240318000000_create_subscription_requests.sql` - Included in `0001_initial_schema.sql`
- `20240319000000_alter_subscription_requests.sql` - Included in `0001_initial_schema.sql`
- `add_listing_progress_fields.sql` - Included in `0001_initial_schema.sql`
- `optimize_database_performance.sql` - Included in `0003_indexes.sql`
- `functions/handle_new_user.sql` - Included in `0002_functions.sql`
- `functions/generate_unique_slug.sql` - Included in `0002_functions.sql`

## Running Migrations

### For New Projects

Run all three migration files in order:
1. `0001_initial_schema.sql`
2. `0002_functions.sql`
3. `0003_indexes.sql`

### For Existing Projects

If you're updating an existing database:

1. **Check what already exists:**
   ```sql
   -- Check tables
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   
   -- Check functions
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public';
   
   -- Check indexes
   SELECT indexname FROM pg_indexes 
   WHERE schemaname = 'public';
   ```

2. **Run migrations:**
   - The migrations use `IF NOT EXISTS` and `CREATE OR REPLACE` to handle existing objects
   - You can safely run them multiple times
   - Existing data will not be affected

3. **Verify:**
   ```sql
   -- Check all tables exist
   SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('profiles', 'listings', 'user_roles', 'subscription_requests');
   
   -- Should return 4
   ```

## Migration Order Matters

**Important:** Always run migrations in this order:
1. Schema (tables, enums, RLS)
2. Functions (depends on tables)
3. Indexes (depends on tables)

Running them out of order may cause errors.

## Troubleshooting

### Migration Fails Partway Through

If a migration fails partway through:

1. **Check the error message** - It will tell you what failed
2. **Fix the issue** - Usually a syntax error or missing dependency
3. **Re-run the migration** - The `IF NOT EXISTS` clauses prevent duplicate creation

### Objects Already Exist

If you see "already exists" errors:

- This is normal if you're re-running migrations
- The migrations handle this with `IF NOT EXISTS` and `CREATE OR REPLACE`
- You can safely ignore these messages

### Missing Dependencies

If you see "relation does not exist" errors:

- Make sure you ran the migrations in order
- Check that previous migrations completed successfully
- Verify tables exist before creating functions that reference them

## Best Practices

1. **Always backup** before running migrations on production
2. **Test migrations** on a development database first
3. **Run migrations in order** - Don't skip steps
4. **Verify after each migration** - Check that objects were created
5. **Document custom changes** - If you modify migrations, document why

## Next Steps

After running all migrations:

1. Create a super admin user (see SETUP_INSTRUCTIONS.md)
2. Configure Edge Functions (see R2-SETUP.md)
3. Test user signup and listing creation
4. Verify RLS policies are working correctly

