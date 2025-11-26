-- ========================================
-- PostgreSQL Row-Level Security (RLS) Migration
-- Implements database-level tenant isolation
-- ========================================

-- ========================================
-- 1. CREATE APPLICATION DATABASE ROLE
-- ========================================

-- Create dedicated application role with limited privileges
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hse_app_role') THEN
        CREATE ROLE hse_app_role WITH LOGIN PASSWORD 'change_me_in_production';
    END IF;
END
$$;

-- Grant connection to database
GRANT CONNECT ON DATABASE hse_platform TO hse_app_role;

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO hse_app_role;

-- Grant table permissions (SELECT, INSERT, UPDATE, DELETE)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hse_app_role;

-- Grant sequence permissions for auto-increment fields
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hse_app_role;

-- Ensure future tables also get these permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hse_app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO hse_app_role;

-- ========================================
-- 2. CREATE ADMIN BYPASS ROLE
-- ========================================

-- Create admin role that can bypass RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hse_admin_role') THEN
        CREATE ROLE hse_admin_role WITH LOGIN PASSWORD 'change_me_in_production_admin';
    END IF;
END
$$;

-- Grant superuser-like privileges to admin role
GRANT CONNECT ON DATABASE hse_platform TO hse_admin_role;
GRANT USAGE ON SCHEMA public TO hse_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hse_admin_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hse_admin_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hse_admin_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO hse_admin_role;

-- Grant BYPASSRLS privilege to admin role
ALTER ROLE hse_admin_role BYPASSRLS;

-- ========================================
-- 3. CONFIGURE SESSION VARIABLE FOR TENANT CONTEXT
-- ========================================

-- Session variable: app.current_organization_id
-- Application must set this at connection time:
-- SET LOCAL app.current_organization_id = '<organization_id>';

-- Helper function to get current organization ID from session
CREATE OR REPLACE FUNCTION get_current_organization_id()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.current_organization_id', TRUE);
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ========================================
-- 4. ENABLE ROW-LEVEL SECURITY ON TENANT-SCOPED TABLES
-- ========================================

-- Enable RLS on users table (tenant-scoped when organizationId is not null)
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on stations table
ALTER TABLE "stations" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on audits table
ALTER TABLE "audits" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on incidents table
ALTER TABLE "incidents" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on contractors table
ALTER TABLE "contractors" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on form_definitions table
ALTER TABLE "form_definitions" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on work_permits table
ALTER TABLE "work_permits" ENABLE ROW LEVEL SECURITY;

-- Note: organizations, roles, permissions, role_permissions, and user_roles tables
-- are NOT tenant-scoped and should not have RLS enabled

-- ========================================
-- 5. CREATE RLS POLICIES FOR USERS TABLE
-- ========================================

-- Policy: Users can only see users in their organization
CREATE POLICY users_tenant_isolation_select ON "users"
    FOR SELECT
    TO hse_app_role
    USING (
        "organizationId" IS NULL -- Global users (admins without org)
        OR "organizationId" = get_current_organization_id()
    );

-- Policy: Users can only insert into their organization
CREATE POLICY users_tenant_isolation_insert ON "users"
    FOR INSERT
    TO hse_app_role
    WITH CHECK (
        "organizationId" IS NULL -- Allow creating global users
        OR "organizationId" = get_current_organization_id()
    );

-- Policy: Users can only update users in their organization
CREATE POLICY users_tenant_isolation_update ON "users"
    FOR UPDATE
    TO hse_app_role
    USING (
        "organizationId" IS NULL
        OR "organizationId" = get_current_organization_id()
    )
    WITH CHECK (
        "organizationId" IS NULL
        OR "organizationId" = get_current_organization_id()
    );

-- Policy: Users can only delete users in their organization
CREATE POLICY users_tenant_isolation_delete ON "users"
    FOR DELETE
    TO hse_app_role
    USING (
        "organizationId" IS NULL
        OR "organizationId" = get_current_organization_id()
    );

-- ========================================
-- 6. CREATE RLS POLICIES FOR STATIONS TABLE
-- ========================================

-- Policy: Stations are scoped to organization
CREATE POLICY stations_tenant_isolation_select ON "stations"
    FOR SELECT
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id());

CREATE POLICY stations_tenant_isolation_insert ON "stations"
    FOR INSERT
    TO hse_app_role
    WITH CHECK ("organizationId" = get_current_organization_id());

CREATE POLICY stations_tenant_isolation_update ON "stations"
    FOR UPDATE
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id())
    WITH CHECK ("organizationId" = get_current_organization_id());

CREATE POLICY stations_tenant_isolation_delete ON "stations"
    FOR DELETE
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id());

-- ========================================
-- 7. CREATE RLS POLICIES FOR AUDITS TABLE
-- ========================================

-- Policy: Audits are scoped to organization
CREATE POLICY audits_tenant_isolation_select ON "audits"
    FOR SELECT
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id());

CREATE POLICY audits_tenant_isolation_insert ON "audits"
    FOR INSERT
    TO hse_app_role
    WITH CHECK ("organizationId" = get_current_organization_id());

CREATE POLICY audits_tenant_isolation_update ON "audits"
    FOR UPDATE
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id())
    WITH CHECK ("organizationId" = get_current_organization_id());

CREATE POLICY audits_tenant_isolation_delete ON "audits"
    FOR DELETE
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id());

-- ========================================
-- 8. CREATE RLS POLICIES FOR INCIDENTS TABLE
-- ========================================

-- Policy: Incidents are scoped to organization
CREATE POLICY incidents_tenant_isolation_select ON "incidents"
    FOR SELECT
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id());

CREATE POLICY incidents_tenant_isolation_insert ON "incidents"
    FOR INSERT
    TO hse_app_role
    WITH CHECK ("organizationId" = get_current_organization_id());

CREATE POLICY incidents_tenant_isolation_update ON "incidents"
    FOR UPDATE
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id())
    WITH CHECK ("organizationId" = get_current_organization_id());

CREATE POLICY incidents_tenant_isolation_delete ON "incidents"
    FOR DELETE
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id());

-- ========================================
-- 9. CREATE RLS POLICIES FOR CONTRACTORS TABLE
-- ========================================

-- Policy: Contractors are scoped to organization
CREATE POLICY contractors_tenant_isolation_select ON "contractors"
    FOR SELECT
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id());

CREATE POLICY contractors_tenant_isolation_insert ON "contractors"
    FOR INSERT
    TO hse_app_role
    WITH CHECK ("organizationId" = get_current_organization_id());

CREATE POLICY contractors_tenant_isolation_update ON "contractors"
    FOR UPDATE
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id())
    WITH CHECK ("organizationId" = get_current_organization_id());

CREATE POLICY contractors_tenant_isolation_delete ON "contractors"
    FOR DELETE
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id());

-- ========================================
-- 10. CREATE RLS POLICIES FOR FORM_DEFINITIONS TABLE
-- ========================================

-- Policy: Form definitions are scoped to organization
CREATE POLICY form_definitions_tenant_isolation_select ON "form_definitions"
    FOR SELECT
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id());

CREATE POLICY form_definitions_tenant_isolation_insert ON "form_definitions"
    FOR INSERT
    TO hse_app_role
    WITH CHECK ("organizationId" = get_current_organization_id());

CREATE POLICY form_definitions_tenant_isolation_update ON "form_definitions"
    FOR UPDATE
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id())
    WITH CHECK ("organizationId" = get_current_organization_id());

CREATE POLICY form_definitions_tenant_isolation_delete ON "form_definitions"
    FOR DELETE
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id());

-- ========================================
-- 11. CREATE RLS POLICIES FOR WORK_PERMITS TABLE
-- ========================================

-- Policy: Work permits are scoped to organization
CREATE POLICY work_permits_tenant_isolation_select ON "work_permits"
    FOR SELECT
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id());

CREATE POLICY work_permits_tenant_isolation_insert ON "work_permits"
    FOR INSERT
    TO hse_app_role
    WITH CHECK ("organizationId" = get_current_organization_id());

CREATE POLICY work_permits_tenant_isolation_update ON "work_permits"
    FOR UPDATE
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id())
    WITH CHECK ("organizationId" = get_current_organization_id());

CREATE POLICY work_permits_tenant_isolation_delete ON "work_permits"
    FOR DELETE
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id());

-- ========================================
-- 12. CREATE INDEXES FOR RLS PERFORMANCE
-- ========================================

-- Ensure organizationId columns are indexed for optimal RLS performance
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON "users"("organizationId");
CREATE INDEX IF NOT EXISTS idx_stations_organization_id ON "stations"("organizationId");
CREATE INDEX IF NOT EXISTS idx_audits_organization_id ON "audits"("organizationId");
CREATE INDEX IF NOT EXISTS idx_incidents_organization_id ON "incidents"("organizationId");
CREATE INDEX IF NOT EXISTS idx_contractors_organization_id ON "contractors"("organizationId");
CREATE INDEX IF NOT EXISTS idx_form_definitions_organization_id ON "form_definitions"("organizationId");
CREATE INDEX IF NOT EXISTS idx_work_permits_organization_id ON "work_permits"("organizationId");

-- ========================================
-- 13. GRANT PERMISSIONS ON HELPER FUNCTION
-- ========================================

GRANT EXECUTE ON FUNCTION get_current_organization_id() TO hse_app_role;
GRANT EXECUTE ON FUNCTION get_current_organization_id() TO hse_admin_role;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

-- To use RLS in application:
-- 1. Connect using hse_app_role credentials
-- 2. At the start of each transaction/request, execute:
--    SET LOCAL app.current_organization_id = '<tenant_org_id>';
-- 3. All queries will automatically be filtered by organizationId
--
-- Admin bypass:
-- - Connect using hse_admin_role to bypass all RLS policies
--
-- Testing:
-- - See test_rls.sql for comprehensive RLS test scenarios
