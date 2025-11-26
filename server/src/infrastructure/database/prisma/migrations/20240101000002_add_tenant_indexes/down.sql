-- Rollback tenant-scoped indexes

-- Work Permits table indexes
DROP INDEX IF EXISTS "work_permits_requestedBy_idx";
DROP INDEX IF EXISTS "work_permits_stationId_idx";
DROP INDEX IF EXISTS "work_permits_organizationId_idx";

-- Incidents table indexes
DROP INDEX IF EXISTS "incidents_reporterId_idx";
DROP INDEX IF EXISTS "incidents_stationId_idx";
DROP INDEX IF EXISTS "incidents_organizationId_idx";

-- Form Definitions table indexes
DROP INDEX IF EXISTS "form_definitions_organizationId_idx";

-- Audits table indexes
DROP INDEX IF EXISTS "audits_auditorId_idx";
DROP INDEX IF EXISTS "audits_stationId_idx";
DROP INDEX IF EXISTS "audits_organizationId_idx";

-- Contractors table indexes
DROP INDEX IF EXISTS "contractors_organizationId_idx";

-- Stations table indexes
DROP INDEX IF EXISTS "stations_organizationId_idx";

-- Users table indexes
DROP INDEX IF EXISTS "users_organizationId_idx";
