-- ============================================================================
-- ReAgents Database Indexes
-- ============================================================================
-- This file contains all database indexes for performance optimization
-- ============================================================================

-- ============================================================================
-- INDEXES FOR LISTINGS TABLE
-- ============================================================================

-- Single column indexes
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings (user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_expires_at ON public.listings (expires_at);
CREATE INDEX IF NOT EXISTS idx_listings_city ON public.listings (city);
CREATE INDEX IF NOT EXISTS idx_listings_progress_status ON public.listings (progress_status);
CREATE INDEX IF NOT EXISTS idx_listings_views ON public.listings (views DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_listings_user_status_created ON public.listings (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_expires_status ON public.listings (expires_at, status) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- INDEXES FOR PROFILES TABLE
-- ============================================================================

-- Single column indexes
-- Note: id is already indexed as primary key, no need for additional index
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles (subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);

-- Composite index for profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_status_slug ON public.profiles (status, slug) WHERE status = 'active' AND slug IS NOT NULL;

-- ============================================================================
-- INDEXES FOR SUBSCRIPTION_REQUESTS TABLE
-- ============================================================================

-- Single column indexes
CREATE INDEX IF NOT EXISTS idx_subscription_requests_user_id ON public.subscription_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_status ON public.subscription_requests (status);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_created_at ON public.subscription_requests (created_at DESC);

-- Composite index for subscription requests
CREATE INDEX IF NOT EXISTS idx_subscription_requests_status_created ON public.subscription_requests (status, created_at DESC);

-- ============================================================================
-- INDEXES FOR USER_ROLES TABLE
-- ============================================================================

-- Single column indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role);

-- ============================================================================
-- ANALYZE TABLES
-- ============================================================================
-- Update table statistics for query planner

ANALYZE public.listings;
ANALYZE public.profiles;
ANALYZE public.subscription_requests;
ANALYZE public.user_roles;

