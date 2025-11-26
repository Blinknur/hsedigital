-- Analytics Dashboard Migration Script
-- Run this after updating the Prisma schema

-- Add analytics permissions
INSERT INTO permissions (id, resource, action, description, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'analytics', 'read', 'View analytics and business intelligence dashboards', NOW(), NOW()),
  (gen_random_uuid(), 'analytics', 'write', 'Manage custom dashboard widgets', NOW(), NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- Grant analytics permissions to Admin role
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
SELECT 
  gen_random_uuid(),
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin' 
  AND p.resource = 'analytics'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
  );

-- Grant analytics read permission to General Manager role
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
SELECT 
  gen_random_uuid(),
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'General Manager' 
  AND p.resource = 'analytics'
  AND p.action = 'read'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
  );
