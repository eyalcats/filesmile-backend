-- Migration: Add support for users connected to multiple tenants
-- Each user can have different ERP credentials per tenant (e.g., test vs prod server)
-- Run this script via SQLTools

-- ============================================================================
-- Step 1: Create the new user_tenants junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_tenants (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- ERP credentials specific to this user-tenant combination
    erp_username VARCHAR(255),           -- Encrypted
    erp_password_or_token TEXT,          -- Encrypted
    
    -- Status for this specific user-tenant association
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one entry per user-tenant pair
    CONSTRAINT uq_user_tenant_pair UNIQUE (user_id, tenant_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_is_active ON user_tenants(is_active);

-- ============================================================================
-- Step 2: Migrate existing user-tenant relationships
-- ============================================================================

-- Copy existing user-tenant associations to the new junction table
INSERT INTO user_tenants (user_id, tenant_id, erp_username, erp_password_or_token, is_active, created_at, updated_at)
SELECT 
    id as user_id,
    tenant_id,
    erp_username,
    erp_password_or_token,
    is_active,
    created_at,
    updated_at
FROM users
WHERE tenant_id IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- ============================================================================
-- Step 3: Remove old columns from users table (run after verifying migration)
-- ============================================================================

-- IMPORTANT: Only run these after verifying the migration was successful!
-- You may want to run these in a separate script after testing.

-- Remove the old tenant_id foreign key and ERP credential columns
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_id_fkey;
-- ALTER TABLE users DROP COLUMN IF EXISTS tenant_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS erp_username;
-- ALTER TABLE users DROP COLUMN IF EXISTS erp_password_or_token;

-- ============================================================================
-- Verification queries (run these to verify the migration)
-- ============================================================================

-- Check the new table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_tenants';

-- Verify data was migrated
-- SELECT u.email, ut.tenant_id, t.name as tenant_name, ut.is_active
-- FROM users u
-- JOIN user_tenants ut ON u.id = ut.user_id
-- JOIN tenants t ON ut.tenant_id = t.id;

-- Count migrated records
-- SELECT COUNT(*) as migrated_count FROM user_tenants;
