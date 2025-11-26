-- Add indexes on organizationId for all tenant-scoped tables to improve query performance

-- Users table
CREATE INDEX IF NOT EXISTS "users_organizationId_idx" ON "users"("organizationId");

-- Stations table
CREATE INDEX IF NOT EXISTS "stations_organizationId_idx" ON "stations"("organizationId");

-- Contractors table
CREATE INDEX IF NOT EXISTS "contractors_organizationId_idx" ON "contractors"("organizationId");

-- Audits table
CREATE INDEX IF NOT EXISTS "audits_organizationId_idx" ON "audits"("organizationId");
CREATE INDEX IF NOT EXISTS "audits_stationId_idx" ON "audits"("stationId");
CREATE INDEX IF NOT EXISTS "audits_auditorId_idx" ON "audits"("auditorId");

-- Form Definitions table
CREATE INDEX IF NOT EXISTS "form_definitions_organizationId_idx" ON "form_definitions"("organizationId");

-- Incidents table
CREATE INDEX IF NOT EXISTS "incidents_organizationId_idx" ON "incidents"("organizationId");
CREATE INDEX IF NOT EXISTS "incidents_stationId_idx" ON "incidents"("stationId");
CREATE INDEX IF NOT EXISTS "incidents_reporterId_idx" ON "incidents"("reporterId");

-- Work Permits table
CREATE INDEX IF NOT EXISTS "work_permits_organizationId_idx" ON "work_permits"("organizationId");
CREATE INDEX IF NOT EXISTS "work_permits_stationId_idx" ON "work_permits"("stationId");
CREATE INDEX IF NOT EXISTS "work_permits_requestedBy_idx" ON "work_permits"("requestedBy");
