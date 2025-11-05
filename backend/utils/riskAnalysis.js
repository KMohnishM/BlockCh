const { supabase } = require('../config/supabase');

class RiskAnalysis {
    // Calculate company risk score based on multiple factors
    async calculateCompanyRiskScore(companyData) {
        let score = 100; // Start with perfect score
        let deductions = [];

        try {
            // Get CIN verification data
            const { data: cinVerification } = await supabase
                .from('company_verifications')
                .select('*')
                .eq('company_id', companyData.id)
                .maybeSingle();

            // CIN Verification Status (35 points total)
            if (!cinVerification) {
                score -= 35;
                deductions.push({
                    factor: 'CIN Verification',
                    points: 35,
                    reason: 'CIN verification not completed'
                });
            } else {
                // Registration status check (20 points)
                if (cinVerification.status !== 'Active') {
                    score -= 20;
                    deductions.push({
                        factor: 'Registration Status',
                        points: 20,
                        reason: 'Company not active',
                        details: `Current status: ${cinVerification.status || 'Unknown'}`
                    });
                }

                // Company age check (15 points)
                const incorporationDate = cinVerification.incorporation_date
                    ? new Date(cinVerification.incorporation_date)
                    : new Date(companyData.created_at);

                const ageInYears = (new Date() - incorporationDate) / (1000 * 60 * 60 * 24 * 365);
                if (ageInYears < 1) {
                    score -= 15;
                    deductions.push({
                        factor: 'Company Age',
                        points: 15,
                        reason: 'Company is less than 1 year old',
                        details: `Age: ${Math.round(ageInYears * 12)} months`
                    });
                } else if (ageInYears < 3) {
                    score -= 10;
                    deductions.push({
                        factor: 'Company Age',
                        points: 10,
                        reason: 'Company is less than 3 years old',
                        details: `Age: ${Math.round(ageInYears)} years`
                    });
                } else if (ageInYears < 5) {
                    score -= 5;
                    deductions.push({
                        factor: 'Company Age',
                        points: 5,
                        reason: 'Company is less than 5 years old',
                        details: `Age: ${Math.round(ageInYears)} years`
                    });
                }

                // Directors background check (15 points)
                if (!cinVerification.directors || cinVerification.directors.length === 0) {
                    score -= 15;
                    deductions.push({
                        factor: 'Directors',
                        points: 15,
                        reason: 'No directors information available'
                    });
                }
            }

            // Previous investment history (20 points)
            const { data: investments } = await supabase
                .from('investments')
                .select('*')
                .eq('company_id', companyData.id);
            
            if (!investments || investments.length === 0) {
                score -= 20;
                deductions.push({
                    factor: 'Investment History',
                    points: 20,
                    reason: 'No previous investments'
                });
            } else if (investments.length < 3) {
                const deductionPoints = 20 - (investments.length * 7);
                score -= deductionPoints;
                deductions.push({
                    factor: 'Investment History',
                    points: deductionPoints,
                    reason: `Limited investment history`,
                    details: `${investments.length} previous investment(s)`
                });
            }

            // Financial metrics (15 points)
            if (!companyData.revenue || companyData.revenue <= 0) {
                score -= 15;
                deductions.push({
                    factor: 'Financial Metrics',
                    points: 15,
                    reason: 'No revenue reported'
                });
            }

            // Business email verification (15 points)
            if (!companyData.email_verified) {
                score -= 15;
                deductions.push({
                    factor: 'Email Verification',
                    points: 15,
                    reason: 'Business email not verified'
                });
            }

            // Ensure score stays within 0-100 range
            return {
                score: Math.max(0, Math.min(100, score)),
                deductions
            };
        } catch (error) {
            console.error('Error calculating risk score:', error);
            return {
                score: 0,
                deductions: [{
                    factor: 'System Error',
                    points: 100,
                    reason: 'Error calculating risk score',
                    details: error.message
                }]
            };
        }
        }

        getRiskLevel(score) {
            if (score >= 80) return 'LOW';
            if (score >= 60) return 'MODERATE';
            if (score >= 40) return 'HIGH';
            return 'VERY HIGH';
        }

        getRiskDescription(level) {
            switch (level) {
                case 'LOW':
                    return 'Well-established company with strong verification and track record';
                case 'MODERATE':
                    return 'Established company with some verification gaps or limited history';
                case 'HIGH':
                    return 'Company requires additional verification or has limited operational history';
                case 'VERY HIGH':
                    return 'Significant verification gaps or concerns identified';
                default:
                    return 'Risk level could not be determined';
            }
        }

        async generateRiskReport(companyId) {
            try {
                // Fetch company data with all needed relations
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

                // Calculate risk score and get deductions
                const { score, deductions } = await this.calculateCompanyRiskScore(company);
                const riskLevel = this.getRiskLevel(score);
                const riskDescription = this.getRiskDescription(riskLevel);

                // Generate report data
                const reportData = {
                    companyId,
                    companyName: company.name,
                    riskScore: score,
                    riskLevel,
                    riskDescription,
                    deductions,
                    verificationStatus: {
                        cinVerified: Boolean(company.company_verifications),
                        emailVerified: Boolean(company.email_verified),
                        blockchainVerified: Boolean(company.is_blockchain_verified),
                        domainVerified: Boolean(company.verified_domain)
                    },
                    metrics: {
                        companyAge: company.company_verifications?.incorporation_date 
                            ? new Date(company.company_verifications.incorporation_date)
                            : new Date(company.created_at),
                        investorCount: company.investor_count || 0,
                        totalInvestment: company.total_investment || 0,
                        revenue: company.revenue || 0
                    },
                    timestamp: new Date().toISOString()
                };

                // Store report in database
                await supabase
                    .from('risk_analysis_reports')
                    .insert({
                        company_id: companyId,
                        risk_score: score,
                        risk_level: riskLevel,
                        factors: {
                            deductions,
                            verification_status: reportData.verificationStatus,
                            metrics: reportData.metrics
                        }
                    });

                return reportData;

            } catch (error) {
                console.error('Error generating risk report:', error);
                throw error;
            }
        }
}

module.exports = new RiskAnalysis();