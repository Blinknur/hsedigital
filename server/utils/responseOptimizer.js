export const optimizeResponse = (data, options = {}) => {
  const {
    fields = null,
    omit = [],
    compress = true
  } = options;

  if (!data) return data;

  const optimizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => optimizeObject(item));
    }

    const result = {};
    const keysToProcess = fields || Object.keys(obj);

    for (const key of keysToProcess) {
      if (omit.includes(key)) continue;
      if (!(key in obj)) continue;

      const value = obj[key];

      if (value === null || value === undefined) {
        if (!compress) result[key] = value;
        continue;
      }

      if (value instanceof Date) {
        result[key] = value.toISOString();
        continue;
      }

      if (typeof value === 'object') {
        result[key] = optimizeObject(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  };

  return optimizeObject(data);
};

export const paginateResponse = (data, page, limit, total) => ({
  data,
  pagination: {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total
  }
});

export const mobileResponse = (data, options = {}) => {
  const optimized = optimizeResponse(data, {
    omit: ['password', 'refreshTokens', 'passwordResetToken', 'emailVerificationToken'],
    compress: true,
    ...options
  });

  return {
    success: true,
    timestamp: new Date().toISOString(),
    data: optimized
  };
};

export const mobileErrorResponse = (error, statusCode = 500) => ({
  success: false,
  error: {
    message: error.message || 'An error occurred',
    code: error.code || 'INTERNAL_ERROR',
    statusCode
  },
  timestamp: new Date().toISOString()
});

export const selectFields = {
  user: {
    id: true,
    email: true,
    name: true,
    role: true,
    region: true,
    organizationId: true,
    createdAt: true,
    updatedAt: true
  },
  station: {
    id: true,
    name: true,
    brand: true,
    region: true,
    address: true,
    location: true,
    riskCategory: true,
    isActive: true
  },
  audit: {
    id: true,
    auditNumber: true,
    scheduledDate: true,
    completedDate: true,
    status: true,
    overallScore: true,
    findings: true,
    createdAt: true,
    updatedAt: true
  },
  incident: {
    id: true,
    incidentType: true,
    severity: true,
    description: true,
    status: true,
    reportedAt: true,
    resolvedAt: true,
    createdAt: true,
    updatedAt: true
  }
};
