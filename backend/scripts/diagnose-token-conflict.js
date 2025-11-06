// Script to diagnose and resolve blockchain token ID conflicts

console.log('🔍 Database Token ID Conflict Diagnosis');
console.log('=====================================\n');

console.log('❌ ERROR: Token ID "0" already exists in database');
console.log('📋 This means one of the following happened:\n');

console.log('1️⃣ The update actually succeeded previously');
console.log('2️⃣ Another company already has token ID 0');
console.log('3️⃣ There was a partial update that needs cleanup\n');

console.log('🔍 DIAGNOSIS QUERIES - Run these in Supabase SQL Editor:\n');

console.log('📊 Query 1: Check which company currently has token ID "0"');
console.log('SELECT id, name, blockchain_token_id, blockchain_tx_hash, is_blockchain_verified');
console.log('FROM companies WHERE blockchain_token_id = \'0\';\n');

console.log('📊 Query 2: Check the specific company from your mint attempt');
console.log('SELECT id, name, blockchain_token_id, blockchain_tx_hash, is_blockchain_verified');
console.log('FROM companies WHERE id = \'dc818d46-e515-4eaf-bf26-811817cd612c\';\n');

console.log('📊 Query 3: Check all blockchain-verified companies');
console.log('SELECT id, name, blockchain_token_id, blockchain_tx_hash, is_blockchain_verified');
console.log('FROM companies WHERE is_blockchain_verified = true OR blockchain_token_id IS NOT NULL;\n');

console.log('🛠️ RESOLUTION OPTIONS:\n');

console.log('Option A: If your company (dc818d46-e515-4eaf-bf26-811817cd612c) already has the correct data:');
console.log('✅ No action needed - the update already worked!\n');

console.log('Option B: If another company has token ID "0" incorrectly:');
console.log('-- Clear the incorrect entry first');
console.log('UPDATE companies SET blockchain_token_id = NULL WHERE blockchain_token_id = \'0\' AND id != \'dc818d46-e515-4eaf-bf26-811817cd612c\';');
console.log('-- Then update your company');
console.log('UPDATE companies SET');
console.log('    blockchain_token_id = \'0\',');
console.log('    blockchain_tx_hash = \'0x5b95af0fc9ce31a1d73c41b0cc671cd23556be6504759882da5e65be55c192d5\',');
console.log('    is_blockchain_verified = true,');
console.log('    updated_at = NOW()');
console.log('WHERE id = \'dc818d46-e515-4eaf-bf26-811817cd612c\';\n');

console.log('Option C: If your company already has token ID "0":');
console.log('-- Just update the verification status');
console.log('UPDATE companies SET');
console.log('    blockchain_tx_hash = \'0x5b95af0fc9ce31a1d73c41b0cc671cd23556be6504759882da5e65be55c192d5\',');
console.log('    is_blockchain_verified = true,');
console.log('    updated_at = NOW()');
console.log('WHERE id = \'dc818d46-e515-4eaf-bf26-811817cd612c\';\n');

console.log('📌 STEPS TO RESOLVE:');
console.log('1. Run the diagnosis queries above');
console.log('2. Based on the results, choose the appropriate resolution option');
console.log('3. Test the investment functionality after updating');
console.log('4. The investment should work once the data is correct');

console.log('\n🎯 Expected Result After Fix:');
console.log('✅ Company "a0" should have:');
console.log('   - blockchain_token_id: "0"');
console.log('   - blockchain_tx_hash: "0x5b95af0fc9ce31a1d73c41b0cc671cd23556be6504759882da5e65be55c192d5"');
console.log('   - is_blockchain_verified: true');
console.log('   - Investment functionality should work');