import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/hse-digital';
const SCRIPTS_DIR = path.join(__dirname, '../../scripts');

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/health', asyncHandler(async (req, res) => {
    try {
        const stats = {
            backupDir: BACKUP_DIR,
            accessible: false,
            lastBackup: null,
            totalBackups: 0,
            dailyCount: 0,
            weeklyCount: 0,
            monthlyCount: 0,
            tenantCount: 0,
            totalSize: '0B'
        };

        try {
            await fs.access(BACKUP_DIR);
            stats.accessible = true;

            const dailyDir = path.join(BACKUP_DIR, 'daily');
            const weeklyDir = path.join(BACKUP_DIR, 'weekly');
            const monthlyDir = path.join(BACKUP_DIR, 'monthly');
            const tenantDir = path.join(BACKUP_DIR, 'tenant-specific');

            const [dailyFiles, weeklyFiles, monthlyFiles, tenantFiles] = await Promise.allSettled([
                fs.readdir(dailyDir).catch(() => []),
                fs.readdir(weeklyDir).catch(() => []),
                fs.readdir(monthlyDir).catch(() => []),
                fs.readdir(tenantDir).catch(() => [])
            ]);

            const daily = dailyFiles.status === 'fulfilled' ? dailyFiles.value.filter(f => f.endsWith('.sql.gz')) : [];
            const weekly = weeklyFiles.status === 'fulfilled' ? weeklyFiles.value.filter(f => f.endsWith('.sql.gz')) : [];
            const monthly = monthlyFiles.status === 'fulfilled' ? monthlyFiles.value.filter(f => f.endsWith('.sql.gz')) : [];
            const tenant = tenantFiles.status === 'fulfilled' ? tenantFiles.value.filter(f => f.endsWith('.sql.gz')) : [];

            stats.dailyCount = daily.length;
            stats.weeklyCount = weekly.length;
            stats.monthlyCount = monthly.length;
            stats.tenantCount = tenant.length;
            stats.totalBackups = daily.length + weekly.length + monthly.length + tenant.length;

            if (daily.length > 0) {
                const latestDaily = daily.sort().reverse()[0];
                const latestPath = path.join(dailyDir, latestDaily);
                const stat = await fs.stat(latestPath);
                stats.lastBackup = stat.mtime;
                stats.totalSize = `${(stat.size / 1024 / 1024).toFixed(2)}MB`;
            }
        } catch (err) {
            console.error('Error checking backup directory:', err);
        }

        res.json({
            status: 'healthy',
            ...stats
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
}));

router.post('/trigger', asyncHandler(async (req, res) => {
    const { tenant_id } = req.body;
    
    try {
        const backupScript = path.join(SCRIPTS_DIR, 'backup.sh');
        const cmd = tenant_id 
            ? `${backupScript} --tenant ${tenant_id}`
            : backupScript;

        const { stdout, stderr } = await execAsync(cmd, {
            timeout: 600000,
            maxBuffer: 10 * 1024 * 1024
        });

        res.json({
            success: true,
            message: tenant_id ? `Tenant backup initiated: ${tenant_id}` : 'Full backup initiated',
            output: stdout,
            errors: stderr || null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            output: error.stdout || null,
            errors: error.stderr || null
        });
    }
}));

router.get('/list', asyncHandler(async (req, res) => {
    const { type = 'all' } = req.query;

    try {
        const backups = {
            daily: [],
            weekly: [],
            monthly: [],
            tenant: []
        };

        const readBackupDir = async (dir, category) => {
            try {
                const dirPath = path.join(BACKUP_DIR, dir);
                const files = await fs.readdir(dirPath);
                const backupFiles = files.filter(f => f.endsWith('.sql.gz'));

                for (const file of backupFiles) {
                    const filePath = path.join(dirPath, file);
                    const metadataPath = filePath.replace('.sql.gz', '.metadata.json');
                    const stat = await fs.stat(filePath);

                    let metadata = null;
                    try {
                        const metadataContent = await fs.readFile(metadataPath, 'utf8');
                        metadata = JSON.parse(metadataContent);
                    } catch (err) {
                        console.error(`No metadata for ${file}`);
                    }

                    backups[category].push({
                        filename: file,
                        path: filePath,
                        size: stat.size,
                        sizeHuman: `${(stat.size / 1024 / 1024).toFixed(2)}MB`,
                        created: stat.mtime,
                        metadata
                    });
                }

                backups[category].sort((a, b) => b.created - a.created);
            } catch (err) {
                console.error(`Error reading ${dir}:`, err.message);
            }
        };

        if (type === 'all' || type === 'daily') {
            await readBackupDir('daily', 'daily');
        }
        if (type === 'all' || type === 'weekly') {
            await readBackupDir('weekly', 'weekly');
        }
        if (type === 'all' || type === 'monthly') {
            await readBackupDir('monthly', 'monthly');
        }
        if (type === 'all' || type === 'tenant') {
            await readBackupDir('tenant-specific', 'tenant');
        }

        res.json(backups);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
}));

router.post('/verify/:backupId', asyncHandler(async (req, res) => {
    const { backupId } = req.params;

    try {
        const backupFile = path.join(BACKUP_DIR, 'daily', backupId);
        const metadataFile = backupFile.replace('.sql.gz', '.metadata.json');

        await fs.access(backupFile);

        const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
        
        const { stdout } = await execAsync(`sha256sum ${backupFile}`);
        const actualChecksum = stdout.split(' ')[0];

        const verified = actualChecksum === metadata.checksum;

        res.json({
            verified,
            backupFile: backupId,
            expectedChecksum: metadata.checksum,
            actualChecksum,
            metadata
        });
    } catch (error) {
        res.status(500).json({
            verified: false,
            error: error.message
        });
    }
}));

export default router;
