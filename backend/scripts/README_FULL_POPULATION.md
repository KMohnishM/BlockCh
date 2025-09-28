# 📊 Complete Database Population from JSON

This guide explains how your JSON data populates all database tables to create a complete investment platform dataset.

## 🎯 Data Mapping Overview

### Your JSON Structure → Database Tables

```json
{
    "CompanyName": "1Bridge",              // → companies.name
    "Headquarters": "Bengaluru",           // → Used in description
    "Employees": 43,                       // → Milestone creation
    "Industry": "Consumer Tech",           // → companies.industry
    "Founded At": 2016,                    // → Used in description
    "Status": 1,                           // → companies.is_active
    "Total Funding": 24.42,                // → companies.valuation + funding_rounds
    "Funding Rounds": 4,                   // → Multiple funding_rounds records
    "Number of Acquisitions": 1,           // → milestones records
    "FY 2022-23 Revenue": 72.39,          // → milestones records
    "Profit_Loss": -6.59,                  // → milestones records
    "Latest Funding Round": "Seed",        // → funding_rounds.round_name
    "FY 2022-23 Expenses": 78.98,         // → Used in calculations
    "Net Cash Flow From Operations": -4.64, // → Used in milestones
    "id": 1                                // → Original reference (not used)
}
```

## 📋 Table Population Details

### 1. **Companies Table** ✅ (Already Done)
```sql
INSERT INTO companies (
    name,                    -- "1Bridge"
    industry,               -- "Consumer Tech" 
    valuation,              -- 24.42
    is_active,              -- true (Status: 1)
    description             -- Generated description
);
```

### 2. **Funding Rounds Table** 🆕
**From**: `"Funding Rounds": 4, "Total Funding": 24.42, "Latest Funding Round": "Seed"`

```sql
-- Creates 4 funding rounds for 1Bridge:
INSERT INTO funding_rounds (
    company_id,             -- Links to companies.id
    round_name,             -- "Pre-Seed", "Seed", "Series A", etc.
    target_amount,          -- 24.42 / 4 = ~6.1M per round
    raised_amount,          -- 70-100% of target (randomized)
    valuation_cap,          -- 3-5x target amount
    start_time,             -- Random dates 2020-2023
    end_time,               -- Random dates 2023-2024
    is_completed            -- true
);
```

### 3. **Investments Table** 🆕
**From**: `"Total Funding": 24.42, "Funding Rounds": 4`

```sql
-- Creates simulated investments totaling 24.42M:
INSERT INTO investments (
    company_id,             -- Links to companies.id
    investor_id,            -- System/default investor
    amount,                 -- Portion of total funding
    ownership_percentage,   -- Calculated from amount/valuation
    investment_type,        -- "traditional"
    created_at              -- Random dates 2020-2024
);
```

### 4. **Milestones Table** 🆕
**From**: `"Number of Acquisitions": 1, "FY 2022-23 Revenue": 72.39, "Profit_Loss": -6.59, "Employees": 43`

```sql
-- Creates multiple milestone types:

-- Acquisition Milestone (1 acquisition)
INSERT INTO milestones (
    milestone_type,         -- "Acquisition"
    description,            -- "Successfully completed acquisition #1"
    valuation_impact,       -- 0.1 (10% increase)
    verified                -- true
);

-- Revenue Milestone
INSERT INTO milestones (
    milestone_type,         -- "Revenue Target"
    description,            -- "Achieved ₹72.39M revenue in FY 2022-23"
    valuation_impact,       -- 0.1 or 0.2 based on amount
    verified                -- true
);

-- Team Growth Milestone (if employees > 50)
INSERT INTO milestones (
    milestone_type,         -- "Team Growth"
    description,            -- "Scaled team to 50+ employees"
    valuation_impact,       -- 0.05
    verified                -- true
);
```

### 5. **Valuation History Table** 🆕
**From**: `"Funding Rounds": 4, "Total Funding": 24.42`

```sql
-- Creates valuation progression through funding rounds:
INSERT INTO valuation_history (
    company_id,             -- Links to companies.id
    previous_valuation,     -- Starting valuation
    new_valuation,          -- 1.5-2.5x growth per round
    change_reason,          -- "Funding Round 1", "Funding Round 2", etc.
    created_at              -- Sequential dates
);
```

## 🚀 How to Run Complete Population

### Step 1: Run the Population Script
```bash
cd backend
npm run populate-all-tables
```

### Step 2: Verify the Data
After running, you'll have:
- **609 companies** (already done)
- **~2,400+ funding rounds** (4 avg per company)
- **~6,000+ investments** (simulated investor participation)
- **~1,800+ milestones** (acquisitions, revenue, team growth)
- **~2,400+ valuation history** records

## 📊 Expected Results

### For "1Bridge" specifically:
- **Company**: ✅ Already exists
- **Funding Rounds**: 4 rounds (Pre-Seed → Seed → Series A → Series B)
- **Investments**: ~8 investment records totaling $24.42M
- **Milestones**: 
  - 1 acquisition milestone
  - 1 revenue milestone (₹72.39M)
  - No profitability milestone (negative profit)
  - No team milestone (43 employees < 50)
- **Valuation History**: 4 records showing growth

### Platform Features Enabled:
✅ **Company Listings** - Browse all companies
✅ **Investment Tracking** - See who invested what
✅ **Milestone Progress** - Company achievements
✅ **Funding History** - Round-by-round funding
✅ **Valuation Trends** - Growth over time
✅ **Portfolio Analytics** - Investment performance
✅ **Search & Filtering** - By industry, funding stage, etc.

## ⚠️ Important Notes

1. **Simulated Data**: Investments and dates are randomized for demonstration
2. **Single Owner**: All companies use the same system owner (you can change this)
3. **Conservative Estimates**: Ownership percentages capped at 15% per investment
4. **Realistic Ratios**: Valuations and funding amounts maintain realistic relationships

## 🔍 Verification Queries

After population, test with:

```sql
-- Check 1Bridge's complete data
SELECT 
    c.name,
    c.industry,
    c.valuation,
    COUNT(DISTINCT fr.id) as funding_rounds,
    COUNT(DISTINCT i.id) as investments,
    COUNT(DISTINCT m.id) as milestones,
    SUM(i.amount) as total_raised
FROM companies c
LEFT JOIN funding_rounds fr ON c.id = fr.company_id
LEFT JOIN investments i ON c.id = i.company_id
LEFT JOIN milestones m ON c.id = m.company_id
WHERE c.name = '1Bridge'
GROUP BY c.id;
```

Ready to populate all tables? Run the script and you'll have a fully functional investment platform database! 🎉