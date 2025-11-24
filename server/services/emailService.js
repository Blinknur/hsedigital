import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
        user: process.env.SMTP_USER || 'ethereal.user',
        pass: process.env.SMTP_PASS || 'ethereal.pass'
    }
});

export const emailService = {
    sendVerificationEmail: async (email, token) => {
        const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/verify-email?token=${token}`;
        console.log(`[EMAIL] Verification Link for ${email}: ${link}`);
        
        if (!process.env.SMTP_HOST || process.env.SMTP_HOST === 'smtp.ethereal.email') {
            console.log('[EMAIL] Using mock email service (Ethereal)');
            return true;
        }
        
        try {
            await transporter.sendMail({
                from: '"HSE.Digital Security" <security@hse.digital>',
                to: email,
                subject: 'Verify Your Email - HSE.Digital',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Welcome to HSE.Digital!</h2>
                        <p>Please verify your email address by clicking the link below:</p>
                        <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
                        <p>This link will expire in 24 hours.</p>
                        <p>If you didn't create an account, please ignore this email.</p>
                    </div>
                `
            });
            return true;
        } catch (e) {
            console.error("Email send failed:", e);
            return false;
        }
    },

    sendPasswordResetEmail: async (email, token) => {
        const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/reset-password?token=${token}`;
        console.log(`[EMAIL] Password Reset Link for ${email}: ${link}`);
        
        if (!process.env.SMTP_HOST || process.env.SMTP_HOST === 'smtp.ethereal.email') {
            console.log('[EMAIL] Using mock email service (Ethereal)');
            return true;
        }
        
        try {
            await transporter.sendMail({
                from: '"HSE.Digital Security" <security@hse.digital>',
                to: email,
                subject: 'Reset Your Password - HSE.Digital',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Password Reset Request</h2>
                        <p>You requested to reset your password. Click the link below to proceed:</p>
                        <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
                        <p>This link will expire in 1 hour.</p>
                        <p>If you didn't request a password reset, please ignore this email.</p>
                    </div>
                `
            });
            return true;
        } catch (e) {
            console.error("Email send failed:", e);
            return false;
        }
    },

    sendMagicLink: async (email, token) => {
        const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/verify?token=${token}`;
        console.log(`[EMAIL] Magic Link for ${email}: ${link}`);
        
        if (!process.env.SMTP_HOST || process.env.SMTP_HOST === 'smtp.ethereal.email') {
            return true;
        }
        
        try {
            await transporter.sendMail({
                from: '"HSE.Digital Security" <security@hse.digital>',
                to: email,
                subject: 'Log in to HSE.Digital',
                html: `<p>Click here to log in: <a href="${link}">Magic Link</a></p>`
            });
            return true;
        } catch (e) {
            console.error("Email send failed:", e);
            return false;
        }
    },

    sendAlert: async (email, subject, message) => {
        console.log(`[EMAIL] Alert to ${email}: ${message}`);
        
        if (!process.env.SMTP_HOST || process.env.SMTP_HOST === 'smtp.ethereal.email') {
            return true;
        }
        
        try {
            await transporter.sendMail({
                from: '"HSE.Digital Alerts" <alerts@hse.digital>',
                to: email,
                subject: subject,
                text: message,
                html: `<p>${message}</p>`
            });
            return true;
        } catch (e) {
            console.error("Email alert failed:", e);
            return false;
        }
    }
};
