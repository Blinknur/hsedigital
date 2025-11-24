import { authService, registerSchema, loginSchema } from '../services/authService.js';

console.log('=== JWT Authentication System Tests ===\n');

async function testPasswordHashing() {
    console.log('Test 1: Password Hashing with bcrypt');
    const password = 'Password123!';
    const hashed = await authService.hashPassword(password);
    console.log('✓ Password hashed:', hashed.substring(0, 20) + '...');
    
    const isValid = await authService.comparePassword(password, hashed);
    console.log('✓ Password comparison:', isValid ? 'PASS' : 'FAIL');
    
    const isInvalid = await authService.comparePassword('wrongpass', hashed);
    console.log('✓ Wrong password comparison:', !isInvalid ? 'PASS' : 'FAIL');
    console.log('');
}

async function testTokenGeneration() {
    console.log('Test 2: JWT Token Generation');
    const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'Admin',
        organizationId: 'org-123'
    };
    
    const tokens = authService.generateTokens(mockUser);
    console.log('✓ Access Token generated:', tokens.accessToken.substring(0, 30) + '...');
    console.log('✓ Refresh Token generated:', tokens.refreshToken.substring(0, 30) + '...');
    console.log('');
}

async function testTokenVerification() {
    console.log('Test 3: JWT Token Verification');
    const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'Admin',
        organizationId: 'org-123'
    };
    
    const accessToken = authService.generateAccessToken(mockUser);
    const decoded = authService.verifyAccessToken(accessToken);
    console.log('✓ Access Token verified:', decoded ? 'PASS' : 'FAIL');
    console.log('✓ Decoded payload:', JSON.stringify(decoded, null, 2));
    
    const invalidDecoded = authService.verifyAccessToken('invalid.token.here');
    console.log('✓ Invalid token rejected:', !invalidDecoded ? 'PASS' : 'FAIL');
    console.log('');
}

async function testEmailVerificationToken() {
    console.log('Test 4: Email Verification Token');
    const token = authService.generateEmailVerificationToken();
    console.log('✓ Email verification token:', token.substring(0, 30) + '...');
    console.log('✓ Token length:', token.length);
    console.log('✓ Expiry date:', authService.getEmailVerificationExpiry());
    console.log('');
}

async function testPasswordResetToken() {
    console.log('Test 5: Password Reset Token');
    const token = authService.generatePasswordResetToken();
    console.log('✓ Password reset token:', token.substring(0, 30) + '...');
    console.log('✓ Token length:', token.length);
    console.log('✓ Expiry date:', authService.getPasswordResetExpiry());
    console.log('');
}

async function testValidationSchemas() {
    console.log('Test 6: Validation Schemas');
    
    const validRegister = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        role: 'Admin'
    };
    const registerResult = registerSchema.safeParse(validRegister);
    console.log('✓ Valid registration data:', registerResult.success ? 'PASS' : 'FAIL');
    
    const invalidRegister = {
        name: 'J',
        email: 'invalid-email',
        password: 'weak',
    };
    const invalidRegisterResult = registerSchema.safeParse(invalidRegister);
    console.log('✓ Invalid registration rejected:', !invalidRegisterResult.success ? 'PASS' : 'FAIL');
    console.log('✓ Validation errors:', invalidRegisterResult.error?.errors.length, 'errors found');
    
    const validLogin = {
        email: 'john@example.com',
        password: 'Password123!'
    };
    const loginResult = loginSchema.safeParse(validLogin);
    console.log('✓ Valid login data:', loginResult.success ? 'PASS' : 'FAIL');
    console.log('');
}

async function testRefreshTokenRotation() {
    console.log('Test 7: Refresh Token Rotation (Simulated)');
    const userId = 'test-user-id';
    const refreshToken1 = authService.generateRefreshToken(userId);
    const refreshToken2 = authService.generateRefreshToken(userId);
    
    console.log('✓ First refresh token:', refreshToken1.substring(0, 30) + '...');
    console.log('✓ Second refresh token:', refreshToken2.substring(0, 30) + '...');
    console.log('✓ Tokens are unique:', refreshToken1 !== refreshToken2 ? 'PASS' : 'FAIL');
    console.log('');
}

async function runAllTests() {
    try {
        await testPasswordHashing();
        await testTokenGeneration();
        await testTokenVerification();
        await testEmailVerificationToken();
        await testPasswordResetToken();
        await testValidationSchemas();
        await testRefreshTokenRotation();
        console.log('=== All Tests Completed Successfully ===');
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

runAllTests();
