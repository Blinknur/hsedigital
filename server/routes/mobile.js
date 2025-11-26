import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, tenantContext } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { authService } from '../services/authService.js';
import { syncService } from '../services/syncService.js';
import { imageCompressionService } from '../services/imageCompressionService.js';
import { mobileResponse, mobileErrorResponse, selectFields } from '../utils/responseOptimizer.js';
import prisma from '../utils/db.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/auth/login', asyncHandler(async (req, res) => {
  const { email, password, deviceInfo } = req.body;

  if (!email || !password) {
    return res.status(400).json(mobileErrorResponse(
      { message: 'Email and password are required', code: 'VALIDATION_ERROR' },
      400
    ));
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(401).json(mobileErrorResponse(
      { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
      401
    ));
  }

  const isPasswordValid = await authService.comparePassword(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json(mobileErrorResponse(
      { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
      401
    ));
  }

  if (!user.isEmailVerified) {
    return res.status(403).json(mobileErrorResponse(
      { message: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' },
      403
    ));
  }

  const tokens = authService.generateTokens(user);
  await authService.storeRefreshToken(prisma, user.id, tokens.refreshToken);

  if (deviceInfo) {
    logger.info({ userId: user.id, deviceInfo }, 'Mobile login');
  }

  const { password: _, ...userInfo } = user;

  res.json(mobileResponse({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: userInfo
  }));
}));

router.post('/auth/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json(mobileErrorResponse(
      { message: 'Refresh token required', code: 'TOKEN_REQUIRED' },
      401
    ));
  }

  const decoded = authService.verifyRefreshToken(refreshToken);

  if (!decoded) {
    return res.status(403).json(mobileErrorResponse(
      { message: 'Invalid refresh token', code: 'INVALID_TOKEN' },
      403
    ));
  }

  const isValid = await authService.validateRefreshToken(prisma, decoded.id, refreshToken);

  if (!isValid) {
    return res.status(403).json(mobileErrorResponse(
      { message: 'Refresh token not found or revoked', code: 'TOKEN_REVOKED' },
      403
    ));
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });

  if (!user) {
    return res.status(403).json(mobileErrorResponse(
      { message: 'User not found', code: 'USER_NOT_FOUND' },
      403
    ));
  }

  await authService.revokeRefreshToken(prisma, user.id, refreshToken);

  const tokens = authService.generateTokens(user);
  await authService.storeRefreshToken(prisma, user.id, tokens.refreshToken);

  res.json(mobileResponse({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken
  }));
}));

router.post('/sync', authenticateToken, tenantContext, asyncHandler(async (req, res) => {
  const { resources, lastSyncTimes = {} } = req.body;

  if (!resources || !Array.isArray(resources)) {
    return res.status(400).json(mobileErrorResponse(
      { message: 'Resources array required', code: 'VALIDATION_ERROR' },
      400
    ));
  }

  const syncResults = await syncService.batchSync(
    req.tenantId,
    req.user.id,
    resources,
    lastSyncTimes
  );

  res.json(mobileResponse(syncResults));
}));

router.get('/sync/:resource', authenticateToken, tenantContext, asyncHandler(async (req, res) => {
  const { resource } = req.params;
  const { lastSync, limit = 100 } = req.query;

  const lastSyncDate = lastSync ? new Date(lastSync) : null;

  const changes = await syncService.getChanges(
    req.tenantId,
    resource,
    lastSyncDate,
    { limit: parseInt(limit) }
  );

  await syncService.setLastSyncTimestamp(req.user.id, resource);

  res.json(mobileResponse(changes));
}));

router.post('/images/upload', 
  authenticateToken, 
  tenantContext,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json(mobileErrorResponse(
        { message: 'No image file provided', code: 'FILE_REQUIRED' },
        400
      ));
    }

    const { compress = 'true', generateThumbnail = 'true' } = req.body;
    const inputPath = req.file.path;
    const results = {};

    try {
      if (compress === 'true') {
        const compressedPath = inputPath.replace(
          path.extname(inputPath),
          `_compressed${path.extname(inputPath)}`
        );
        
        const compressed = await imageCompressionService.compressImage(
          inputPath,
          compressedPath,
          'mobile'
        );
        
        results.compressed = {
          url: `/uploads/${path.basename(compressed.path)}`,
          size: compressed.compressedSize,
          compressionRatio: compressed.compressionRatio
        };
      }

      if (generateThumbnail === 'true') {
        const thumbnailPath = inputPath.replace(
          path.extname(inputPath),
          `_thumbnail${path.extname(inputPath)}`
        );
        
        const thumbnail = await imageCompressionService.compressImage(
          inputPath,
          thumbnailPath,
          'thumbnail'
        );
        
        results.thumbnail = {
          url: `/uploads/${path.basename(thumbnail.path)}`,
          size: thumbnail.compressedSize
        };
      }

      results.original = {
        url: `/uploads/${req.file.filename}`,
        size: req.file.size
      };

      res.json(mobileResponse(results));
    } catch (error) {
      logger.error({ error }, 'Image upload processing failed');
      res.status(500).json(mobileErrorResponse(
        { message: 'Image processing failed', code: 'PROCESSING_ERROR' },
        500
      ));
    }
  })
);

router.post('/images/batch-upload',
  authenticateToken,
  tenantContext,
  upload.array('images', 10),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json(mobileErrorResponse(
        { message: 'No image files provided', code: 'FILES_REQUIRED' },
        400
      ));
    }

    const { compress = 'true' } = req.body;
    const results = [];

    try {
      for (const file of req.files) {
        const result = {
          original: {
            url: `/uploads/${file.filename}`,
            size: file.size
          }
        };

        if (compress === 'true') {
          const compressedPath = file.path.replace(
            path.extname(file.path),
            `_compressed${path.extname(file.path)}`
          );
          
          const compressed = await imageCompressionService.compressImage(
            file.path,
            compressedPath,
            'mobile'
          );
          
          result.compressed = {
            url: `/uploads/${path.basename(compressed.path)}`,
            size: compressed.compressedSize,
            compressionRatio: compressed.compressionRatio
          };
        }

        results.push(result);
      }

      res.json(mobileResponse({ images: results, count: results.length }));
    } catch (error) {
      logger.error({ error }, 'Batch image upload processing failed');
      res.status(500).json(mobileErrorResponse(
        { message: 'Batch image processing failed', code: 'PROCESSING_ERROR' },
        500
      ));
    }
  })
);

router.post('/audits/batch',
  authenticateToken,
  tenantContext,
  requirePermission('audits', 'write'),
  asyncHandler(async (req, res) => {
    const { audits } = req.body;

    if (!audits || !Array.isArray(audits)) {
      return res.status(400).json(mobileErrorResponse(
        { message: 'Audits array required', code: 'VALIDATION_ERROR' },
        400
      ));
    }

    const results = {
      created: [],
      failed: [],
      total: audits.length
    };

    for (const auditData of audits) {
      try {
        const audit = await prisma.audit.create({
          data: {
            organizationId: req.tenantId,
            auditorId: req.user.id,
            auditNumber: auditData.auditNumber || `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            stationId: auditData.stationId,
            formId: auditData.formId,
            scheduledDate: new Date(auditData.scheduledDate),
            completedDate: auditData.completedDate ? new Date(auditData.completedDate) : null,
            status: auditData.status || 'Scheduled',
            findings: auditData.findings || [],
            overallScore: auditData.overallScore || 0
          },
          select: selectFields.audit
        });

        results.created.push(audit);
      } catch (error) {
        logger.error({ error, auditData }, 'Failed to create audit in batch');
        results.failed.push({
          data: auditData,
          error: error.message
        });
      }
    }

    res.json(mobileResponse(results));
  })
);

router.get('/stations/lightweight',
  authenticateToken,
  tenantContext,
  requirePermission('stations', 'read'),
  asyncHandler(async (req, res) => {
    const { region } = req.query;
    
    const where = { 
      organizationId: req.tenantId,
      isActive: true
    };
    
    if (region) where.region = region;

    const stations = await prisma.station.findMany({
      where,
      select: selectFields.station,
      orderBy: { name: 'asc' }
    });

    res.json(mobileResponse({ stations, count: stations.length }));
  })
);

router.get('/audits/lightweight',
  authenticateToken,
  tenantContext,
  requirePermission('audits', 'read'),
  asyncHandler(async (req, res) => {
    const { status, limit = 50, offset = 0 } = req.query;
    
    const where = { organizationId: req.tenantId };
    if (status) where.status = status;

    const [audits, total] = await Promise.all([
      prisma.audit.findMany({
        where,
        select: selectFields.audit,
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { scheduledDate: 'desc' }
      }),
      prisma.audit.count({ where })
    ]);

    res.json(mobileResponse({ 
      audits, 
      count: audits.length,
      total,
      hasMore: parseInt(offset) + audits.length < total
    }));
  })
);

router.get('/incidents/lightweight',
  authenticateToken,
  tenantContext,
  requirePermission('incidents', 'read'),
  asyncHandler(async (req, res) => {
    const { severity, status, limit = 50, offset = 0 } = req.query;
    
    const where = { organizationId: req.tenantId };
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        select: selectFields.incident,
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { reportedAt: 'desc' }
      }),
      prisma.incident.count({ where })
    ]);

    res.json(mobileResponse({ 
      incidents, 
      count: incidents.length,
      total,
      hasMore: parseInt(offset) + incidents.length < total
    }));
  })
);

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'mobile-api'
  });
});

export default router;
