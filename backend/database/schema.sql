-- Vyaapar.AI Database Schema for Supabase
-- This schema should be executed in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  wallet_address VARCHAR(42) UNIQUE,
  investor_type VARCHAR(20) DEFAULT 'individual' CHECK (investor_type IN ('individual', 'accredited', 'institutional')),
  auth_method VARCHAR(20) DEFAULT 'email' CHECK (auth_method IN ('email', 'web3')),
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies table
CREATE TABLE companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  industry VARCHAR(100) NOT NULL,
  valuation DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_investment DECIMAL(15,2) DEFAULT 0,
  investor_count INTEGER DEFAULT 0,
  milestone_count INTEGER DEFAULT 0,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  blockchain_token_id VARCHAR(100) UNIQUE,
  blockchain_tx_hash VARCHAR(66),
  is_blockchain_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investments table
CREATE TABLE investments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  investor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  ownership_percentage DECIMAL(8,4) NOT NULL DEFAULT 0,
  investment_type VARCHAR(20) DEFAULT 'traditional' CHECK (investment_type IN ('traditional', 'blockchain')),
  blockchain_tx_hash VARCHAR(66),
  is_blockchain_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(company_id, investor_id, created_at) -- Prevent duplicate investments at same time
);

-- Milestones table
CREATE TABLE milestones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  milestone_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  valuation_impact DECIMAL(15,2) DEFAULT 0,
  blockchain_tx_hash VARCHAR(66),
  is_blockchain_verified BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  verification_notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Funding rounds table
CREATE TABLE funding_rounds (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  round_name VARCHAR(100) NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL CHECK (target_amount > 0),
  raised_amount DECIMAL(15,2) DEFAULT 0,
  valuation_cap DECIMAL(15,2),
  minimum_investment DECIMAL(15,2) DEFAULT 100,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activities table (for activity logs)
CREATE TABLE user_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences table
CREATE TABLE user_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  investment_alerts BOOLEAN DEFAULT TRUE,
  milestone_alerts BOOLEAN DEFAULT TRUE,
  newsletter_subscription BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company valuation history table
CREATE TABLE valuation_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  previous_valuation DECIMAL(15,2) NOT NULL,
  new_valuation DECIMAL(15,2) NOT NULL,
  change_reason VARCHAR(100),
  milestone_id UUID REFERENCES milestones(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_companies_owner ON companies(owner_id);
CREATE INDEX idx_companies_industry ON companies(industry);
CREATE INDEX idx_companies_blockchain_token ON companies(blockchain_token_id);
CREATE INDEX idx_investments_company ON investments(company_id);
CREATE INDEX idx_investments_investor ON investments(investor_id);
CREATE INDEX idx_milestones_company ON milestones(company_id);
CREATE INDEX idx_funding_rounds_company ON funding_rounds(company_id);
CREATE INDEX idx_user_activities_user ON user_activities(user_id);
CREATE INDEX idx_valuation_history_company ON valuation_history(company_id);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Companies policies
CREATE POLICY "Anyone can view active companies" ON companies FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage their companies" ON companies FOR ALL USING (auth.uid() = owner_id);

-- Investments policies
CREATE POLICY "Investors can view their investments" ON investments FOR SELECT USING (auth.uid() = investor_id);
CREATE POLICY "Company owners can view company investments" ON investments 
  FOR SELECT USING (auth.uid() IN (SELECT owner_id FROM companies WHERE id = company_id));
CREATE POLICY "Users can create investments" ON investments FOR INSERT WITH CHECK (auth.uid() = investor_id);

-- Milestones policies
CREATE POLICY "Anyone can view verified milestones" ON milestones FOR SELECT USING (verified = true);
CREATE POLICY "Company owners can manage milestones" ON milestones 
  FOR ALL USING (auth.uid() IN (SELECT owner_id FROM companies WHERE id = company_id));

-- Funding rounds policies
CREATE POLICY "Anyone can view active funding rounds" ON funding_rounds FOR SELECT USING (is_active = true);
CREATE POLICY "Company owners can manage funding rounds" ON funding_rounds 
  FOR ALL USING (auth.uid() IN (SELECT owner_id FROM companies WHERE id = company_id));

-- User activities policies
CREATE POLICY "Users can view own activities" ON user_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own activities" ON user_activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can manage own preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);

-- Valuation history policies
CREATE POLICY "Anyone can view valuation history" ON valuation_history FOR SELECT USING (true);
CREATE POLICY "Company owners can create valuation history" ON valuation_history 
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT owner_id FROM companies WHERE id = company_id));

-- Functions for common operations
CREATE OR REPLACE FUNCTION increment_investor_count(company_id UUID)
RETURNS INTEGER AS $$
BEGIN
  UPDATE companies 
  SET investor_count = (
    SELECT COUNT(DISTINCT investor_id) 
    FROM investments 
    WHERE company_id = $1
  )
  WHERE id = $1;
  
  RETURN (SELECT investor_count FROM companies WHERE id = $1);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_milestone_count(company_id UUID)
RETURNS INTEGER AS $$
BEGIN
  UPDATE companies 
  SET milestone_count = (
    SELECT COUNT(*) 
    FROM milestones 
    WHERE company_id = $1 AND verified = true
  )
  WHERE id = $1;
  
  RETURN (SELECT milestone_count FROM companies WHERE id = $1);
END;
$$ LANGUAGE plpgsql;

-- Function to get portfolio analytics
CREATE OR REPLACE FUNCTION get_portfolio_analytics(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'diversificationScore', COALESCE(
      (SELECT COUNT(DISTINCT c.industry) * 10.0 / GREATEST(COUNT(*), 1)
       FROM investments i
       JOIN companies c ON i.company_id = c.id
       WHERE i.investor_id = p_user_id), 0),
    'totalInvestments', COALESCE(
      (SELECT COUNT(*) FROM investments WHERE investor_id = p_user_id), 0),
    'totalAmount', COALESCE(
      (SELECT SUM(amount) FROM investments WHERE investor_id = p_user_id), 0),
    'sectorAllocation', COALESCE(
      (SELECT json_agg(
         json_build_object(
           'industry', industry,
           'count', count,
           'totalAmount', total_amount
         )
       )
       FROM (
         SELECT c.industry, COUNT(*) as count, SUM(i.amount) as total_amount
         FROM investments i
         JOIN companies c ON i.company_id = c.id
         WHERE i.investor_id = p_user_id
         GROUP BY c.industry
       ) sectors), '[]'::json)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_funding_rounds_updated_at BEFORE UPDATE ON funding_rounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
-- You can uncomment these to have some test data

/*
INSERT INTO profiles (id, email, first_name, last_name, investor_type) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'john@example.com', 'John', 'Doe', 'individual'),
  ('550e8400-e29b-41d4-a716-446655440001', 'jane@example.com', 'Jane', 'Smith', 'accredited');

INSERT INTO companies (id, name, description, industry, valuation, owner_id) VALUES
  ('660e8400-e29b-41d4-a716-446655440000', 'TechStart Inc', 'Revolutionary AI platform for businesses', 'Technology', 1000000, '550e8400-e29b-41d4-a716-446655440000'),
  ('660e8400-e29b-41d4-a716-446655440001', 'GreenEnergy Co', 'Sustainable energy solutions', 'Energy', 2000000, '550e8400-e29b-41d4-a716-446655440001');
*/