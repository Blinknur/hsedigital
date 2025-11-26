# HSE Digital TypeScript SDK

Official TypeScript/JavaScript SDK for HSE Digital API.

## Features

- 🔐 **Authentication handling** - Automatic token management and refresh
- 🔄 **Auto-retry logic** - Configurable retry with exponential backoff
- 📝 **Type-safe** - Full TypeScript definitions for all API methods
- 🚀 **Promise-based** - Modern async/await API
- ⚡ **Interceptors** - Automatic authorization headers and token refresh
- 🛡️ **Error handling** - Typed error responses

## Installation

```bash
npm install @hse-digital/sdk
# or
yarn add @hse-digital/sdk
```

## Quick Start

```typescript
import { HSEClient } from '@hse-digital/sdk';

const client = new HSEClient({
  baseUrl: 'https://api.hse.digital',
  maxRetries: 3,
  timeout: 30000,
});

// Login
const { user, accessToken } = await client.login({
  email: 'user@example.com',
  password: 'password123',
});

// List stations
const stations = await client.listStations({ region: 'North' });

// Create an audit
const audit = await client.createAudit({
  stationId: 'station-id',
  auditorId: 'auditor-id',
  scheduledDate: '2024-01-15T10:00:00Z',
  formId: 'form-id',
});
```

## Configuration

```typescript
interface HSEClientConfig {
  baseUrl?: string;              // API base URL (default: http://localhost:3001)
  accessToken?: string;          // Initial access token
  timeout?: number;              // Request timeout in ms (default: 30000)
  maxRetries?: number;           // Max retry attempts (default: 3)
  retryDelay?: number;           // Base delay between retries in ms (default: 1000)
  onTokenRefresh?: (tokens: AuthTokens) => void | Promise<void>; // Token refresh callback
}
```

## Authentication

### Signup with Organization

```typescript
const result = await client.signup({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'SecurePass123!',
  organizationName: 'Acme Corp',
});

console.log(result.organization);
console.log(result.user);
// Tokens are automatically stored
```

### Login

```typescript
const { user, accessToken, refreshToken } = await client.login({
  email: 'john@example.com',
  password: 'SecurePass123!',
});
```

### Token Persistence

```typescript
const client = new HSEClient({
  baseUrl: 'https://api.hse.digital',
  onTokenRefresh: async (tokens) => {
    // Save tokens to localStorage, cookies, etc.
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  },
});

// Restore tokens on app start
const savedToken = localStorage.getItem('accessToken');
if (savedToken) {
  client.setTokens({
    accessToken: savedToken,
    refreshToken: localStorage.getItem('refreshToken')!,
  });
}
```

### Logout

```typescript
await client.logout();
```

## Stations

### List Stations

```typescript
const stations = await client.listStations();

// With filters
const northStations = await client.listStations({ region: 'North' });
```

### Create Station

```typescript
const station = await client.createStation({
  name: 'Station Alpha',
  brand: 'Shell',
  region: 'North',
  address: '123 Main St',
  riskCategory: 'High',
  auditFrequency: 'Monthly',
});
```

### Update Station

```typescript
const updated = await client.updateStation('station-id', {
  riskCategory: 'Critical',
});
```

### Delete Station

```typescript
await client.deleteStation('station-id');
```

## Audits

### List Audits

```typescript
const { data: audits, pagination } = await client.listAudits({
  stationId: 'station-id',
  status: 'Completed',
  limit: 50,
});

if (pagination.hasMore) {
  const nextPage = await client.listAudits({
    cursor: pagination.nextCursor,
  });
}
```

### Get Audit

```typescript
const audit = await client.getAudit('audit-id');
console.log(audit.station);
console.log(audit.auditor);
```

### Create Audit

```typescript
const audit = await client.createAudit({
  stationId: 'station-id',
  auditorId: 'user-id',
  scheduledDate: '2024-02-01T09:00:00Z',
  formId: 'form-id',
  status: 'Scheduled',
});
```

### Update Audit

```typescript
const updated = await client.updateAudit('audit-id', {
  status: 'Completed',
  overallScore: 95,
  findings: [
    { category: 'Safety', score: 98, notes: 'Excellent' },
    { category: 'Environment', score: 92, notes: 'Good' },
  ],
});
```

### Delete Audit

```typescript
await client.deleteAudit('audit-id');
```

## Incidents

### List Incidents

```typescript
const { data: incidents, pagination } = await client.listIncidents({
  severity: 'High',
  status: 'Open',
});
```

### Get Incident

```typescript
const incident = await client.getIncident('incident-id');
```

### Create Incident

```typescript
const incident = await client.createIncident({
  stationId: 'station-id',
  incidentType: 'Safety Violation',
  severity: 'High',
  description: 'Detailed description of the incident',
  status: 'Open',
});
```

### Update Incident

```typescript
const updated = await client.updateIncident('incident-id', {
  status: 'Resolved',
});
```

### Delete Incident

```typescript
await client.deleteIncident('incident-id');
```

## Other Resources

### List Contractors

```typescript
const contractors = await client.listContractors();
```

### List Work Permits

```typescript
const permits = await client.listWorkPermits({ stationId: 'station-id' });
```

### List Users

```typescript
const users = await client.listUsers();
```

### Get Current Usage Stats

```typescript
const usage = await client.getCurrentUsage();
console.log(usage.audits);
console.log(usage.incidents);
```

## Error Handling

```typescript
import { AxiosError } from 'axios';
import { APIError } from '@hse-digital/sdk';

try {
  const station = await client.createStation({
    name: 'New Station',
  });
} catch (error) {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as APIError;
    console.error(apiError.error);
    console.error(apiError.details);
    
    if (error.response?.status === 401) {
      // Handle authentication error
    } else if (error.response?.status === 429) {
      // Handle rate limiting
    }
  }
}
```

## Retry Logic

The SDK automatically retries failed requests with exponential backoff:

- Network errors
- 429 (Too Many Requests)
- 5xx (Server errors)

```typescript
const client = new HSEClient({
  maxRetries: 5,        // Retry up to 5 times
  retryDelay: 2000,     // Start with 2 second delay
});
```

Retry delays: 2s, 4s, 6s, 8s, 10s

## Token Refresh

The SDK automatically refreshes expired access tokens:

1. Detects 401 Unauthorized response
2. Attempts to refresh using refresh token
3. Retries original request with new token
4. Clears tokens if refresh fails

```typescript
const client = new HSEClient({
  onTokenRefresh: async (tokens) => {
    // Persist new tokens
    await saveTokens(tokens);
  },
});
```

## TypeScript Support

Full type definitions included:

```typescript
import {
  Station,
  Audit,
  Incident,
  User,
  Organization,
  CreateStationRequest,
  UpdateAuditRequest,
  PaginatedResponse,
  APIError,
} from '@hse-digital/sdk';
```

## License

MIT
