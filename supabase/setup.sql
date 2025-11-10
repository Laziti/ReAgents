-- ============================================================================
-- ReAgents - Complete Database Setup
-- ============================================================================
-- This is a complete setup file that will create all necessary database
-- objects for the ReAgents application.
--
-- USAGE:
-- 1. Open your Supabase project SQL Editor
-- 2. Copy and paste this entire file
-- 3. Run it to set up the complete database schema
--
-- NOTE: This file combines all migrations into one for easy setup.
-- For incremental migrations, use the individual files in the migrations folder.
-- ============================================================================

-- Run migrations in order
\i migrations/0001_initial_schema.sql
\i migrations/0002_functions.sql
\i migrations/0003_indexes.sql

-- If the above doesn't work in Supabase SQL Editor, use the files directly:
-- 1. Run 0001_initial_schema.sql first
-- 2. Run 0002_functions.sql second
-- 3. Run 0003_indexes.sql third

