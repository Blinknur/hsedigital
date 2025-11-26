export const permitService = {
  async listPermits(prisma, tenantId, filters = {}) {
    const where = { organizationId: tenantId };
    if (filters.stationId) where.stationId = filters.stationId;

    const permits = await prisma.workPermit.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return permits;
  },

  async createPermit(prisma, tenantId, userId, permitData) {
    const permit = await prisma.workPermit.create({
      data: {
        organizationId: tenantId,
        requestedBy: userId,
        ...permitData,
        validFrom: new Date(permitData.validFrom),
        validTo: new Date(permitData.validTo)
      }
    });

    return permit;
  },
};
