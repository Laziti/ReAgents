-- ============================================================================
-- ReAgents Database Functions
-- ============================================================================
-- This file contains all database functions (triggers, RPCs, etc.)
-- ============================================================================

-- ============================================================================
-- 1. TRIGGER FUNCTION: Handle New User
-- ============================================================================
-- Automatically creates a profile and assigns agent role when a new user signs up
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
    -- Only handle non-admin created users
    IF NEW.raw_user_meta_data->>'created_by_admin' IS NULL THEN
        -- Insert a row into public.profiles with default status and other fields
        -- Include user_id which is required (NOT NULL constraint)
        -- Use ON CONFLICT to prevent duplicate profile creation
        INSERT INTO public.profiles (
            id,
            user_id,
            status, 
            first_name, 
            last_name,
            phone_number,
            career,
            listing_limit
        )
        VALUES (
            NEW.id,
            NEW.id,
            'active',
            NEW.raw_user_meta_data->>'first_name',
            NEW.raw_user_meta_data->>'last_name',
            NEW.raw_user_meta_data->>'phone_number',
            NEW.raw_user_meta_data->>'career',
            '{"type": "month", "value": 10}'::jsonb
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- By default, assign 'agent' role to new users
        -- Use ON CONFLICT to prevent duplicate role creation
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'agent')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. FUNCTION: Generate Unique Slug
-- ============================================================================
-- Generates a unique slug from first name and last name
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_unique_slug(
    first_name TEXT,
    last_name TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
    existing_count INTEGER;
BEGIN
    -- Create base slug from name
    base_slug := LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                CONCAT(first_name, '-', last_name),
                '[^a-zA-Z0-9\-]', '', 'g'
            ),
            '\-{2,}', '-', 'g'
        )
    );
    
    -- Initially try with the base slug
    final_slug := base_slug;
    
    -- Check if slug already exists
    LOOP
        SELECT COUNT(*)
        INTO existing_count
        FROM public.profiles
        WHERE slug = final_slug;
        
        IF existing_count = 0 THEN
            -- No conflict, we can use this slug
            RETURN final_slug;
        END IF;
        
        -- Increment counter and try again
        counter := counter + 1;
        final_slug := base_slug || '-' || counter::TEXT;
    END LOOP;
END;
$$;

-- ============================================================================
-- 3. FUNCTION: Get Auth Users Data
-- ============================================================================
-- Returns user ID and email from auth.users (for admin functions)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_auth_users_data()
RETURNS TABLE (
    id UUID,
    email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO auth, public
AS $$
BEGIN
    -- Only allow super admins to call this function
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Super admin role required.';
    END IF;

    RETURN QUERY
    SELECT 
        au.id,
        au.email::TEXT
    FROM auth.users au;
END;
$$;

-- ============================================================================
-- 4. FUNCTION: Has Role
-- ============================================================================
-- Checks if a user has a specific role
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_role(
    _user_id UUID,
    _role app_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    );
END;
$$;

-- ============================================================================
-- 5. FUNCTION: Increment Listing Views
-- ============================================================================
-- Increments the view count for a listing
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_listing_views(listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
    UPDATE public.listings
    SET views = COALESCE(views, 0) + 1
    WHERE id = listing_id;
END;
$$;

-- ============================================================================
-- 6. FUNCTION: Set Listing Expiration
-- ============================================================================
-- Sets expiration date to 2 months from creation (can be called from application)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_listing_expiration(listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
    UPDATE public.listings
    SET expires_at = created_at + INTERVAL '2 months'
    WHERE id = listing_id
    AND expires_at IS NULL;
END;
$$;

-- ============================================================================
-- 7. TRIGGER: Auto-set Listing Expiration on Insert
-- ============================================================================
-- Automatically sets expiration date to 2 months from creation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_set_listing_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set expiration to 2 months from creation if not already set
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at := NEW.created_at + INTERVAL '2 months';
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS set_listing_expiration_on_insert ON public.listings;
CREATE TRIGGER set_listing_expiration_on_insert
    BEFORE INSERT ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_set_listing_expiration();

