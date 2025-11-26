export { sendMagicLink, sendAlert } from './tracedEmailService.js';

export const sendEmail = async ({ to, subject, html, text, from = 'noreply@hse.digital' }) => {
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
            user: process.env.SMTP_USER || 'ethereal.user',
            pass: process.env.SMTP_PASS || 'ethereal.pass'
        }
    });

    console.log(`[EMAIL] Sending to ${to}: ${subject}`);
    
    if (!process.env.SMTP_HOST) {
        console.log('[EMAIL] SMTP not configured, skipping');
        return { success: true, skipped: true };
    }
    
    try {
        const result = await transporter.sendMail({
            from: `"HSE.Digital" <${from}>`,
            to,
            subject,
            text,
            html
        });
        
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('[EMAIL] Send failed:', error);
        throw error;
    }
};
