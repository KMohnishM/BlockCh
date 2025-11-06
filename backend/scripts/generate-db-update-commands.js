// Simple script to generate database update information
// Based on the successful blockchain mint from your logs

const successfulMints = [
    {
        companyId: 'dc818d46-e515-4eaf-bf26-811817cd612c',
        tokenId: '0', 
        txHash: '0x5b95af0fc9ce31a1d73c41b0cc671cd23556be6504759882da5e65be55c192d5',
        companyName: 'a0' // From your logs
    }
    // Add more entries here if you have other successful mints that failed to update DB
];

console.log('🎯 Database Update Information for Successful Blockchain Mints');
console.log('===============================================================\n');

successfulMints.forEach((mint, index) => {
    console.log(`📋 Update #${index + 1}: ${mint.companyName}`);
    console.log(`   Company ID: ${mint.companyId}`);
    console.log(`   Token ID: ${mint.tokenId}`);
    console.log(`   TX Hash: ${mint.txHash}`);
    console.log('');
    
    console.log('📝 SQL Command to run in Supabase dashboard:');
    console.log(`UPDATE companies SET `);
    console.log(`    blockchain_token_id = '${mint.tokenId}',`);
    console.log(`    blockchain_tx_hash = '${mint.txHash}',`);
    console.log(`    is_blockchain_verified = true,`);
    console.log(`    updated_at = NOW()`);
    console.log(`WHERE id = '${mint.companyId}';`);
    console.log('');
    
    console.log('🔍 Verification query:');
    console.log(`SELECT id, name, blockchain_token_id, blockchain_tx_hash, is_blockchain_verified`);
    console.log(`FROM companies WHERE id = '${mint.companyId}';`);
    console.log('\n' + '='.repeat(60) + '\n');
});

console.log('📌 Instructions:');
console.log('1. Go to your Supabase dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Run the UPDATE command above');
console.log('4. Run the verification query to confirm the update');
console.log('5. The company should now show as blockchain verified in your app');

console.log('\n✨ After updating, the company will have:');
console.log('   ✅ blockchain_token_id set to the minted token ID');
console.log('   ✅ blockchain_tx_hash with the transaction hash'); 
console.log('   ✅ is_blockchain_verified set to true');
console.log('   ✅ Investment functionality should work properly');