import { buildCursorPagination, formatCursorResponse } from '../../shared/utils/pagination.js';

export const incidentService = {
  async listIncidents(prisma, tenantId, userId, filters = {}) {
    const { stationId, severity, status, cursor, limit = 50 } = filters;

    const where = { organizationId: tenantId };
    if (stationId) where.stationId = stationId;
    if (severity) where.severity = severity;
    if (status) where.status = status;

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
          select: {
            id: true,
            name: true,
            region: true
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return formatCursorResponse(incidents, limit, 'id');
  },

  async getIncidentById(prisma, tenantId, incidentId) {
    const incident = await prisma.incident.findFirst({
      where: {
        id: incidentId,
        organizationId: tenantId
      },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            region: true,
            address: true
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!incident) {
      const error = new Error('Incident not found');
      error.statusCode = 404;
      throw error;
    }

    return incident;
  },

  async createIncident(prisma, tenantId, userId, incidentData) {
    const incident = await prisma.incident.create({
      data: {
        organizationId: tenantId,
        reporterId: userId,
        ...incidentData
      },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            region: true
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return incident;
  },

  async updateIncident(prisma, tenantId, incidentId, updateData) {
    const existingIncident = await prisma.incident.findFirst({
      where: { id: incidentId, organizationId: tenantId }
    });

    if (!existingIncident) {
      const error = new Error('Incident not found');
      error.statusCode = 404;
      throw error;
    }

    await prisma.incident.updateMany({
      where: {
        id: incidentId,
        organizationId: tenantId
      },
      data: updateData
    });

    const updatedIncident = await prisma.incident.findFirst({
      where: { id: incidentId, organizationId: tenantId },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            region: true
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return { incident: updatedIncident, previousIncident: existingIncident };
  },

  async deleteIncident(prisma, tenantId, incidentId) {
    const deleted = await prisma.incident.deleteMany({
      where: {
        id: incidentId,
        organizationId: tenantId
      }
    });

    if (deleted.count === 0) {
      const error = new Error('Incident not found');
      error.statusCode = 404;
      throw error;
    }

    return { message: 'Incident deleted successfully' };
  },
};
