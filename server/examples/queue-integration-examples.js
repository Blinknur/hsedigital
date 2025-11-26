import { 
    queueEmail, 
    queueReport, 
    queueDataExport, 
    queueWebhook, 
    queueTenantOnboarding,
    queueBulkEmails,
    queueScheduledEmail,
    getJobStatus
} from '../services/queueService.js';

export const exampleEmailUsage = async () => {
    const result = await queueEmail({
        to: 'user@example.com',
        subject: 'Welcome to HSE.Digital',
        html: '<h1>Welcome!</h1><p>Your account has been created.</p>',
        text: 'Welcome! Your account has been created.',
        from: 'noreply@hse.digital'
    });
    
    console.log('Email queued:', result.jobId);
    
    const status = await getJobStatus('email', result.jobId);
    console.log('Job status:', status);
    
    return result;
};

export const exampleReportGeneration = async (organizationId, userEmail) => {
    const result = await queueReport({
        type: 'compliance',
        organizationId,
        filters: {
            createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
        },
        format: 'json',
        notifyEmail: userEmail
    });
    
    console.log('Report generation queued:', result.jobId);
    return result;
};

export const exampleDataExport = async (organizationId, userEmail) => {
    const result = await queueDataExport({
        organizationId,
        entities: ['stations', 'audits', 'incidents', 'work-permits'],
        format: 'json',
        notifyEmail: userEmail
    });
    
    console.log('Data export queued:', result.jobId);
    return result;
};

export const exampleWebhookIntegration = async (organizationId, incident) => {
    const result = await queueWebhook({
        url: 'https://api.example.com/webhooks/incidents',
        payload: {
            event: 'incident.created',
            data: incident,
            timestamp: new Date().toISOString()
        },
        secret: process.env.WEBHOOK_SECRET || 'default-secret',
        eventType: 'incident.created',
        organizationId
    });
    
    console.log('Webhook delivery queued:', result.jobId);
    return result;
};

export const exampleTenantOnboarding = async () => {
    const result = await queueTenantOnboarding({
        organizationName: 'Acme Corporation',
        adminEmail: 'admin@acme.com',
        adminName: 'John Doe',
        tier: 'professional',
        stripeCustomerId: 'cus_example123',
        stripeSubscriptionId: 'sub_example456'
    });
    
    console.log('Tenant onboarding queued:', result.jobId);
    return result;
};

export const exampleBulkEmailCampaign = async (recipients) => {
    const emailList = recipients.map(recipient => ({
        to: recipient.email,
        subject: 'Important Safety Update',
        html: `<h2>Hello ${recipient.name}</h2><p>This is an important safety update...</p>`,
        text: `Hello ${recipient.name}, This is an important safety update...`,
        from: 'safety@hse.digital'
    }));
    
    const result = await queueBulkEmails(emailList);
    console.log(`Bulk emails queued: ${result.count} emails`);
    
    return result;
};

export const exampleScheduledReminder = async (userEmail, reminderDate) => {
    const delay = reminderDate.getTime() - Date.now();
    
    if (delay > 0) {
        const result = await queueScheduledEmail(
            {
                to: userEmail,
                subject: 'Reminder: Audit Due Today',
                html: '<p>This is a reminder that your audit is due today.</p>',
                text: 'This is a reminder that your audit is due today.'
            },
            delay
        );
        
        console.log('Scheduled reminder queued:', result.jobId);
        return result;
    }
    
    return null;
};

export const integrateWithIncidentCreation = async (req, res, incident) => {
    await queueWebhook({
        url: 'https://api.example.com/webhooks/incidents',
        payload: { event: 'incident.created', data: incident },
        secret: process.env.WEBHOOK_SECRET,
        eventType: 'incident.created',
        organizationId: req.tenantId
    });
    
    await queueEmail({
        to: incident.reporterEmail,
        subject: 'Incident Reported Successfully',
        html: `<h2>Incident Report Confirmation</h2>
               <p>Your incident report has been submitted successfully.</p>
               <p><strong>Incident ID:</strong> ${incident.id}</p>
               <p><strong>Severity:</strong> ${incident.severity}</p>`,
        text: `Incident Report Confirmation. Your incident report has been submitted. ID: ${incident.id}`
    });
};

export const integrateWithUserSignup = async (user, organizationName) => {
    await queueEmail({
        to: user.email,
        subject: `Welcome to ${organizationName} - HSE.Digital`,
        html: `
            <h1>Welcome ${user.name}!</h1>
            <p>Your account has been created for ${organizationName}.</p>
            <p>Get started by logging in to the platform.</p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}">Login Now</a>
        `,
        text: `Welcome ${user.name}! Your account has been created for ${organizationName}.`
    });
};

export const integrateWithAuditCompletion = async (audit, organizationId) => {
    await queueReport({
        type: 'audits',
        organizationId,
        filters: { id: audit.id },
        format: 'json',
        notifyEmail: audit.auditorEmail
    });
    
    await queueWebhook({
        url: 'https://api.example.com/webhooks/audits',
        payload: { event: 'audit.completed', data: audit },
        secret: process.env.WEBHOOK_SECRET,
        eventType: 'audit.completed',
        organizationId
    });
};

export const scheduledWeeklyReport = async (organizations) => {
    for (const org of organizations) {
        await queueReport({
            type: 'compliance',
            organizationId: org.id,
            filters: {
                createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                }
            },
            format: 'json',
            notifyEmail: org.adminEmail
        });
    }
};
