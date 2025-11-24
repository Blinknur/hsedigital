
# HSE.Digital - Compliance & Safety Platform

HSE.Digital is a unified SaaS platform for managing audits, compliance checklists, incidents, and contractor permits for fuel station networks.

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- npm or yarn
- Docker (optional, for database)

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development environment:
    ```bash
    npm run dev
    ```

## 🏗 Project Structure

*   `/src` (implied root): React Frontend code.
*   `/api`: Frontend API client & Mock services.
*   `/server`: Node.js/Express Backend.
*   `/prisma`: Database schema.
*   `/components`: UI Components.

## 🛡 Security & Architecture

*   **Frontend:** React (Vite) + TypeScript.
*   **Backend:** Node.js (Express) with Helmet security headers and Rate Limiting.
*   **Database:** PostgreSQL with Row-Level Security (RLS) for multi-tenancy.
*   **Auth:** JWT-based authentication with refresh tokens.

## 🎯 Mission Roadmap (V1 to Launch)

We are currently transitioning from **Build** to **Launch Readiness**.

### ✅ 3. Architecture & Technical Foundation
- [x] Frontend Stack: React / Vite / Tailwind.
- [x] Backend Stack: Node.js / Express.
- [x] Multi-tenancy: Organization-based isolation wired into API context.

### ✅ 4. Development & CI/CD Pipeline
- [x] Linting & Basic Tests setup.
- [x] Monorepo structure prepared.

### ✅ 5. V1 Build & Internal QA
- [x] **Authentication**: JWT Login & Sign Up flows.
- [x] **Core Features**: Audits, Checklists, Incidents, Permits.
- [x] **Roles**: Admin, Manager, Auditor, Contractor.

### 🔄 6. Beta Launch & Customer Feedback Loop
- [ ] Deploy to staging environment (Vercel/Render).
- [ ] Instrument analytics (PostHog/Amplitude).

### 🔄 7. Monetization & Billing Setup
- [x] **Pricing UI**: Plans displayed in Settings.
- [x] **Billing Flow**: Frontend connected to Backend API.
- [ ] **Stripe**: Replace backend mock `paymentService` with real Stripe SDK.

### 🔄 8. Security, Compliance & Trust Layer
- [x] **Security Headers**: Helmet & Rate Limiting configured.
- [ ] **Database**: Provision managed PostgreSQL (AWS RDS).
- [ ] **Backups**: Configure automated daily backups.

### 🔜 9. Launch Readiness & GTM Execution
- [ ] SEO Landing Pages (deployed).
- [ ] Onboarding Email Flows (SendGrid integration).

### 🔜 10. Growth & Scale Enablement
- [ ] Churn recovery workflows.
- [ ] Scale infrastructure based on load.

## 📚 Documentation

*   **[Architecture Blueprint](docs/architecture.md)**: Technical foundation.
*   **[API Specification](docs/openapi.yaml)**: REST API endpoints.
*   **[Database Schema](docs/schema.sql)**: SQL structure.
