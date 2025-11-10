-- ============================================================================
-- ReAgents Database Schema - Complete Setup
-- ============================================================================
-- This file contains the complete database schema for the ReAgents application.
-- Run this file in your Supabase SQL Editor to set up the database.
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable moddatetime extension for automatic updated_at timestamps
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- ============================================================================
-- 2. ENUMS
-- ============================================================================

-- App role enum
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('super_admin', 'agent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Subscription request status enum
DO $$ BEGIN
    CREATE TYPE subscription_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    career TEXT,
    phone_number TEXT,
    whatsapp_link TEXT,
    telegram_link TEXT,
    avatar_url TEXT,
    payment_receipt_url TEXT,
    status TEXT DEFAULT 'pending_approval',
    slug TEXT UNIQUE,
    listing_limit JSONB DEFAULT '{"type": "month", "value": 10}'::jsonb,
    subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro')),
    subscription_details JSONB DEFAULT NULL,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, role)
);

-- Listings table
CREATE TABLE IF NOT EXISTS public.listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC,
    location TEXT,
    city TEXT,
    main_image_url TEXT,
    additional_image_urls TEXT[],
    phone_number TEXT,
    whatsapp_link TEXT,
    telegram_link TEXT,
    status TEXT DEFAULT 'active',
    progress_status TEXT CHECK (progress_status IN ('excavation', 'on_progress', 'semi_finished', 'fully_finished')),
    down_payment_percent NUMERIC,
    bank_option BOOLEAN DEFAULT false,
    views INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    edit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Subscription requests table
CREATE TABLE IF NOT EXISTS public.subscription_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    receipt_path TEXT NOT NULL,
    status subscription_request_status NOT NULL DEFAULT 'pending',
    amount NUMERIC NOT NULL,
    duration TEXT NOT NULL,
    listings_per_month INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 4. COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.profiles.subscription_status IS 'User subscription status (free or pro)';
COMMENT ON COLUMN public.profiles.subscription_details IS 'Details about the user subscription including plan, duration, limits, etc';
COMMENT ON COLUMN public.profiles.listing_limit IS 'Monthly listing limit configuration including type, value, and reset date';
COMMENT ON COLUMN public.listings.progress_status IS 'Status of the property construction: excavation (ቁፋሮ), on_progress, semi_finished, fully_finished';
COMMENT ON COLUMN public.listings.city IS 'City where the property is located';
COMMENT ON COLUMN public.listings.expires_at IS 'Listing expiration date (2 months after creation)';
COMMENT ON COLUMN public.listings.views IS 'Number of times the listing has been viewed';

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Trigger for updated_at on profiles
CREATE TRIGGER handle_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);

-- Trigger for updated_at on listings
CREATE TRIGGER handle_updated_at_listings
    BEFORE UPDATE ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);

-- Trigger for updated_at on subscription_requests
CREATE TRIGGER handle_updated_at_subscription_requests
    BEFORE UPDATE ON public.subscription_requests
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    TO anon, authenticated
    USING (status = 'active');

-- User roles policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'super_admin'
        )
    );

-- Listings policies
DROP POLICY IF EXISTS "Users can view active listings" ON public.listings;
CREATE POLICY "Users can view active listings"
    ON public.listings FOR SELECT
    TO anon, authenticated
    USING (
        status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
    );

DROP POLICY IF EXISTS "Users can view their own listings" ON public.listings;
CREATE POLICY "Users can view their own listings"
    ON public.listings FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Users can insert their own listings" ON public.listings;
CREATE POLICY "Users can insert their own listings"
    ON public.listings FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own listings" ON public.listings;
CREATE POLICY "Users can update their own listings"
    ON public.listings FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Users can delete their own listings" ON public.listings;
CREATE POLICY "Users can delete their own listings"
    ON public.listings FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'super_admin'
        )
    );

-- Subscription requests policies
DROP POLICY IF EXISTS "Users can view their own subscription requests" ON public.subscription_requests;
CREATE POLICY "Users can view their own subscription requests"
    ON public.subscription_requests FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Users can insert their own subscription requests" ON public.subscription_requests;
CREATE POLICY "Users can insert their own subscription requests"
    ON public.subscription_requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all subscription requests" ON public.subscription_requests;
CREATE POLICY "Admins can manage all subscription requests"
    ON public.subscription_requests FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'super_admin'
        )
    );

-- ============================================================================
-- 8. STORAGE BUCKETS
-- ============================================================================

-- Create receipts bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. STORAGE POLICIES
-- ============================================================================

-- Receipts storage policies
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
CREATE POLICY "Users can upload receipts"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'receipts' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can access receipts" ON storage.objects;
CREATE POLICY "Users can access receipts"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'receipts' 
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_roles.user_id = auth.uid()
                AND user_roles.role = 'super_admin'
            )
        )
    );

