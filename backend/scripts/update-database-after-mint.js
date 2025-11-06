const { supabase, supabaseAdmin } = require('../config/supabase');
require('dotenv').config();

async function updateDatabaseAfterMinting() {
    try {
        console.log('🔄 Starting database update for minted companies...');
        
        // Find companies that might need updating (blockchain verified but missing token data)
        const { data: companies, error: fetchError } = await supabase
            .from('companies')
            .select('id, name, blockchain_token_id, blockchain_tx_hash, is_blockchain_verified')
            .or('blockchain_token_id.is.null,is_blockchain_verified.eq.false');
        
        if (fetchError) {
            console.error('❌ Error fetching companies:', fetchError);
            return;
        }
        
        console.log(`📊 Found ${companies.length} companies that might need updating:`);
        companies.forEach((company, index) => {
            console.log(`${index + 1}. ${company.name} (ID: ${company.id})`);
            console.log(`   - Token ID: ${company.blockchain_token_id || 'NOT SET'}`);
            console.log(`   - Blockchain Verified: ${company.is_blockchain_verified ? '✅' : '❌'}`);
            console.log(`   - TX Hash: ${company.blockchain_tx_hash || 'NOT SET'}`);
        });
        
        // If you know specific details from the successful mint, update here
        const companyId = 'dc818d46-e515-4eaf-bf26-811817cd612c'; // From your earlier error log
        const tokenId = '0'; // From the successful mint log
        const txHash = '0x5b95af0fc9ce31a1d73c41b0cc671cd23556be6504759882da5e65be55c192d5'; // From the successful mint log
        
        console.log(`\n🎯 Updating specific company: ${companyId}`);
        console.log(`   - Setting Token ID: ${tokenId}`);
        console.log(`   - Setting TX Hash: ${txHash}`);
        
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('companies')
            .update({
                blockchain_token_id: tokenId,
                blockchain_tx_hash: txHash,
                is_blockchain_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', companyId)
            .select('id, name, blockchain_token_id, is_blockchain_verified, blockchain_tx_hash')
            .single();
        
        if (updateError) {
            console.error('❌ Error updating company:', updateError);
            
            // Try with regular supabase client (non-admin)
            console.log('🔄 Trying with regular supabase client...');
            const { data: updated2, error: updateError2 } = await supabase
                .from('companies')
                .update({
                    blockchain_token_id: tokenId,
                    blockchain_tx_hash: txHash,
                    is_blockchain_verified: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', companyId)
                .select('id, name, blockchain_token_id, is_blockchain_verified, blockchain_tx_hash')
                .single();
                
            if (updateError2) {
                console.error('❌ Error with regular client too:', updateError2);
            } else {
                console.log('✅ Updated successfully with regular client:', updated2);
            }
        } else {
            console.log('✅ Updated successfully with admin client:', updated);
        }
        
        // Verify the update
        console.log('\n🔍 Verifying update...');
        const { data: verification, error: verifyError } = await supabase
            .from('companies')
            .select('id, name, blockchain_token_id, is_blockchain_verified, blockchain_tx_hash')
            .eq('id', companyId)
            .single();
            
        if (verifyError) {
            console.error('❌ Error verifying update:', verifyError);
        } else {
            console.log('📋 Current company state:');
            console.log(`   - Name: ${verification.name}`);
            console.log(`   - Token ID: ${verification.blockchain_token_id}`);
            console.log(`   - Blockchain Verified: ${verification.is_blockchain_verified ? '✅' : '❌'}`);
            console.log(`   - TX Hash: ${verification.blockchain_tx_hash}`);
        }
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

// Run the update
updateDatabaseAfterMinting();