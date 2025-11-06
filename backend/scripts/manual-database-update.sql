-- Manual Database Update for Successful Blockchain Mint
-- Run this SQL command in your Supabase dashboard or database client

-- Update the company that was successfully minted on blockchain
-- Company ID: dc818d46-e515-4eaf-bf26-811817cd612c
-- Token ID: 0 (from successful mint)
-- TX Hash: 0x5b95af0fc9ce31a1d73c41b0cc671cd23556be6504759882da5e65be55c192d5

UPDATE companies 
SET 
    blockchain_token_id = '0',
    blockchain_tx_hash = '0x5b95af0fc9ce31a1d73c41b0cc671cd23556be6504759882da5e65be55c192d5',
    is_blockchain_verified = true,
    updated_at = NOW()
WHERE id = 'dc818d46-e515-4eaf-bf26-811817cd612c';

-- Verify the update
SELECT id, name, blockchain_token_id, blockchain_tx_hash, is_blockchain_verified 
FROM companies 
WHERE id = 'dc818d46-e515-4eaf-bf26-811817cd612c';