import { authService } from '../services/authService.js';

console.log('=== Token Hashing Security Tests ===\n');

async function testEmailVerificationTokenHashing() {
    console.log('Test 1: Email Verification Token Hashing');
    
    const plainToken = authService.generateEmailVerificationToken();
    const hashedToken1 = authService.hashToken(plainToken);
    const hashedToken2 = authService.hashToken(plainToken);
    
    console.log('✓ Plain token (first 20 chars):', plainToken.substring(0, 20) + '...');
    console.log('✓ Hashed token (first 20 chars):', hashedToken1.substring(0, 20) + '...');
    console.log('✓ Plain token length:', plainToken.length, 'characters');
    console.log('✓ Hashed token length:', hashedToken1.length, 'characters');
    console.log('✓ Hash is deterministic:', hashedToken1 === hashedToken2 ? 'PASS' : 'FAIL');
    console.log('✓ Hash is different from plain:', hashedToken1 !== plainToken ? 'PASS' : 'FAIL');
    console.log('');
    
    return { plainToken, hashedToken: hashedToken1 };
}

async function testPasswordResetTokenHashing() {
    console.log('Test 2: Password Reset Token Hashing');
    
    const plainToken = authService.generatePasswordResetToken();
    const hashedToken1 = authService.hashToken(plainToken);
    const hashedToken2 = authService.hashToken(plainToken);
    
    console.log('✓ Plain token (first 20 chars):', plainToken.substring(0, 20) + '...');
    console.log('✓ Hashed token (first 20 chars):', hashedToken1.substring(0, 20) + '...');
    console.log('✓ Plain token length:', plainToken.length, 'characters');
    console.log('✓ Hashed token length:', hashedToken1.length, 'characters');
    console.log('✓ Hash is deterministic:', hashedToken1 === hashedToken2 ? 'PASS' : 'FAIL');
    console.log('✓ Hash is different from plain:', hashedToken1 !== plainToken ? 'PASS' : 'FAIL');
    console.log('');
    
    return { plainToken, hashedToken: hashedToken1 };
}

async function testHashUniqueness() {
    console.log('Test 3: Hash Uniqueness');
    
    const token1 = authService.generateEmailVerificationToken();
    const token2 = authService.generateEmailVerificationToken();
    const hash1 = authService.hashToken(token1);
    const hash2 = authService.hashToken(token2);
    
    console.log('✓ Token 1 (first 20 chars):', token1.substring(0, 20) + '...');
    console.log('✓ Token 2 (first 20 chars):', token2.substring(0, 20) + '...');
    console.log('✓ Hash 1 (first 20 chars):', hash1.substring(0, 20) + '...');
    console.log('✓ Hash 2 (first 20 chars):', hash2.substring(0, 20) + '...');
    console.log('✓ Tokens are different:', token1 !== token2 ? 'PASS' : 'FAIL');
    console.log('✓ Hashes are different:', hash1 !== hash2 ? 'PASS' : 'FAIL');
    console.log('');
}

async function testHashProperties() {
    console.log('Test 4: SHA-256 Hash Properties');
    
    const shortToken = 'abc';
    const longToken = 'a'.repeat(1000);
    const shortHash = authService.hashToken(shortToken);
    const longHash = authService.hashToken(longToken);
    
    console.log('✓ Short token length:', shortToken.length);
    console.log('✓ Long token length:', longToken.length);
    console.log('✓ Short token hash length:', shortHash.length);
    console.log('✓ Long token hash length:', longHash.length);
    console.log('✓ Hash length is consistent:', shortHash.length === longHash.length ? 'PASS' : 'FAIL');
    console.log('✓ Hash length is 64 (SHA-256):', shortHash.length === 64 ? 'PASS' : 'FAIL');
    console.log('✓ Hash contains only hex chars:', /^[a-f0-9]+$/.test(shortHash) ? 'PASS' : 'FAIL');
    console.log('');
}

async function testSecurityScenario() {
    console.log('Test 5: Security Scenario - Database Storage vs Email');
    console.log('This simulates the flow where:');
    console.log('  1. Plain token is sent via email to user');
    console.log('  2. Hashed token is stored in database');
    console.log('  3. User submits plain token from email');
    console.log('  4. We hash submitted token and compare with DB\n');
    
    const plainTokenForEmail = authService.generateEmailVerificationToken();
    const hashedTokenForDB = authService.hashToken(plainTokenForEmail);
    
    console.log('✓ Step 1: Generate token:', plainTokenForEmail.substring(0, 30) + '...');
    console.log('✓ Step 2: Hash for DB:', hashedTokenForDB.substring(0, 30) + '...');
    console.log('✓ Step 3: User receives plain token in email');
    
    const userSubmittedToken = plainTokenForEmail;
    const hashedSubmittedToken = authService.hashToken(userSubmittedToken);
    
    console.log('✓ Step 4: Hash user\'s token:', hashedSubmittedToken.substring(0, 30) + '...');
    console.log('✓ Step 5: Verification:', hashedSubmittedToken === hashedTokenForDB ? 'PASS ✅' : 'FAIL ❌');
    console.log('');
    
    const wrongToken = authService.generateEmailVerificationToken();
    const hashedWrongToken = authService.hashToken(wrongToken);
    console.log('✓ Wrong token test:', hashedWrongToken !== hashedTokenForDB ? 'PASS ✅' : 'FAIL ❌');
    console.log('');
}

async function runAllTests() {
    try {
        await testEmailVerificationTokenHashing();
        await testPasswordResetTokenHashing();
        await testHashUniqueness();
        await testHashProperties();
        await testSecurityScenario();
        console.log('=== All Token Hashing Tests Completed Successfully ===');
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

runAllTests();
