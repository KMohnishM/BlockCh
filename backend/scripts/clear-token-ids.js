// Script to clear blockchain token IDs and reset verification status

console.log('🧹 Blockchain Token ID Cleanup Script');
console.log('=====================================\n');

console.log('⚠️  WARNING: This will reset blockchain verification for companies');
console.log('📋 Use this to resolve token ID conflicts and start fresh\n');

console.log('🔍 STEP 1: Check current blockchain data');
console.log('SELECT id, name, blockchain_token_id, blockchain_tx_hash, is_blockchain_verified');
console.log('FROM companies WHERE blockchain_token_id IS NOT NULL OR is_blockchain_verified = true;');
console.log('');

console.log('🧹 STEP 2: Clear ALL blockchain token IDs (CAUTION!)');
console.log('-- This removes blockchain verification from ALL companies');
console.log('UPDATE companies SET');
console.log('    blockchain_token_id = NULL,');
console.log('    blockchain_tx_hash = NULL,');
console.log('    is_blockchain_verified = false,');
console.log('    updated_at = NOW();');
console.log('');

console.log('🎯 STEP 3: Clear SPECIFIC company token ID (SAFER OPTION)');
console.log('-- Only clear the conflicting company');
console.log('UPDATE companies SET');
console.log('    blockchain_token_id = NULL,');
console.log('    blockchain_tx_hash = NULL,');
console.log('    is_blockchain_verified = false,');
console.log('    updated_at = NOW()');
console.log('WHERE blockchain_token_id = \'0\';');
console.log('');

console.log('🔧 STEP 4: Clear by company ID');
console.log('-- Clear specific company by ID');
console.log('UPDATE companies SET');
console.log('    blockchain_token_id = NULL,');
console.log('    blockchain_tx_hash = NULL,');
console.log('    is_blockchain_verified = false,');
console.log('    updated_at = NOW()');
console.log('WHERE id = \'dc818d46-e515-4eaf-bf26-811817cd612c\';');
console.log('');

console.log('✅ STEP 5: Verify cleanup');
console.log('SELECT id, name, blockchain_token_id, blockchain_tx_hash, is_blockchain_verified');
console.log('FROM companies WHERE id = \'dc818d46-e515-4eaf-bf26-811817cd612c\';');
console.log('');

console.log('📝 STEP 6: After cleanup, re-apply the correct data');
console.log('UPDATE companies SET');
console.log('    blockchain_token_id = \'0\',');
console.log('    blockchain_tx_hash = \'0x5b95af0fc9ce31a1d73c41b0cc671cd23556be6504759882da5e65be55c192d5\',');
console.log('    is_blockchain_verified = true,');
console.log('    updated_at = NOW()');
console.log('WHERE id = \'dc818d46-e515-4eaf-bf26-811817cd612c\';');
console.log('');

console.log('🚀 RECOMMENDED PROCESS:');
console.log('1. Run STEP 1 to see current state');
console.log('2. Choose STEP 2 (clear all) or STEP 3 (clear conflicting) based on your needs');
console.log('3. Run STEP 5 to verify cleanup worked');
console.log('4. Run STEP 6 to set the correct blockchain data');
console.log('5. Test investment functionality');
console.log('');

console.log('💡 SAFER ALTERNATIVE - Clear only the conflicting entry:');
console.log('DELETE FROM companies WHERE blockchain_token_id = \'0\' AND name != \'a0\';');
console.log('-- This removes any other companies incorrectly using token ID 0');
console.log('');

console.log('⚡ QUICK FIX - Force update ignoring constraint:');
console.log('-- Clear the conflict first, then update');
console.log('UPDATE companies SET blockchain_token_id = NULL WHERE blockchain_token_id = \'0\';');
console.log('UPDATE companies SET');
console.log('    blockchain_token_id = \'0\',');
console.log('    blockchain_tx_hash = \'0x5b95af0fc9ce31a1d73c41b0cc671cd23556be6504759882da5e65be55c192d5\',');
console.log('    is_blockchain_verified = true');
console.log('WHERE id = \'dc818d46-e515-4eaf-bf26-811817cd612c\';');
console.log('');

console.log('🎯 COPY-PASTE READY COMMANDS:');
console.log('============================================');
console.log('-- Quick fix (recommended):');
console.log('UPDATE companies SET blockchain_token_id = NULL WHERE blockchain_token_id = \'0\';');
console.log('UPDATE companies SET blockchain_token_id = \'0\', blockchain_tx_hash = \'0x5b95af0fc9ce31a1d73c41b0cc671cd23556be6504759882da5e65be55c192d5\', is_blockchain_verified = true WHERE id = \'dc818d46-e515-4eaf-bf26-811817cd612c\';');
console.log('SELECT id, name, blockchain_token_id, is_blockchain_verified FROM companies WHERE id = \'dc818d46-e515-4eaf-bf26-811817cd612c\';');