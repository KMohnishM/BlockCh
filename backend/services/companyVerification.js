const axios = require('axios');
const { supabase } = require('../config/supabase');

class CompanyVerification {
    constructor() {
        this.INSTANT_BASIC_API_KEY = process.env.INSTANT_BASIC_API_KEY;
    }

    async verifyCIN(cin) {
        try {
            const response = await axios.get(`https://api.instantbasic.com/api/v1/company/${cin}`, {
                headers: {
                    'Authorization': `Bearer ${this.INSTANT_BASIC_API_KEY}`
                }
            });

            if (response.data && response.data.success) {
                return {
                    isValid: true,
                    companyData: {
                        name: response.data.company_name,
                        address: response.data.registered_address,
                        incorporation_date: response.data.date_of_incorporation,
                        status: response.data.status,
                        directors: response.data.directors || [],
                        pan: response.data.pan,
                        industry: response.data.industry_class
                    }
                };
            }
            return { isValid: false, error: 'Invalid CIN or company not found' };
        } catch (error) {
            console.error('CIN verification error:', error.message);
            return { isValid: false, error: error.message };
        }
    }

    async verifyBusinessEmail(email, domain) {
        try {
            // Verify domain ownership via email
            const verificationToken = Math.random().toString(36).substring(2, 15);
            
            // Store verification token in DB
            await supabase.from('email_verifications').insert({
                email,
                domain,
                token: verificationToken,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
            });

            // In production, send email with verification link
            console.log(`Would send verification email to ${email} with token ${verificationToken}`);

            return {
                status: 'pending',
                message: 'Verification email sent'
            };
        } catch (error) {
            console.error('Business email verification error:', error);
            return { status: 'error', error: error.message };
        }
    }

    // Verify stored email token
    async verifyEmailToken(email, token) {
        try {
            const { data: verification, error } = await supabase
                .from('email_verifications')
                .select('*')
                .eq('email', email)
                .eq('token', token)
                .single();

            if (error || !verification) {
                return { verified: false, error: 'Invalid or expired token' };
            }

            if (new Date(verification.expires_at) < new Date()) {
                return { verified: false, error: 'Token expired' };
            }

            // Mark as verified
            await supabase.from('email_verifications')
                .update({ verified_at: new Date().toISOString() })
                .eq('id', verification.id);

            return { verified: true };
        } catch (error) {
            console.error('Email token verification error:', error);
            return { verified: false, error: error.message };
        }
    }
}

module.exports = new CompanyVerification();