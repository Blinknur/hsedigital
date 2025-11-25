import { PrismaClient } from '@prisma/client';
import { cacheManager } from '../utils/cache.js';
import { buildCursorPagination, formatCursorResponse } from '../utils/pagination.js';
import { getTenantById, batchGetTenants, invalidateTenantCache } from '../services/tenantService.js';

const prisma = new PrismaClient();

export const cacheUsageExamples = {
  simpleCache: async () => {
    const key = cacheManager.generateKey('stations', 'all');
    const cached = await cacheManager.get(key);
    
    if (cached) {
      return cached;
    }
    
    const stations = await prisma.station.findMany();
    await cacheManager.set(key, stations, 300);
    return stations;
  },

  getOrFetchPattern: async () => {
    const key = cacheManager.generateKey('contractors', 'active');
    
    return cacheManager.getOrFetch(key, async () => {
      return await prisma.contractor.findMany({
        where: { status: 'Active' },
        orderBy: { name: 'asc' }
      });
    }, 600);
  },

  tenantCaching: async (tenantId) => {
    const key = cacheManager.getTenantKey(tenantId, 'stations', 'all');
    
    return cacheManager.getOrFetch(key, async () => {
      return await prisma.station.findMany({
        where: { organizationId: tenantId, isActive: true },
        orderBy: { name: 'asc' }
      });
    }, 600);
  },

  batchTenantFetch: async (tenantIds) => {
    return await batchGetTenants(tenantIds);
  },

  invalidateOnWrite: async (tenantId, stationData) => {
    const station = await prisma.station.create({
      data: {
        ...stationData,
        organizationId: tenantId
      }
    });
    
    await cacheManager.invalidateTenantCache(tenantId, 'stations');
    
    return station;
  }
};

export const paginationExamples = {
  cursorPagination: async (req) => {
    const { cursor, limit = 50, stationId } = req.query;
    const where = { organizationId: req.tenantId };
    
    if (stationId) where.stationId = stationId;

    const paginationOptions = buildCursorPagination({
      cursor,
      limit,
      orderBy: { reportedAt: 'desc' },
      cursorField: 'id'
    });

    const incidents = await prisma.incident.findMany({
      where,
      ...paginationOptions,
      include: {
        station: {
          select: { id: true, name: true, region: true }
        },
        reporter: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return formatCursorResponse(incidents, limit, 'id');
  },

  cachedCursorPagination: async (req) => {
    const { cursor, limit = 50, stationId } = req.query;
    const tenantId = req.tenantId;
    
    const cacheKey = cacheManager.getTenantKey(
      tenantId,
      'incidents',
      `cursor:${cursor || 'first'}:limit:${limit}:station:${stationId || 'all'}`
    );

    return cacheManager.getOrFetch(cacheKey, async () => {
      const where = { organizationId: tenantId };
      if (stationId) where.stationId = stationId;

      const paginationOptions = buildCursorPagination({
        cursor,
        limit,
        orderBy: { reportedAt: 'desc' },
        cursorField: 'id'
      });

      const incidents = await prisma.incident.findMany({
        where,
        ...paginationOptions,
        include: {
          station: { select: { id: true, name: true, region: true } },
          reporter: { select: { id: true, name: true, email: true } }
        }
      });

      return formatCursorResponse(incidents, limit, 'id');
    }, 180);
  }
};

export const nPlusOneEliminationExamples = {
  bad: async (tenantId) => {
    const audits = await prisma.audit.findMany({
      where: { organizationId: tenantId }
    });
    
    for (const audit of audits) {
      audit.station = await prisma.station.findUnique({
        where: { id: audit.stationId }
      });
      audit.auditor = await prisma.user.findUnique({
        where: { id: audit.auditorId }
      });
    }
    
    return audits;
  },

  good: async (tenantId) => {
    return await prisma.audit.findMany({
      where: { organizationId: tenantId },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            region: true,
            brand: true
          }
        },
        auditor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }
};

export const optimizedEndpointExample = async (req, res) => {
  try {
    const { cursor, limit = 50, stationId, status } = req.query;
    const tenantId = req.tenantId;

    const cacheKey = cacheManager.getTenantKey(
      tenantId,
      'audits',
      `cursor:${cursor || 'first'}:limit:${limit}:station:${stationId || 'all'}:status:${status || 'all'}`
    );

    const result = await cacheManager.getOrFetch(cacheKey, async () => {
      const where = { organizationId: tenantId };
      if (stationId) where.stationId = stationId;
      if (status) where.status = status;

      const paginationOptions = buildCursorPagination({
        cursor,
        limit,
        orderBy: { scheduledDate: 'desc' },
        cursorField: 'id'
      });

      const audits = await prisma.audit.findMany({
        where,
        ...paginationOptions,
        include: {
          station: {
            select: {
              id: true,
              name: true,
              region: true,
              brand: true
            }
          },
          auditor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return formatCursorResponse(audits, limit, 'id');
    }, 300);

    res.json({ audits: result.data, pagination: result.pagination });
  } catch (error) {
    console.error('Error fetching audits:', error);
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
};
