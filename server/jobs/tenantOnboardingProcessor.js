import { logger } from '../utils/logger.js';
import { tenantOnboardingQueue } from '../queues/index.js';
import prisma from '../utils/db.js';
import bcrypt from 'bcrypt';

const createDefaultRoles = async (organizationId) => {
    const roles = [
        { name: 'Admin', organizationId, permissions: { all: ['*'] } },
        { name: 'Manager', organizationId, permissions: { 
            stations: ['read', 'write'], 
            audits: ['read', 'write'],
            incidents: ['read', 'write'],
            workPermits: ['read', 'write']
        }},
        { name: 'User', organizationId, permissions: { 
            stations: ['read'], 
            audits: ['read'],
            incidents: ['read', 'write']
        }}
    ];
    
    for (const role of roles) {
        await prisma.role.create({ data: role });
    }
};

const createWelcomeStation = async (organizationId) => {
    await prisma.station.create({
        data: {
            name: 'Welcome Station',
            region: 'Default',
            organizationId,
            capacity: 100,
            operationalStatus: 'Operational'
        }
    });
};

const createAdminUser = async (organizationId, email, name) => {
    const hashedPassword = await bcrypt.hash('changeme123', 10);
    
    const user = await prisma.user.create({
        data: {
            email,
            name,
            password: hashedPassword,
            role: 'Admin',
            organizationId,
            isEmailVerified: false
        }
    });
    
    return user;
};

const sendWelcomeEmail = async (email, organizationName, temporaryPassword) => {
    const { addEmailJob } = await import('./emailProcessor.js');
    
    await addEmailJob({
        to: email,
        subject: `Welcome to HSE.Digital - ${organizationName}`,
        html: `
            <h1>Welcome to HSE.Digital!</h1>
            <p>Your organization "${organizationName}" has been successfully set up.</p>
            <p><strong>Login Details:</strong></p>
            <ul>
                <li>Email: ${email}</li>
                <li>Temporary Password: ${temporaryPassword}</li>
            </ul>
            <p>Please change your password after your first login.</p>
            <p><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}">Login Now</a></p>
        `,
        text: `Welcome to HSE.Digital! Your organization "${organizationName}" is ready. Login with email: ${email}, password: ${temporaryPassword}`
    });
};

const processTenantOnboardingJob = async (job) => {
    const { 
        organizationName, 
        adminEmail, 
        adminName, 
        tier = 'starter',
        stripeCustomerId,
        stripeSubscriptionId 
    } = job.data;
    
    logger.info({ 
        jobId: job.id, 
        organizationName, 
        adminEmail,
        tier
    }, 'Processing tenant onboarding job');

    try {
        const organization = await prisma.organization.create({
            data: {
                name: organizationName,
                tier,
                stripeCustomerId,
                stripeSubscriptionId,
                quotas: {
                    users: tier === 'starter' ? 10 : tier === 'professional' ? 50 : 200,
                    stations: tier === 'starter' ? 5 : tier === 'professional' ? 25 : 100,
                    audits: tier === 'starter' ? 100 : tier === 'professional' ? 500 : -1
                }
            }
        });
        
        await job.progress(25);
        
        await createDefaultRoles(organization.id);
        await job.progress(50);
        
        await createWelcomeStation(organization.id);
        await job.progress(75);
        
        const adminUser = await createAdminUser(organization.id, adminEmail, adminName);
        await job.progress(90);
        
        await sendWelcomeEmail(adminEmail, organizationName, 'changeme123');
        await job.progress(100);
        
        logger.info({ 
            jobId: job.id, 
            organizationId: organization.id,
            organizationName
        }, 'Tenant onboarding completed successfully');
        
        return {
            organizationId: organization.id,
            organizationName: organization.name,
            adminUserId: adminUser.id,
            tier: organization.tier
        };
    } catch (error) {
        logger.error({ 
            error, 
            jobId: job.id, 
            organizationName,
            adminEmail
        }, 'Failed to onboard tenant');
        
        throw error;
    }
};

export const startTenantOnboardingProcessor = (concurrency = 2) => {
    tenantOnboardingQueue.process(concurrency, processTenantOnboardingJob);
    
    tenantOnboardingQueue.on('completed', (job, result) => {
        logger.info({ 
            jobId: job.id, 
            result 
        }, 'Tenant onboarding job completed');
    });

    tenantOnboardingQueue.on('failed', (job, error) => {
        logger.error({ 
            jobId: job.id, 
            error,
            attempts: job.attemptsMade
        }, 'Tenant onboarding job failed');
    });
    
    tenantOnboardingQueue.on('progress', (job, progress) => {
        logger.info({ 
            jobId: job.id, 
            progress 
        }, 'Tenant onboarding progress');
    });

    logger.info({ concurrency }, 'Tenant onboarding processor started');
};

export const addTenantOnboardingJob = async (onboardingData, options = {}) => {
    const job = await tenantOnboardingQueue.add(onboardingData, options);
    
    logger.info({ 
        jobId: job.id, 
        organizationName: onboardingData.organizationName 
    }, 'Tenant onboarding job added to queue');
    
    return job;
};
