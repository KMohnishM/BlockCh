const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Create reusable transporter object using SMTP transport
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async sendVerificationEmail(to, token, companyName) {
        const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
        
        const mailOptions = {
            from: `"Vyaapar AI" <${process.env.SMTP_FROM}>`,
            to,
            subject: 'Verify Your Company Email',
            html: `
                <h1>Email Verification</h1>
                <p>Hello,</p>
                <p>Please verify your email address for ${companyName} by clicking the link below:</p>
                <p>
                    <a href="${verificationLink}" style="
                        background-color: #4F46E5;
                        color: white;
                        padding: 12px 24px;
                        text-decoration: none;
                        border-radius: 4px;
                        display: inline-block;
                        margin: 20px 0;
                    ">
                        Verify Email
                    </a>
                </p>
                <p>If you did not request this verification, please ignore this email.</p>
                <p>This link will expire in 24 hours.</p>
                <p>Best regards,<br>Vyaapar AI Team</p>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Verification email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending verification email:', error);
            return { success: false, error: error.message };
        }
    }

    async sendWelcomeEmail(to, firstName) {
        const mailOptions = {
            from: `"Vyaapar AI" <${process.env.SMTP_FROM}>`,
            to,
            subject: 'Welcome to Vyaapar AI',
            html: `
                <h1>Welcome to Vyaapar AI!</h1>
                <p>Hello ${firstName},</p>
                <p>Thank you for registering with Vyaapar AI. We're excited to have you on board!</p>
                <p>To get started:</p>
                <ul>
                    <li>Complete your profile</li>
                    <li>Connect your wallet</li>
                    <li>Explore available investment opportunities</li>
                </ul>
                <p>If you have any questions, our support team is here to help.</p>
                <p>Best regards,<br>Vyaapar AI Team</p>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Welcome email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending welcome email:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService();