-- Migration: Cleanup users table after verifying user_tenants migration
-- Run this ONLY after verifying 001_user_multi_tenant.sql was successful
-- Run this script via SQLTools

-- ============================================================================
-- IMPORTANT: Verify migration first!
-- ============================================================================

-- Run this query first to verify all users have been migrated:
-- SELECT u.id, u.email, u.tenant_id as old_tenant_id, ut.tenant_id as new_tenant_id
-- FROM users u
-- LEFT JOIN user_tenants ut ON u.id = ut.user_id
-- WHERE u.tenant_id IS NOT NULL AND ut.id IS NULL;
-- 
-- If this returns any rows, the migration is incomplete!

-- ============================================================================
-- Step 1: Remove old columns from users table
-- ============================================================================

-- Remove the foreign key constraint first
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_id_fkey;

-- Remove the old columns that are now in user_tenants
ALTER TABLE users DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE users DROP COLUMN IF EXISTS erp_username;
ALTER TABLE users DROP COLUMN IF EXISTS erp_password_or_token;

-- ============================================================================
-- Verification
-- ============================================================================

-- Check the updated users table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'users'
-- ORDER BY ordinal_position;
