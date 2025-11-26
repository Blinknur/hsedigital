import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const tenantLogFile = path.join(logDir, 'tenant-access.log');

function writeLog(entry) {
    const logLine = JSON.stringify({
        ...entry,
        timestamp: new Date().toISOString()
    }) + '\n';

    fs.appendFileSync(tenantLogFile, logLine);
}

export const tenantLogger = {
    logTenantSwitch(userId, userEmail, tenantId, path) {
        writeLog({
            type: 'TENANT_SWITCH',
            userId,
            userEmail,
            tenantId,
            path
        });
    },

    logTenantAccessDenied(userId, userEmail, reason) {
        writeLog({
            type: 'ACCESS_DENIED',
            userId,
            userEmail,
            reason
        });
    },

    logTenantQueryBlock(userId, tenantId, operation, model) {
        writeLog({
            type: 'QUERY_BLOCKED',
            userId,
            tenantId,
            operation,
            model
        });
    },

    logTenantInjection(tenantId, operation, model) {
        writeLog({
            type: 'TENANT_INJECTED',
            tenantId,
            operation,
            model
        });
    }
};
