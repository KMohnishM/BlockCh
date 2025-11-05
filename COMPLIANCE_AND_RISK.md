# Compliance & Risk Analysis — Vyaapar (codebase notes)

This document describes the current risk-analysis implementation, the validation changes I added, and recommended steps to meet legal/compliance requirements in India (KYC/AML/PMLA/data privacy). It also maps where the relevant code lives in the repository.

## Quick summary of actions taken
- Indexed the codebase and located registration, wallet, company and risk-related files.
- Implemented a configurable minimum wallet-balance check for wallet-based registration (`/auth/wallet-auth`).
  - Env var: `MIN_WALLET_BALANCE_ETH` (optional). If set > 0, wallet-auth will require that balance.
- Strengthened company registration valuation validation and added a configurable wallet-balance guard before on-chain minting.
  - `valuation` must be a positive number (server-side validator changed).
  - Env var: `MIN_WALLET_BALANCE_FOR_MINT_ETH` (optional) — when set, attempts to mint require the owner's wallet to hold at least that amount.

Files changed:
- `backend/routes/auth.js` — added blockchain service import and configurable wallet-balance check during `wallet-auth`.
- `backend/routes/companies.js` — changed `valuation` validation to require > 0 and added pre-mint wallet balance check.

## Where risk logic currently lives (code map)
- Frontend risk scoring (UI): `frontend/src/utils/formatters.js` — `getInvestmentRisk(investmentAmount, companyAge, industry)`
  - Simple heuristic: amount brackets, company age bands, industry weight (technology/biotech/crypto higher).
- Investment validation & business rules: `backend/routes/investments.js`
  - Validates `amount` is numeric and > 0.
  - Ensures company exists, is active, investor is not owner.
  - Calculates ownership percentage and records investment (blockchain or traditional).
- Company registration and on-chain mint: `backend/routes/companies.js`
  - Validates name, description, industry, valuation.
  - Attempts blockchain mint via `backend/config/blockchain.js` when `useBlockchain` and `req.user.walletAddress`.
- Wallet auth and profile linking: `backend/routes/auth.js` and `backend/middleware/auth.js`
  - `wallet-auth` verifies signature and links/creates profile.

## What the new validations cover
1. Wallet balance on onboarding (wallet-auth)
   - If `MIN_WALLET_BALANCE_ETH` is set to a numeric value (e.g., `0.001`), the server will call the configured JSON-RPC provider (via `backend/config/blockchain.js`) and require the wallet to have at least that ETH balance before creating or linking the profile.
   - Rationale: prevents spam accounts / ensures wallets are funded enough to perform on-chain steps.
2. Company valuation
   - Now validated with `isFloat({ gt: 0 })` server-side to avoid zero/negative valuations.
3. Pre-minting wallet balance
   - If `MIN_WALLET_BALANCE_FOR_MINT_ETH` is set, registering a company with `useBlockchain=true` will require the owner's wallet to have at least that balance before attempting mint (gas/reserve check).

Notes: both balance checks are configurable and intentionally permissive when env vars are not set (default behavior unchanged).

## Risk analysis: current approach and suggested improvements
Current (code):
- Frontend `getInvestmentRisk` uses a small heuristic:
  - Amount tiers: >100k -> +2, >10k -> +1
  - Company age: <1y -> +3, <2y -> +2, <5y -> +1
  - Industry multiplier for high-risk industries
  - Combined score mapped to Low/Medium/High

Limitations:
- It's client-side only (inferred from UI code). It can be manipulated if used as authoritative.
- Uses static thresholds; no data-driven calibration.
- Does not incorporate financials (revenue, burn rate), corporate governance, KYC status, or investor history.

Recommendations (short-term):
1. Move the canonical risk score calculation to backend (so it is authoritative), while continuing to show it in the frontend.
   - Implement an API endpoint `/analytics/risk` or include `riskScore` in company responses.
2. Enrich risk factors:
   - Company age, valuation, historical funding rounds, traction (revenue, users), milestone verification, industry risk, governance (founders verified), KYC status, on-chain activity.
3. Make thresholds configurable and configurable per region (so legal thresholds can be adapted).
4. Add periodic re-evaluation (cron job or event-driven) to recalc risk as new investments/milestones come in.
5. Consider risk score explainability (store component scores) for UI transparency.

Data-driven (medium-term):
- Train a simple model (e.g., logistic regression or gradient-boosted tree) using labeled historic outcomes (defaults, exits, fraud). Start with a PoC offline; then expose scoring via an internal service.

## India legal compliance — high level (non-legal advice)
Important: this is a technical checklist and high-level guidance. You must consult qualified legal counsel for binding requirements.

Areas to cover when operating an investment platform in India:

1. KYC / Customer Identification
   - Implement KYC for investors and company owners before allowing them to receive investments or make large transactions.
   - Use certified KYC providers (Aadhaar eKYC / video-KYC / third-party KYC vendors). Store KYC status and metadata in `profiles` (e.g., `kyc_status`, `kyc_provider`, `kyc_reference_id`).
   - Tie wallet ownership verification with KYC: ensure the wallet used for investments is linked to a KYC-verified identity for amounts above thresholds.

2. AML / PMLA / Suspicious Transaction Monitoring
   - Implement AML rules and thresholds for monitoring (e.g., flag transactions above certain INR/crypto thresholds).
   - Maintain audit logs and transaction histories.
   - Create a process to report suspicious transactions to the Financial Intelligence Unit (FIU-IND) as per local regulations.

3. Regulatory permissions & security laws
   - Determine whether the platform’s activities (raising capital, facilitating investments) require registration with SEBI, RBI, or other regulators depending on the product structure (debt/equity/collective investment schemes).
   - Tokenization of securities may fall under securities regulation — consult counsel.

4. Payments & crypto handling
   - If you accept fiat investments, integrate regulated payment providers and follow RBI rules.
   - If you accept crypto/ETH, check the current regulatory posture in India (taxation, reporting, possible restrictions). Ensure proper AML checks for crypto flows.

5. Data protection & privacy
   - Keep PII encrypted at rest where possible.
   - Limit data retention and maintain access logs.
   - If India’s data protection law applies (e.g., DPDP or other laws), implement data subject rights handling, purpose limitation, and secure transfer rules.

6. Records & retention
   - Maintain transaction records, KYC & onboarding evidence, and logs for the legally required retention period.

7. Contracts & disclosures
   - Provide investor agreements, risk disclosures, and terms of use tailored per jurisdiction. Get legal review.

## Practical implementation checklist (developer-friendly)
Short checklist to harden the platform for compliance and risk management:

- [ ] Add `kyc_status`, `kyc_provider`, `kyc_reference_id`, `kyc_verified_at` columns to `profiles` table.
- [ ] On registration, enforce KYC for any user who will: create a company, raise > X INR, or invest > Y INR.
  - Wire the KYC provider callbacks to update `profiles.kyc_status`.
- [ ] Add `txn_log` table / use `user_activities` to record all investment/mint/withdraw actions with full metadata.
- [ ] Implement server-side risk scoring endpoint and include `riskScore` in company and portfolio endpoints.
- [ ] Implement AML rules (simple thresholds first), create a `suspicious_events` table and an admin review UI.
- [ ] Require KYC and set `kyc_required` flags for roles and thresholds.
- [ ] Integrate a third-party KYC provider (example candidates: Onfido, ShuftiPro, Signzy, local providers). For Aadhaar flows, follow UIDAI guidelines and security rules.
- [ ] Add admin tools to manually review flagged companies/investors.
- [ ] Document retention policy and export capability for legal requests.

## How the codebase can implement these steps (concrete pointers)
- Add authorization checks in `backend/routes/investments.js` and `backend/routes/companies.js` to require `profile.kyc_status === 'verified'` for certain actions.
- Add `riskScore` calculation service (new module `backend/services/risk.js`) and call it when returning company lists or when investments are submitted.
- Persist KYC metadata in `profiles` table and show status in `frontend` user profile components.
- Add configuration via environment variables for thresholds: `MIN_WALLET_BALANCE_ETH`, `MIN_WALLET_BALANCE_FOR_MINT_ETH`, `KYC_REQUIRED_FOR_INVESTMENT_ABOVE_INR`, etc.

## Next steps I can do for you
- Implement a backend `risk` service and expose `riskScore` for companies (small PR).
- Add KYC status fields to the Supabase schema and wire them into registration and investment flows (DB migration + API updates).
- Implement server-side wallet-balance checks for minting and investment (we already added onboarding & mint checks; I can extend to investments as needed).
- Draft a short privacy & compliance checklist tailored for fundraising/SEC-like workflows to share with legal counsel.

If you want, I can now:
- Run and test the updated endpoints locally (I may need env vars like `BLOCKCHAIN_RPC_URL` and Supabase keys), or
- Implement the `risk` backend endpoint and a backend unit test for the wallet-balance checks.

---
*This document is a developer-oriented summary and not legal advice.*
