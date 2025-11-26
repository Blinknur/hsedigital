import prisma from '../utils/db.js';

const RETENTION_DAYS = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '365');

export const cleanupOldAuditLogs = async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    console.log(`[AUDIT LOG CLEANUP] Deleted ${result.count} logs older than ${RETENTION_DAYS} days`);
    return result.count;
  } catch (error) {
    console.error('[AUDIT LOG CLEANUP] Error:', error);
    throw error;
  }
};

export const startAuditLogCleanupScheduler = () => {
  const runCleanup = async () => {
    console.log('[AUDIT LOG CLEANUP] Starting scheduled cleanup...');
    await cleanupOldAuditLogs();
  };

  const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

  const getTimeUntilNextRun = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(2, 0, 0, 0);
    
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    
    return next - now;
  };

  const scheduleNext = () => {
    const delay = getTimeUntilNextRun();
    setTimeout(async () => {
      await runCleanup();
      setInterval(runCleanup, CLEANUP_INTERVAL);
    }, delay);
  };

  scheduleNext();

  console.log(`[AUDIT LOG CLEANUP] Scheduler started - will run daily at 2 AM (retention: ${RETENTION_DAYS} days)`);
};

export const getRetentionPolicy = () => {
  return {
    retentionDays: RETENTION_DAYS,
    enabled: true
  };
};
