-- ========================================
-- RLS Testing Script
-- Tests Row-Level Security policies for tenant isolation
-- ========================================

-- ========================================
-- TEST SETUP
-- ========================================

-- Create test organizations
INSERT INTO "organizations" (id, name, "ownerId", "subscriptionPlan", "createdAt", "updatedAt")
VALUES 
    ('test-org-1', 'Test Organization 1', 'owner-1', 'pro', NOW(), NOW()),
    ('test-org-2', 'Test Organization 2', 'owner-2', 'enterprise', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test users
INSERT INTO "users" (id, name, email, password, role, "organizationId", "createdAt", "updatedAt")
VALUES 
    ('user-org-1', 'User Org 1', 'user1@org1.com', 'hash1', 'Station Manager', 'test-org-1', NOW(), NOW()),
    ('user-org-2', 'User Org 2', 'user2@org2.com', 'hash2', 'Station Manager', 'test-org-2', NOW(), NOW()),
    ('admin-user', 'Admin User', 'admin@hse.com', 'hash3', 'Admin', NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test stations
INSERT INTO "stations" (id, "organizationId", name, brand, region, address, location, "createdAt", "updatedAt")
VALUES 
    ('station-org-1-a', 'test-org-1', 'Station 1A', 'Brand X', 'North', '123 Main St', '{"lat": 0, "lng": 0}', NOW(), NOW()),
    ('station-org-1-b', 'test-org-1', 'Station 1B', 'Brand X', 'South', '456 Oak Ave', '{"lat": 0, "lng": 0}', NOW(), NOW()),
    ('station-org-2-a', 'test-org-2', 'Station 2A', 'Brand Y', 'East', '789 Elm St', '{"lat": 0, "lng": 0}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test contractors
INSERT INTO "contractors" (id, "organizationId", name, "licenseNumber", specialization, "contactPerson", email, "createdAt", "updatedAt")
VALUES 
    ('contractor-org-1', 'test-org-1', 'Contractor 1', 'LIC001', 'Safety', 'John Doe', 'john@contractor1.com', NOW(), NOW()),
    ('contractor-org-2', 'test-org-2', 'Contractor 2', 'LIC002', 'Compliance', 'Jane Smith', 'jane@contractor2.com', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- TEST 1: Verify RLS is Enabled
-- ========================================

\echo '\n========================================';
\echo 'TEST 1: Verify RLS is Enabled';
\echo '========================================';

SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'stations', 'audits', 'incidents', 'contractors', 'form_definitions')
ORDER BY tablename;

-- ========================================
-- TEST 2: List All RLS Policies
-- ========================================

\echo '\n========================================';
\echo 'TEST 2: List All RLS Policies';
\echo '========================================';

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd AS operation,
    roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- TEST 3: Test as hse_app_role with Org 1 Context
-- ========================================

\echo '\n========================================';
\echo 'TEST 3: Query as hse_app_role (Organization 1)';
\echo '========================================';

-- Switch to app role
SET ROLE hse_app_role;

-- Set organization context to test-org-1
SET LOCAL app.current_organization_id = 'test-org-1';

\echo '\n--- Users (should see only org 1 users) ---';
SELECT id, name, email, "organizationId" FROM "users" WHERE "organizationId" IS NOT NULL;

\echo '\n--- Stations (should see only org 1 stations) ---';
SELECT id, name, "organizationId" FROM "stations";

\echo '\n--- Contractors (should see only org 1 contractors) ---';
SELECT id, name, "organizationId" FROM "contractors";

-- Reset role
RESET ROLE;

-- ========================================
-- TEST 4: Test as hse_app_role with Org 2 Context
-- ========================================

\echo '\n========================================';
\echo 'TEST 4: Query as hse_app_role (Organization 2)';
\echo '========================================';

-- Switch to app role
SET ROLE hse_app_role;

-- Set organization context to test-org-2
SET LOCAL app.current_organization_id = 'test-org-2';

\echo '\n--- Users (should see only org 2 users) ---';
SELECT id, name, email, "organizationId" FROM "users" WHERE "organizationId" IS NOT NULL;

\echo '\n--- Stations (should see only org 2 stations) ---';
SELECT id, name, "organizationId" FROM "stations";

\echo '\n--- Contractors (should see only org 2 contractors) ---';
SELECT id, name, "organizationId" FROM "contractors";

-- Reset role
RESET ROLE;

-- ========================================
-- TEST 5: Test Insert with Wrong Organization Context
-- ========================================

\echo '\n========================================';
\echo 'TEST 5: Attempt Insert with Wrong Organization';
\echo '========================================';

-- Switch to app role
SET ROLE hse_app_role;

-- Set context to org 1
SET LOCAL app.current_organization_id = 'test-org-1';

\echo '\n--- Attempting to insert station for org 2 (should fail) ---';
-- This should fail due to RLS policy
INSERT INTO "stations" (id, "organizationId", name, brand, region, address, location, "createdAt", "updatedAt")
VALUES ('test-fail-station', 'test-org-2', 'Should Fail', 'Brand', 'Region', 'Address', '{}', NOW(), NOW());

-- Reset role
RESET ROLE;

-- ========================================
-- TEST 6: Test Admin Bypass
-- ========================================

\echo '\n========================================';
\echo 'TEST 6: Test Admin Role (Bypass RLS)';
\echo '========================================';

-- Switch to admin role (has BYPASSRLS)
SET ROLE hse_admin_role;

\echo '\n--- Admin sees ALL stations (no RLS filtering) ---';
SELECT id, name, "organizationId" FROM "stations" ORDER BY "organizationId", name;

\echo '\n--- Admin sees ALL contractors ---';
SELECT id, name, "organizationId" FROM "contractors" ORDER BY "organizationId", name;

-- Reset role
RESET ROLE;

-- ========================================
-- TEST 7: Test Update Operations
-- ========================================

\echo '\n========================================';
\echo 'TEST 7: Test Update Operations with RLS';
\echo '========================================';

-- Switch to app role
SET ROLE hse_app_role;

-- Set context to org 1
SET LOCAL app.current_organization_id = 'test-org-1';

\echo '\n--- Update station in org 1 (should succeed) ---';
UPDATE "stations" 
SET name = 'Station 1A Updated' 
WHERE id = 'station-org-1-a';

\echo '\n--- Attempt to update station in org 2 (should fail) ---';
UPDATE "stations" 
SET name = 'Station 2A Updated' 
WHERE id = 'station-org-2-a';

\echo '\n--- Verify only org 1 station was updated ---';
SELECT id, name, "organizationId" 
FROM "stations" 
WHERE id IN ('station-org-1-a', 'station-org-2-a')
ORDER BY id;

-- Reset role
RESET ROLE;

-- ========================================
-- TEST 8: Test Delete Operations
-- ========================================

\echo '\n========================================';
\echo 'TEST 8: Test Delete Operations with RLS';
\echo '========================================';

-- Create test records to delete
INSERT INTO "contractors" (id, "organizationId", name, "licenseNumber", specialization, "contactPerson", email, "createdAt", "updatedAt")
VALUES 
    ('delete-test-org-1', 'test-org-1', 'Delete Test 1', 'LIC999', 'Test', 'Test', 'test@test.com', NOW(), NOW()),
    ('delete-test-org-2', 'test-org-2', 'Delete Test 2', 'LIC998', 'Test', 'Test', 'test@test.com', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Switch to app role
SET ROLE hse_app_role;

-- Set context to org 1
SET LOCAL app.current_organization_id = 'test-org-1';

\echo '\n--- Attempt to delete contractor from org 1 (should succeed) ---';
DELETE FROM "contractors" WHERE id = 'delete-test-org-1';

\echo '\n--- Attempt to delete contractor from org 2 (should fail) ---';
DELETE FROM "contractors" WHERE id = 'delete-test-org-2';

-- Reset role
RESET ROLE;

\echo '\n--- Verify only org 1 contractor was deleted ---';
SELECT id, name, "organizationId" 
FROM "contractors" 
WHERE id IN ('delete-test-org-1', 'delete-test-org-2');

-- ========================================
-- TEST 9: Test with No Organization Context
-- ========================================

\echo '\n========================================';
\echo 'TEST 9: Query without Organization Context';
\echo '========================================';

-- Switch to app role
SET ROLE hse_app_role;

-- Don't set organization context
\echo '\n--- Query stations without context (should return 0 rows) ---';
SELECT id, name, "organizationId" FROM "stations";

-- Reset role
RESET ROLE;

-- ========================================
-- TEST 10: Performance Test - Verify Index Usage
-- ========================================

\echo '\n========================================';
\echo 'TEST 10: Verify Index Usage for RLS';
\echo '========================================';

-- Check that organizationId indexes exist
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
    AND indexname LIKE '%organization_id%'
ORDER BY tablename;

-- ========================================
-- TEST CLEANUP (Optional)
-- ========================================

\echo '\n========================================';
\echo 'TEST COMPLETE';
\echo '========================================';

-- Reset role to default
RESET ROLE;

-- Note: To clean up test data, uncomment the following:
/*
DELETE FROM "contractors" WHERE id LIKE 'contractor-org-%' OR id LIKE 'delete-test-%';
DELETE FROM "stations" WHERE id LIKE 'station-org-%';
DELETE FROM "users" WHERE id LIKE 'user-org-%' OR id = 'admin-user';
DELETE FROM "organizations" WHERE id LIKE 'test-org-%';
*/
