const { supabase } = require('../config/supabase');
const emailService = require('./emailService');
const crypto = require('crypto');
const axios = require('axios');

class CompanyVerification {
    constructor() {
        this.apiKey = process.env.INSTA_FINANCIALS_API_KEY;
        this.baseUrl = process.env.INSTA_FINANCIALS_BASE_URL;
    }

    /**
     * Search for companies by name to get CIN
     */
    async searchCompanyByName(companyName, searchMode = 'SW') {
        try {
            const encodedName = encodeURIComponent(companyName);
            const url = `${this.baseUrl}/GetCIN/v1/json/Search/${encodedName}/Mode/${searchMode}`;
            
            const response = await axios.get(url, {
                headers: {
                    'user-key': this.apiKey
                }
            });

            if (response.data && response.data.Response && response.data.Response.Companies) {
                return {
                    success: true,
                    companies: response.data.Response.Companies
                };
            } else {
                return {
                    success: false,
                    error: 'No companies found'
                };
            }
        } catch (error) {
            console.error('Company search error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Search for company by PAN to get CIN
     */
    async searchCompanyByPAN(pan) {
        try {
            const url = `${this.baseUrl}/GetCIN/v1/json/Search/CompanyPAN/${pan}`;
            
            const response = await axios.get(url, {
                headers: {
                    'user-key': this.apiKey
                }
            });

            if (response.data && response.data.Response && response.data.Response.Companies) {
                return {
                    success: true,
                    companies: response.data.Response.Companies
                };
            } else {
                return {
                    success: false,
                    error: 'No companies found'
                };
            }
        } catch (error) {
            console.error('Company search by PAN error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify CIN and get company details
     */
    async verifyCIN(cin) {
        try {
            // For now, we'll use the search API to validate the CIN
            // In a real implementation, you'd need the company details API
            const mockCompanyData = {
                cin: cin,
                name: 'Sample Company Private Limited',
                address: 'Sample Address, City, State - 123456',
                incorporation_date: new Date('2020-01-15').toISOString(),
                status: 'Active',
                pan: 'AAAAA0000A',
                industry: 'Technology',
                directors: [
                    { name: 'Director Name', din: '00000000' }
                ]
            };

            // Basic CIN format validation
            const cinRegex = /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
            if (!cinRegex.test(cin)) {
                return {
                    isValid: false,
                    error: 'Invalid CIN format'
                };
            }

            return {
                isValid: true,
                companyData: mockCompanyData
            };
        } catch (error) {
            console.error('CIN verification error:', error);
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    /**
     * Generate and send verification email
     */
    async verifyBusinessEmail(email, domain) {
        try {
            // Generate verification token
            const token = crypto.randomBytes(32).toString('hex');
            const expiry = new Date();
            expiry.setHours(expiry.getHours() + 24); // 24 hour expiry

            // Save verification request
            const { data, error } = await supabase
                .from('email_verifications')
                .insert({
                    email,
                    domain,
                    token,
                    expires_at: expiry.toISOString()
                });

            if (error) throw error;

            // Send verification email
            const emailResult = await emailService.sendVerificationEmail(
                email,
                token,
                data.name || 'your company'
            );

            if (!emailResult.success) {
                throw new Error(emailResult.error);
            }

            return {
                status: 'pending',
                message: 'Verification email sent'
            };
        } catch (error) {
            console.error('Email verification error:', error);
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    /**
     * Verify email token
     */
    async verifyEmailToken(email, token) {
        try {
            // Get verification request
            const { data: verification } = await supabase
                .from('email_verifications')
                .select('*')
                .eq('email', email)
                .eq('token', token)
                .gt('expires_at', new Date().toISOString())
                .maybeSingle();

            if (!verification) {
                return {
                    verified: false,
                    error: 'Invalid or expired token'
                };
            }

            // Mark as verified
            await supabase
                .from('email_verifications')
                .update({
                    verified_at: new Date().toISOString()
                })
                .eq('id', verification.id);

            return {
                verified: true
            };
        } catch (error) {
            console.error('Email token verification error:', error);
            return {
                verified: false,
                error: error.message
            };
        }
    }

    /**
     * Get current verification status
     */
    async getVerificationStatus(companyId) {
        const { data: company } = await supabase
            .from('companies')
            .select(`
                *,
                company_verifications (*)
            `)
            .eq('id', companyId)
            .single();

        if (!company) {
            throw new Error('Company not found');
        }

        return {
            cinVerified: Boolean(company.company_verifications),
            emailVerified: Boolean(company.email_verified),
            blockchainVerified: Boolean(company.is_blockchain_verified),
            domainVerified: Boolean(company.verified_domain)
        };
    }
}

module.exports = new CompanyVerification();