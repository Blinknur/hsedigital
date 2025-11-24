# HSE.Digital - Production Architecture & Technical Strategy

## 1. Executive Summary
This document outlines the technical foundation for moving HSE.Digital from a client-side prototype to a scalable, secure, multi-tenant SaaS platform. The core design philosophy focuses on **isolation**, **scalability**, and **developer velocity**.

## 2. Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | **React (Vite) + TypeScript** | Current prototype stack. High performance, type safety, and rich ecosystem. |
| **Backend API** | **Node.js (NestJS)** | Modular architecture, native TypeScript support, and excellent dependency injection for complex business logic. |
| **Database** | **PostgreSQL (AWS RDS)** | Reliable, ACID-compliant. Supports JSONB for dynamic forms and Row-Level Security (RLS) for multi-tenancy. |
| **Caching** | **Redis (AWS ElastiCache)** | Session management, API rate limiting, and caching expensive dashboard queries. |
| **Identity** | **Auth0 / AWS Cognito** | Offloads complex security requirements (MFA, SSO, Passwordless) to a dedicated provider. |
| **Infrastructure** | **AWS Fargate (Docker)** | Serverless container orchestration. Zero maintenance overhead for patching servers. |

## 3. Multi-Tenancy Strategy: Row-Level Security (RLS)

To ensure strict data isolation between organizations (tenants) without the operational overhead of separate databases, we will enforce **Postgres Row-Level Security**.

### 3.1. Database Schema Pattern
Every table containing tenant-specific data MUST have an `organization_id` column.

```sql
CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  station_id UUID NOT NULL REFERENCES stations(id),
  ...
);

-- Enable RLS
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

-- Create Policy
CREATE POLICY tenant_isolation_policy ON audits
    USING (organization_id = current_setting('app.current_organization_id')::uuid);
```

### 3.2. Request Lifecycle
1.  **Middleware:** Extracts the JWT from the request header.
2.  **Context:** Determines the user's `organization_id` from the JWT claims.
3.  **Database Transaction:** Sets the session variable before executing queries.
    ```sql
    SET LOCAL app.current_organization_id = 'user-org-uuid';
    SELECT * FROM audits; -- Automatically filtered by RLS policy
    ```

## 4. Security & Compliance

### 4.1. Authentication Flow
*   **Protocol:** OAuth 2.0 / OpenID Connect.
*   **Tokens:** Short-lived Access Tokens (JWT) and secure HTTP-only Refresh Tokens.
*   **SSO:** Enterprise clients (Total Parco, Shell) can configure SAML connections via Auth0 to use their own IdP (Azure AD, Okta).

### 4.2. Role-Based Access Control (RBAC)
Permissions are defined in code (as seen in `permissions.ts` in the frontend) and enforced at the API endpoint level using Guards/Decorators.

**Example (NestJS):**
```typescript
@Get('audits')
@UseGuards(PermissionsGuard)
@Permissions('ViewAllAudits')
findAll() { ... }
```

## 5. DevOps & CI/CD Pipeline

*   **Source Control:** GitHub (Monorepo structure: `/apps/web`, `/apps/api`).
*   **CI Provider:** GitHub Actions.
*   **Checks:**
    *   Linting (ESLint) & Formatting (Prettier).
    *   Unit Tests (Jest).
    *   Security Audit (`npm audit`, Snyk).
*   **CD Strategy:**
    *   **Staging:** Auto-deploy on merge to `main`.
    *   **Production:** Manual approval required via GitHub Releases.

## 6. Next Steps for Engineering Team

1.  **Initialize NestJS Repository:** Scaffolding the backend project.
2.  **Database Migration:** Set up Supabase or AWS RDS and apply the initial schema with RLS policies.
3.  **API Implementation:** Implement the endpoints defined in `openapi.yaml` one by one.
