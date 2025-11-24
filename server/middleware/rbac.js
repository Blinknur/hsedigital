import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userRoles = await prisma.userRole.findMany({
        where: { userId: req.user.id },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      });

      const hasPermission = userRoles.some(userRole =>
        userRole.role.permissions.some(rp =>
          rp.permission.resource === resource && rp.permission.action === action
        )
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Access denied', 
          required: { resource, action }
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

export const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userRoles = await prisma.userRole.findMany({
        where: { userId: req.user.id },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      });

      const hasAnyPermission = permissions.some(({ resource, action }) =>
        userRoles.some(userRole =>
          userRole.role.permissions.some(rp =>
            rp.permission.resource === resource && rp.permission.action === action
          )
        )
      );

      if (!hasAnyPermission) {
        return res.status(403).json({ 
          error: 'Access denied', 
          required: permissions
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

export const requireAllPermissions = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userRoles = await prisma.userRole.findMany({
        where: { userId: req.user.id },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      });

      const userPermissions = userRoles.flatMap(userRole =>
        userRole.role.permissions.map(rp => ({
          resource: rp.permission.resource,
          action: rp.permission.action
        }))
      );

      const hasAllPermissions = permissions.every(({ resource, action }) =>
        userPermissions.some(p => p.resource === resource && p.action === action)
      );

      if (!hasAllPermissions) {
        return res.status(403).json({ 
          error: 'Access denied', 
          required: permissions
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

export const requireRole = (roleName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userRole = await prisma.userRole.findFirst({
        where: {
          userId: req.user.id,
          role: {
            name: roleName
          }
        }
      });

      if (!userRole) {
        return res.status(403).json({ 
          error: 'Access denied', 
          required: { role: roleName }
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({ error: 'Role check failed' });
    }
  };
};

export const getUserPermissions = async (userId) => {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  });

  const permissions = userRoles.flatMap(userRole =>
    userRole.role.permissions.map(rp => ({
      resource: rp.permission.resource,
      action: rp.permission.action,
      description: rp.permission.description
    }))
  );

  const uniquePermissions = Array.from(
    new Map(permissions.map(p => [`${p.resource}:${p.action}`, p])).values()
  );

  return uniquePermissions;
};

export const getUserRoles = async (userId) => {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: true
    }
  });

  return userRoles.map(ur => ({
    id: ur.role.id,
    name: ur.role.name,
    description: ur.role.description,
    isSystem: ur.role.isSystem
  }));
};
