import { logger } from '../../shared/utils/logger.js';

let io = null;

export const setSocketIO = (socketIO) => {
    io = socketIO;
    logger.info('Socket.IO instance registered with notification service');
};

export const getSocketIO = () => {
    return io;
};

export const notificationService = {
    emitToTenant: (tenantId, event, data) => {
        if (!io) {
            logger.warn('Socket.IO not initialized, cannot emit notification');
            return;
        }

        const room = `tenant:${tenantId}`;
        io.to(room).emit(event, {
            ...data,
            timestamp: new Date().toISOString(),
            tenantId
        });

        logger.info({ 
            tenantId, 
            event, 
            room,
            dataKeys: Object.keys(data)
        }, 'Notification emitted to tenant');
    },

    emitToUser: (userId, event, data) => {
        if (!io) {
            logger.warn('Socket.IO not initialized, cannot emit notification');
            return;
        }

        const room = `user:${userId}`;
        io.to(room).emit(event, {
            ...data,
            timestamp: new Date().toISOString(),
            userId
        });

        logger.info({ 
            userId, 
            event, 
            room,
            dataKeys: Object.keys(data)
        }, 'Notification emitted to user');
    },

    emitToMultipleUsers: (userIds, event, data) => {
        if (!io) {
            logger.warn('Socket.IO not initialized, cannot emit notification');
            return;
        }

        userIds.forEach(userId => {
            notificationService.emitToUser(userId, event, data);
        });

        logger.info({ 
            userCount: userIds.length, 
            event 
        }, 'Notification emitted to multiple users');
    },

    incidentCreated: (tenantId, incident) => {
        notificationService.emitToTenant(tenantId, 'incident:created', {
            type: 'incident_created',
            title: 'New Incident Reported',
            message: `Incident "${incident.title}" has been reported`,
            severity: incident.severity,
            data: incident
        });
    },

    incidentUpdated: (tenantId, incident, changes) => {
        notificationService.emitToTenant(tenantId, 'incident:updated', {
            type: 'incident_updated',
            title: 'Incident Updated',
            message: `Incident "${incident.title}" has been updated`,
            severity: incident.severity,
            changes,
            data: incident
        });
    },

    incidentStatusChanged: (tenantId, incident, oldStatus, newStatus) => {
        notificationService.emitToTenant(tenantId, 'incident:status_changed', {
            type: 'incident_status_changed',
            title: 'Incident Status Changed',
            message: `Incident "${incident.title}" status changed from ${oldStatus} to ${newStatus}`,
            severity: incident.severity,
            oldStatus,
            newStatus,
            data: incident
        });
    },

    auditCreated: (tenantId, audit) => {
        notificationService.emitToTenant(tenantId, 'audit:created', {
            type: 'audit_created',
            title: 'New Audit Scheduled',
            message: `Audit "${audit.auditNumber}" has been scheduled`,
            data: audit
        });

        if (audit.auditorId) {
            notificationService.emitToUser(audit.auditorId, 'audit:assigned', {
                type: 'audit_assigned',
                title: 'Audit Assigned to You',
                message: `You have been assigned to audit "${audit.auditNumber}"`,
                data: audit
            });
        }
    },

    auditUpdated: (tenantId, audit, changes) => {
        notificationService.emitToTenant(tenantId, 'audit:updated', {
            type: 'audit_updated',
            title: 'Audit Updated',
            message: `Audit "${audit.auditNumber}" has been updated`,
            changes,
            data: audit
        });

        if (audit.auditorId) {
            notificationService.emitToUser(audit.auditorId, 'audit:updated', {
                type: 'audit_updated',
                title: 'Your Audit Updated',
                message: `Audit "${audit.auditNumber}" has been updated`,
                changes,
                data: audit
            });
        }
    },

    auditStatusChanged: (tenantId, audit, oldStatus, newStatus) => {
        notificationService.emitToTenant(tenantId, 'audit:status_changed', {
            type: 'audit_status_changed',
            title: 'Audit Status Changed',
            message: `Audit "${audit.auditNumber}" status changed from ${oldStatus} to ${newStatus}`,
            oldStatus,
            newStatus,
            data: audit
        });

        if (audit.auditorId) {
            notificationService.emitToUser(audit.auditorId, 'audit:status_changed', {
                type: 'audit_status_changed',
                title: 'Your Audit Status Changed',
                message: `Audit "${audit.auditNumber}" status changed to ${newStatus}`,
                oldStatus,
                newStatus,
                data: audit
            });
        }
    },

    auditLogCreated: (tenantId, auditLog) => {
        notificationService.emitToTenant(tenantId, 'audit_log:created', {
            type: 'audit_log_created',
            title: 'Audit Log Entry Created',
            message: `${auditLog.action} performed on ${auditLog.entityType}`,
            data: auditLog
        });

        if (auditLog.userId) {
            notificationService.emitToUser(auditLog.userId, 'audit_log:created', {
                type: 'audit_log_created',
                title: 'Your Action Logged',
                message: `${auditLog.action} on ${auditLog.entityType}`,
                data: auditLog
            });
        }
    },

    systemNotification: (tenantId, notification) => {
        notificationService.emitToTenant(tenantId, 'system:notification', {
            type: 'system_notification',
            title: notification.title || 'System Notification',
            message: notification.message,
            level: notification.level || 'info',
            data: notification.data
        });
    },

    quotaWarning: (tenantId, resource, usage, limit) => {
        notificationService.emitToTenant(tenantId, 'quota:warning', {
            type: 'quota_warning',
            title: 'Quota Warning',
            message: `You are approaching the limit for ${resource}: ${usage}/${limit}`,
            level: 'warning',
            resource,
            usage,
            limit
        });
    },

    quotaExceeded: (tenantId, resource, usage, limit) => {
        notificationService.emitToTenant(tenantId, 'quota:exceeded', {
            type: 'quota_exceeded',
            title: 'Quota Exceeded',
            message: `You have exceeded the limit for ${resource}: ${usage}/${limit}`,
            level: 'error',
            resource,
            usage,
            limit
        });
    },

    userRoleChanged: (userId, tenantId, oldRole, newRole) => {
        notificationService.emitToUser(userId, 'user:role_changed', {
            type: 'user_role_changed',
            title: 'Your Role Has Changed',
            message: `Your role has been changed from ${oldRole} to ${newRole}`,
            oldRole,
            newRole
        });

        notificationService.emitToTenant(tenantId, 'user:role_changed', {
            type: 'user_role_changed',
            title: 'User Role Changed',
            message: `User role changed from ${oldRole} to ${newRole}`,
            userId,
            oldRole,
            newRole
        });
    },

    workPermitCreated: (tenantId, workPermit) => {
        notificationService.emitToTenant(tenantId, 'work_permit:created', {
            type: 'work_permit_created',
            title: 'New Work Permit Created',
            message: `Work permit for ${workPermit.workType} has been created`,
            data: workPermit
        });

        if (workPermit.requestedBy) {
            notificationService.emitToUser(workPermit.requestedBy, 'work_permit:created', {
                type: 'work_permit_created',
                title: 'Your Work Permit Created',
                message: `Work permit for ${workPermit.workType} has been created`,
                data: workPermit
            });
        }
    },

    workPermitStatusChanged: (tenantId, workPermit, oldStatus, newStatus) => {
        notificationService.emitToTenant(tenantId, 'work_permit:status_changed', {
            type: 'work_permit_status_changed',
            title: 'Work Permit Status Changed',
            message: `Work permit status changed from ${oldStatus} to ${newStatus}`,
            oldStatus,
            newStatus,
            data: workPermit
        });

        if (workPermit.requestedBy) {
            notificationService.emitToUser(workPermit.requestedBy, 'work_permit:status_changed', {
                type: 'work_permit_status_changed',
                title: 'Your Work Permit Status Changed',
                message: `Work permit status changed to ${newStatus}`,
                oldStatus,
                newStatus,
                data: workPermit
            });
        }
    },

    broadcast: (event, data) => {
        if (!io) {
            logger.warn('Socket.IO not initialized, cannot broadcast');
            return;
        }

        io.emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });

        logger.info({ event, dataKeys: Object.keys(data) }, 'Broadcast notification emitted');
    },

    getConnectedClients: (room) => {
        if (!io) {
            logger.warn('Socket.IO not initialized');
            return [];
        }

        const sockets = io.sockets.adapter.rooms.get(room);
        return sockets ? Array.from(sockets) : [];
    },

    getConnectedClientsCount: (room) => {
        const clients = notificationService.getConnectedClients(room);
        return clients.length;
    },

    getTenantConnectedClientsCount: (tenantId) => {
        return notificationService.getConnectedClientsCount(`tenant:${tenantId}`);
    },

    getUserConnectedClientsCount: (userId) => {
        return notificationService.getConnectedClientsCount(`user:${userId}`);
    }
};
