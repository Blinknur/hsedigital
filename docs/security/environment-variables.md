# Required Security Environment Variables

## Overview

As of this update, the application enforces strict validation of critical security environment variables at startup. The server will **fail immediately** with a clear error message if required variables are not configured.

## Required Variables

### JWT_SECRET
- **Purpose**: Secret key used to sign JWT access tokens
- **Required**: Yes (server will not start without it)
- **Format**: String (minimum 32 characters recommended)
- **Example**: `JWT_SECRET=your-secure-random-string-here-min-32-chars`

### REFRESH_SECRET
- **Purpose**: Secret key used to sign JWT refresh tokens
- **Required**: Yes (server will not start without it)
- **Format**: String (minimum 32 characters recommended)
- **Example**: `REFRESH_SECRET=another-secure-random-string-here-min-32-chars`

## Validation Behavior

### Startup Validation (server/index.js)
The main application validates both variables at startup:
```javascript
function validateRequiredEnvVars() {
    const required = ['JWT_SECRET', 'REFRESH_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error(`❌ FATAL: Missing required environment variables: ${missing.join(', ')}`);
        console.error('Please configure these variables in your .env file before starting the server.');
        process.exit(1);
    }
}
```

### Module-level Validation
The following modules also validate secrets when imported:
- `server/services/authService.js` - Validates JWT_SECRET and REFRESH_SECRET
- `server/config/socket.js` - Validates JWT_SECRET

## Configuration

### Local Development
1. Copy the example environment file:
   ```bash
   cp server/.env.example server/.env
   ```

2. Generate secure random strings:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Update your `.env` file with the generated values:
   ```
   JWT_SECRET=<generated-value>
   REFRESH_SECRET=<generated-value>
   ```

### Docker Setup
For Docker deployments, ensure these variables are set in your environment or `.env` file. The `docker-compose.yml` now requires these variables:

```yaml
environment:
  - JWT_SECRET=${JWT_SECRET:?JWT_SECRET environment variable is required}
  - REFRESH_SECRET=${REFRESH_SECRET:?REFRESH_SECRET environment variable is required}
```

Docker Compose will fail with an error if these variables are not set.

### Production Deployment
For production environments:
1. **Never** use the example values from `.env.example`
2. Generate cryptographically secure random strings (64+ characters)
3. Store secrets in a secure secrets manager (AWS Secrets Manager, Azure Key Vault, etc.)
4. Use environment-specific secrets (dev, staging, production)
5. Rotate secrets periodically

## Security Best Practices

1. **Minimum Length**: Use at least 32 characters for both secrets
2. **Randomness**: Generate using cryptographically secure random functions
3. **Uniqueness**: Use different secrets for JWT_SECRET and REFRESH_SECRET
4. **No Sharing**: Never share secrets between environments
5. **No Commits**: Never commit secrets to version control
6. **Regular Rotation**: Rotate secrets periodically (e.g., every 90 days)

## Generating Strong Secrets

### Using Node.js
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Using OpenSSL
```bash
openssl rand -hex 64
```

### Using Python
```bash
python3 -c "import secrets; print(secrets.token_hex(64))"
```

## Migration Guide

If you're updating from a previous version that had hardcoded fallbacks:

1. **Identify Current Usage**: Check if you're relying on fallback values
2. **Generate New Secrets**: Use the methods above to create secure secrets
3. **Update Configuration**: Add secrets to your `.env` file
4. **Test Locally**: Verify the application starts correctly
5. **Update Deployment**: Update secrets in your deployment environment
6. **Verify Tokens**: Existing JWT tokens will be invalidated if secrets change

## Troubleshooting

### Server Fails to Start
**Error**: `❌ FATAL: Missing required environment variables: JWT_SECRET, REFRESH_SECRET`

**Solution**: Ensure both variables are set in your `.env` file

### Module Import Fails
**Error**: `Error: JWT_SECRET and REFRESH_SECRET environment variables must be configured`

**Solution**: The authService module is being imported before environment variables are loaded. Ensure `dotenv.config()` is called before importing modules.

### Docker Compose Fails
**Error**: `JWT_SECRET environment variable is required`

**Solution**: Create a `.env` file in the project root with the required variables, or set them in your shell environment.

## Files Modified

The following files were updated to enforce this validation:
- `server/index.js` - Added validateRequiredEnvVars() function
- `server/services/authService.js` - Added module-level validation
- `server/config/socket.js` - Added module-level validation
- `docker-compose.yml` - Added required variable enforcement
- `AGENTS.md` - Updated setup documentation

## Testing

To verify the validation is working:

1. **Test without secrets** (should fail):
   ```bash
   unset JWT_SECRET REFRESH_SECRET
   node server/index.js
   ```

2. **Test with secrets** (should succeed):
   ```bash
   export JWT_SECRET="test-secret-$(openssl rand -hex 32)"
   export REFRESH_SECRET="test-secret-$(openssl rand -hex 32)"
   node server/index.js
   ```

3. **Run auth tests**:
   ```bash
   cd server && node -r dotenv/config tests/auth.test.js
   ```
