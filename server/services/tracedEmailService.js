import nodemailer from 'nodemailer';
import { withSpan, addSpanAttributes, recordException, addSpanEvent } from '../utils/tracing.js';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
        user: process.env.SMTP_USER || 'ethereal.user',
        pass: process.env.SMTP_PASS || 'ethereal.pass'
    }
});

export const sendMagicLink = async (email, token) => {
    return await withSpan(
        'email.send_magic_link',
        {
            'email.operation': 'send_magic_link',
            'email.recipient': email,
            'email.type': 'authentication'
        },
        async (span) => {
            const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/verify?token=${token}`;
            
            console.log(`[EMAIL] Magic Link for ${email}: ${link}`);
            
            if (!process.env.SMTP_HOST) {
                span.setAttribute('email.skipped', true);
                span.setAttribute('email.reason', 'smtp_not_configured');
                return true;
            }
            
            try {
                addSpanEvent('sending_email', {
                    from: 'security@hse.digital',
                    to: email,
                    subject: 'Log in to HSE.Digital'
                });

                await transporter.sendMail({
                    from: '"HSE.Digital Security" <security@hse.digital>',
                    to: email,
                    subject: 'Log in to HSE.Digital',
                    html: `<p>Click here to log in: <a href="${link}">Magic Link</a></p>`
                });

                span.setAttribute('email.sent', true);
                addSpanEvent('email_sent_successfully');
                
                return true;
            } catch (e) {
                console.error("Email send failed:", e);
                recordException(e, {
                    'email.operation': 'send_magic_link',
                    'email.recipient': email
                });
                return false;
            }
        }
    );
};

export const sendAlert = async (email, subject, message) => {
    return await withSpan(
        'email.send_alert',
        {
            'email.operation': 'send_alert',
            'email.recipient': email,
            'email.type': 'alert',
            'email.subject': subject
        },
        async (span) => {
            console.log(`[EMAIL] Alert to ${email}: ${message}`);
            
            if (!process.env.SMTP_HOST) {
                span.setAttribute('email.skipped', true);
                span.setAttribute('email.reason', 'smtp_not_configured');
                return true;
            }
            
            try {
                addSpanEvent('sending_alert_email', {
                    from: 'alerts@hse.digital',
                    to: email,
                    subject
                });

                await transporter.sendMail({
                    from: '"HSE.Digital Alerts" <alerts@hse.digital>',
                    to: email,
                    subject: subject,
                    text: message,
                    html: `<p>${message}</p>`
                });

                span.setAttribute('email.sent', true);
                addSpanEvent('alert_email_sent_successfully');
                
                return true;
            } catch (e) {
                console.error("Email alert failed:", e);
                recordException(e, {
                    'email.operation': 'send_alert',
                    'email.recipient': email,
                    'email.subject': subject
                });
                return false;
            }
        }
    );
};
