import { buildCursorPagination, formatCursorResponse } from '../../shared/utils/pagination.js';

export const auditService = {
  async listAudits(prisma, tenantId, filters = {}) {
    const { stationId, auditorId, status, cursor, limit = 50 } = filters;

    const where = { organizationId: tenantId };
    if (stationId) where.stationId = stationId;
    if (auditorId) where.auditorId = auditorId;
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
  },

  async getAuditById(prisma, tenantId, auditId) {
    const audit = await prisma.audit.findFirst({
      where: {
        id: auditId,
        organizationId: tenantId
      },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            region: true,
            brand: true,
            address: true
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

    if (!audit) {
      const error = new Error('Audit not found');
      error.statusCode = 404;
      throw error;
    }

    return audit;
  },

  async createAudit(prisma, tenantId, auditData) {
    const audit = await prisma.audit.create({
      data: {
        organizationId: tenantId,
        ...auditData,
        scheduledDate: new Date(auditData.scheduledDate),
        completedDate: auditData.completedDate ? new Date(auditData.completedDate) : null,
        auditNumber: `AUD-${Date.now()}`
      },
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

    return audit;
  },

  async updateAudit(prisma, tenantId, auditId, updateData) {
    const existingAudit = await prisma.audit.findFirst({
      where: { id: auditId, organizationId: tenantId }
    });

    if (!existingAudit) {
      const error = new Error('Audit not found');
      error.statusCode = 404;
      throw error;
    }

    const dataToUpdate = { ...updateData };
    if (dataToUpdate.scheduledDate) {
      dataToUpdate.scheduledDate = new Date(dataToUpdate.scheduledDate);
    }
    if (dataToUpdate.completedDate) {
      dataToUpdate.completedDate = new Date(dataToUpdate.completedDate);
    }

    await prisma.audit.updateMany({
      where: {
        id: auditId,
        organizationId: tenantId
      },
      data: dataToUpdate
    });

    const updatedAudit = await prisma.audit.findFirst({
      where: { id: auditId, organizationId: tenantId },
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

    return { audit: updatedAudit, previousAudit: existingAudit };
  },

  async deleteAudit(prisma, tenantId, auditId) {
    const deleted = await prisma.audit.deleteMany({
      where: {
        id: auditId,
        organizationId: tenantId
      }
    });

    if (deleted.count === 0) {
      const error = new Error('Audit not found');
      error.statusCode = 404;
      throw error;
    }

    return { message: 'Audit deleted successfully' };
  },
};
