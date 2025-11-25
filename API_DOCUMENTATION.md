# API Documentation

## Authentication Endpoints

### POST /api/auth/signup-with-org

Self-service organization signup endpoint that creates a new organization with an owner user in a single transaction.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "organizationName": "Acme Corporation"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Response (201 Created):**
```json
{
  "message": "Organization created successfully. Please check your email to verify your account.",
  "organization": {
    "id": "clxxx...",
    "name": "Acme Corporation",
    "slug": "acme-corporation",
    "subscriptionPlan": "free",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "user": {
    "id": "clxxx...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Owner",
    "organizationId": "clxxx...",
    "isEmailVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

*400 Bad Request* - Validation failed:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "code": "too_small",
      "minimum": 8,
      "path": ["password"],
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

*409 Conflict* - Email already registered:
```json
{
  "error": "Email already registered"
}
```

**Features:**
- ✅ Transaction-wrapped provisioning (all-or-nothing)
- ✅ Unique organization slug generation from name
- ✅ Owner user creation with hashed password
- ✅ Email verification token generation
- ✅ Owner role assignment with all permissions
- ✅ Verification email sending
- ✅ Default roles initialization (Compliance Manager, Station Manager, Contractor)
- ✅ Default form templates creation (Monthly HSE Inspection, Quarterly Compliance Audit)
- ✅ JWT token generation (access + refresh)

**Slug Generation:**
- Converts organization name to lowercase
- Removes special characters
- Replaces spaces with hyphens
- Ensures uniqueness by appending counter if needed

Examples:
- "Acme Corporation" → "acme-corporation"
- "Shell Pakistan Ltd." → "shell-pakistan-ltd"
- "Test Company" → "test-company" (first), "test-company-1" (duplicate)

**Default Roles Created:**
1. **Owner** - Full organization permissions (auto-assigned)
2. **Compliance Manager** - Manage compliance, audits, stations, incidents
3. **Station Manager** - View stations, audits, incidents; create incidents
4. **Contractor** - View-only access to stations and audits

**Default Form Templates:**
1. **Monthly HSE Inspection**
   - Safety Equipment section
   - Environmental Compliance section

2. **Quarterly Compliance Audit**
   - Documentation Review section

### POST /api/auth/register

Register a new user (requires existing organization).

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "organizationId": "clxxx...",
  "role": "Station Manager"
}
```

### POST /api/auth/login

Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxx...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Owner",
    "organizationId": "clxxx..."
  }
}
```

**Error Responses:**

*401 Unauthorized*:
```json
{
  "error": "Invalid credentials"
}
```

*403 Forbidden* - Email not verified:
```json
{
  "error": "Email not verified. Please check your email for verification link.",
  "code": "EMAIL_NOT_VERIFIED"
}
```

### POST /api/auth/verify-email

Verify user email address.

**Request Body:**
```json
{
  "token": "abc123..."
}
```

### POST /api/auth/resend-verification

Resend email verification link.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

### POST /api/auth/password-reset-request

Request password reset link.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

### POST /api/auth/password-reset

Reset password with token.

**Request Body:**
```json
{
  "token": "abc123...",
  "newPassword": "NewSecurePass123!"
}
```

### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /api/auth/logout

Logout (revoke refresh token).

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /api/auth/logout-all

Logout from all devices (revoke all refresh tokens).

**Headers:**
```
Authorization: Bearer <access-token>
```

## Organization Provisioning Details

### Transaction Flow

The signup process uses a Prisma transaction to ensure atomicity:

1. **Hash password** using bcrypt (10 rounds)
2. **Generate email verification token** (32-byte random hex)
3. **Generate unique slug** from organization name
4. **Create user** with hashed password and verification token
5. **Create organization** with generated slug
6. **Link user to organization** (update organizationId)
7. **Ensure Owner role exists** with all permissions
8. **Assign Owner role** to user
9. **Generate JWT tokens** (access + refresh)
10. **Store refresh token** in user record
11. **Send verification email** asynchronously
12. **Initialize default settings** (roles, forms)

If any step fails, the entire transaction is rolled back.

### Slug Uniqueness

The system ensures unique organization slugs:

```javascript
// Example flow
"Acme Corp" → "acme-corp" → Check DB → Available ✓
"Acme Corp" → "acme-corp" → Check DB → Taken ✗ → "acme-corp-1"
"Acme Corp" → "acme-corp" → Check DB → Taken ✗ → "acme-corp-2"
```

### Default Permissions

The Owner role receives all available permissions:
- organizations: read, write, delete
- users: read, write, delete
- stations: read, write, delete
- audits: read, write, delete, conduct
- incidents: read, write, delete
- contractors: read, write, delete
- forms: read, write, delete
- reports: read, generate

## Rate Limiting

All `/api/` endpoints are rate-limited:
- Window: 15 minutes
- Max requests: 300 per window
- Standard headers returned for tracking

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with secure secrets
- Email verification required for login
- CORS configured
- Helmet security headers
- Rate limiting enabled
- Refresh token rotation
- All secrets in environment variables
