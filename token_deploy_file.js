// hnh-token-deploy.js
const { 
    Connection, 
    Keypair, 
    PublicKey,
    clusterApiUrl
} = require('@solana/web3.js');

const { 
    createMint,
    mintTo,
    getOrCreateAssociatedTokenAccount,
    TOKEN_PROGRAM_ID 
} = require('@solana/spl-token');

const fs = require('fs');
const os = require('os');
const path = require('path');

async function deployHNHToken() {
    try {
        console.log('🚀 Deploying HNH Token on Solana Devnet...');
        
        // Connect to devnet
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        
        // Generate a new keypair for this demo (in production, use your real wallet)
        const payer = Keypair.generate();
        console.log('Generated wallet:', payer.publicKey.toString());
        
        // Request airdrop for deployment fees
        console.log('Requesting airdrop...');
        const signature = await connection.requestAirdrop(payer.publicKey, 2000000000); // 2 SOL
        await connection.confirmTransaction(signature);
        
        const balance = await connection.getBalance(payer.publicKey);
        console.log('Wallet balance:', balance / 1000000000, 'SOL');
        
        // Create the HNH token mint
        console.log('Creating HNH token mint...');
        const mint = await createMint(
            connection,
            payer,              // Payer
            payer.publicKey,    // Mint authority
            payer.publicKey,    // Freeze authority  
            9                   // Decimals
        );
        
        console.log('✅ HNH Token Mint Address:', mint.toString());
        
        // Create associated token account for the mint authority
        console.log('Creating token account...');
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            mint,
            payer.publicKey
        );
        
        // Mint initial supply (1 billion tokens)
        console.log('Minting initial supply...');
        const initialSupply = BigInt(1_000_000_000) * BigInt(10 ** 9); // 1B tokens with 9 decimals
        
        await mintTo(
            connection,
            payer,
            mint,
            tokenAccount.address,
            payer.publicKey,
            initialSupply
        );
        
        console.log('✅ Minted 1,000,000,000 HNH tokens');
        
        // Save deployment information
        const deployment = {
            network: 'devnet',
            mintAddress: mint.toString(),
            tokenAccount: tokenAccount.address.toString(),
            mintAuthority: payer.publicKey.toString(),
            decimals: 9,
            totalSupply: '1000000000',
            deployedAt: new Date().toISOString(),
            // Save the keypair for pool operations
            keypair: Array.from(payer.secretKey)
        };
        
        fs.writeFileSync('hnh-deployment.json', JSON.stringify(deployment, null, 2));
        console.log('💾 Deployment info saved to hnh-deployment.json');
        
        console.log('\n🎉 HNH Token deployed successfully!');
        console.log('📋 Summary:');
        console.log('   Token Address:', mint.toString());
        console.log('   Total Supply: 1,000,000,000 HNH');
        console.log('   Network: Solana Devnet');
        console.log('   Decimals: 9');
        
        return deployment;
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

// Run deployment
if (require.main === module) {
    deployHNHToken().catch(console.error);
}

module.exports = deployHNHToken;