import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
        user: process.env.SMTP_USER || 'ethereal.user',
        pass: process.env.SMTP_PASS || 'ethereal.pass'
    }
});

export const sendMagicLink = async (email, token) => {
    const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/verify?token=${token}`;
    console.log(`[EMAIL] Magic Link for ${email}: ${link}`);
    if (!process.env.SMTP_HOST) return true;
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
};

export const sendAlert = async (email, subject, message) => {
    console.log(`[EMAIL] Alert to ${email}: ${message}`);
    if (!process.env.SMTP_HOST) return true;
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
};
