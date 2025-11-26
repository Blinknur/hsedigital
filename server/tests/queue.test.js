import { queueEmail, queueReport, getJobStatus } from '../services/queueService.js';
import { logger } from '../utils/logger.js';

const testEmailQueue = async () => {
    try {
        console.log('Testing email queue...');
        
        const result = await queueEmail({
            to: 'test@example.com',
            subject: 'Test Email',
            html: '<p>This is a test email</p>',
            text: 'This is a test email'
        });
        
        console.log('✓ Email queued:', result);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const status = await getJobStatus('email', result.jobId);
        console.log('✓ Job status:', status);
        
        return result;
    } catch (error) {
        console.error('✗ Email queue test failed:', error);
        throw error;
    }
};

const testReportQueue = async () => {
    try {
        console.log('Testing report queue...');
        
        const result = await queueReport({
            type: 'audits',
            organizationId: 'test-org-123',
            filters: {},
            format: 'json'
        });
        
        console.log('✓ Report queued:', result);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const status = await getJobStatus('reports', result.jobId);
        console.log('✓ Job status:', status);
        
        return result;
    } catch (error) {
        console.error('✗ Report queue test failed:', error);
        throw error;
    }
};

const testScheduledEmail = async () => {
    try {
        console.log('Testing scheduled email...');
        
        const { queueScheduledEmail } = await import('../services/queueService.js');
        
        const result = await queueScheduledEmail(
            {
                to: 'scheduled@example.com',
                subject: 'Scheduled Email',
                html: '<p>This email was scheduled</p>',
                text: 'This email was scheduled'
            },
            5000
        );
        
        console.log('✓ Scheduled email queued:', result);
        
        return result;
    } catch (error) {
        console.error('✗ Scheduled email test failed:', error);
        throw error;
    }
};

const runTests = async () => {
    console.log('='.repeat(50));
    console.log('Queue System Tests');
    console.log('='.repeat(50));
    
    try {
        await testEmailQueue();
        console.log('');
        
        await testScheduledEmail();
        console.log('');
        
        console.log('='.repeat(50));
        console.log('All tests passed!');
        console.log('='.repeat(50));
        
        process.exit(0);
    } catch (error) {
        console.error('Tests failed:', error);
        process.exit(1);
    }
};

if (import.meta.url === `file://${process.argv[1]}`) {
    runTests();
}

export { testEmailQueue, testReportQueue, testScheduledEmail };
