# Security Enhancement: Token Hashing Implementation

## Overview
This document describes the security enhancement implemented to hash password reset tokens and email verification tokens before storing them in the database.

## Security Problem
Previously, tokens were stored in plaintext in the database. If an attacker gained read access to the database, they could:
- Use email verification tokens to verify accounts
- Use password reset tokens to reset passwords and take over accounts

## Solution
All sensitive tokens are now hashed using SHA-256 before being stored in the database. The plain token is:
1. Generated using `crypto.randomBytes(32).toString('hex')` (64 hex characters)
2. Sent to the user via email
3. Hashed using SHA-256 before storage in database
4. When the user submits the token, it's hashed and compared with the database value

## Implementation Details

### Modified Files

#### 1. `server/services/authService.js`
Added new method `hashToken()`:
```javascript
hashToken: (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
}
```

#### 2. `server/routes/auth.js`
Updated 6 locations where tokens are generated, stored, or verified:

**Email Verification Token Generation (3 locations):**
- `/signup-with-org` route
- `/register` route
- `/resend-verification` route

**Email Verification Token Verification (1 location):**
- `/verify-email` route

**Password Reset Token Generation (1 location):**
- `/password-reset-request` route

**Password Reset Token Verification (1 location):**
- `/password-reset` route

#### 3. `server/services/tenantProvisioning.js`
Updated the `provisionOrganization()` function to hash email verification tokens.

### Code Pattern

**Before (Insecure):**
```javascript
const token = authService.generateEmailVerificationToken();
await prisma.user.create({
    data: {
        emailVerificationToken: token,  // Plaintext in DB
        // ...
    }
});
await emailService.sendVerificationEmail(email, token);
```

**After (Secure):**
```javascript
const token = authService.generateEmailVerificationToken();
const hashedToken = authService.hashToken(token);  // Hash it
await prisma.user.create({
    data: {
        emailVerificationToken: hashedToken,  // Hashed in DB
        // ...
    }
});
await emailService.sendVerificationEmail(email, token);  // Plain in email
```

**Verification Pattern:**
```javascript
const { token } = req.body;
const hashedToken = authService.hashToken(token);  // Hash submitted token
const user = await prisma.user.findFirst({
    where: {
        emailVerificationToken: hashedToken,  // Compare hashes
        emailVerificationExpires: { gt: new Date() }
    }
});
```

## Security Benefits

1. **Database Breach Protection**: Even if an attacker gains read access to the database, they cannot use the hashed tokens
2. **One-Way Function**: SHA-256 is a cryptographic hash function - cannot be reversed to get the original token
3. **Deterministic**: Same input always produces same hash, allowing verification
4. **Fixed Length**: All hashes are 64 hex characters regardless of input length

## Testing

### Unit Tests
Added comprehensive tests in:
- `server/tests/auth.test.js` - Updated to include token hashing test
- `server/tests/token-hashing.test.js` - New dedicated security tests

### Test Coverage
✅ Token generation and hashing
✅ Hash determinism (same token = same hash)
✅ Hash uniqueness (different tokens = different hashes)
✅ SHA-256 properties (fixed 64-char hex output)
✅ Full security scenario (generation → storage → verification)

### Running Tests
```bash
# Run authentication tests
node tests/auth.test.js

# Run token hashing security tests
node tests/token-hashing.test.js
```

## Migration Considerations

### Existing Tokens
If there are existing plaintext tokens in the database, they will no longer work after this update. Options:
1. **Recommended**: Invalidate all existing tokens (set to NULL in DB)
2. Clear `emailVerificationToken`, `emailVerificationExpires`, `passwordResetToken`, and `passwordResetExpires` for all users
3. Users will need to request new verification/reset emails

### Database Migration Example
```sql
-- Invalidate all existing tokens
UPDATE users 
SET 
    emailVerificationToken = NULL,
    emailVerificationExpires = NULL,
    passwordResetToken = NULL,
    passwordResetExpires = NULL;
```

## Compliance

This enhancement helps meet security requirements for:
- **OWASP Top 10**: A02:2021 – Cryptographic Failures
- **GDPR**: Enhanced protection of personal data
- **SOC 2**: Access controls and data protection
- **PCI DSS**: Protection of sensitive authentication data

## References

- OWASP Password Storage Cheat Sheet
- NIST Digital Identity Guidelines (SP 800-63B)
- CWE-327: Use of a Broken or Risky Cryptographic Algorithm
- CWE-256: Plaintext Storage of a Password

## Author
Security enhancement implemented on 2025-11-26
