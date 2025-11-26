# SDK Implementation Guide

This document describes the implementation details of the HSE Digital API Client SDKs.

## Architecture

Both SDKs follow a similar architecture pattern:

```
SDK Client
├── HTTP Client (axios/requests)
├── Retry Logic (exponential backoff)
├── Token Management (auto-refresh)
├── Request Interceptors
└── Response Interceptors
```

## Key Features Implementation

### 1. Authentication & Token Management

#### TypeScript Implementation
```typescript
class HSEClient {
  private accessToken?: string;
  private refreshToken?: string;
  
  setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    if (this.config.onTokenRefresh) {
      this.config.onTokenRefresh(tokens);
    }
  }
}
```

#### Python Implementation
```python
class HSEClient:
    def set_tokens(self, tokens: AuthTokens) -> None:
        self.access_token = tokens.access_token
        self.refresh_token = tokens.refresh_token
        if self.on_token_refresh:
            self.on_token_refresh(tokens)
```

**Features:**
- Tokens stored in memory
- Optional persistence via callbacks
- Automatic attachment to requests
- Cleared on logout or failed refresh

### 2. Automatic Token Refresh

Both SDKs implement automatic token refresh using response interceptors:

**Flow:**
1. Request returns 401 Unauthorized
2. Check if refresh token exists
3. Call `/api/auth/refresh` endpoint
4. Update stored tokens
5. Retry original request with new token
6. If refresh fails, clear tokens and re-throw error

**TypeScript:**
```typescript
this.client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = await this.refreshAccessToken();
      this.setTokens(tokens);
      return this.client(originalRequest);
    }
    return Promise.reject(error);
  }
);
```

**Python:**
```python
if response.status_code == 401 and retry_on_401 and self.refresh_token:
    try:
        self._refresh_access_token()
        headers = self._get_headers()
        response = self.session.request(...)
    except Exception:
        self.clear_tokens()
        raise
```

### 3. Retry Logic with Exponential Backoff

#### TypeScript (axios-retry)
```typescript
axiosRetry(this.client, {
  retries: this.config.maxRetries,
  retryDelay: (retryCount) => {
    return retryCount * this.config.retryDelay;
  },
  retryCondition: (error: AxiosError) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           error.response?.status === 429 ||
           (error.response?.status || 0) >= 500;
  },
});
```

#### Python (urllib3.Retry)
```python
retry_strategy = Retry(
    total=max_retries,
    backoff_factor=retry_delay,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["HEAD", "GET", "PUT", "DELETE", "OPTIONS", "TRACE", "POST"],
)
adapter = HTTPAdapter(max_retries=retry_strategy)
self.session.mount("http://", adapter)
self.session.mount("https://", adapter)
```

**Retry Conditions:**
- Network errors (connection timeouts, DNS failures)
- 429 Too Many Requests
- 5xx Server errors (500, 502, 503, 504)

**No Retry:**
- 4xx Client errors (except 429)
- 401 Unauthorized (handled by token refresh)

### 4. Error Handling

#### TypeScript
```typescript
catch (error) {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as APIError;
    // Handle different status codes
  }
}
```

#### Python
```python
class HSEAPIError(Exception):
    def __init__(self, message: str, status_code: int, details: dict):
        self.message = message
        self.status_code = status_code
        self.details = details

# Specific exceptions
class AuthenticationError(HSEAPIError): pass
class ValidationError(HSEAPIError): pass
class NotFoundError(HSEAPIError): pass
class RateLimitError(HSEAPIError): pass
class ServerError(HSEAPIError): pass
```

### 5. Type Safety

#### TypeScript
- Full interface definitions for all request/response types
- Generic types for paginated responses
- Discriminated unions for status enums

#### Python
- Dataclasses for structured data
- Type hints throughout
- Optional fields properly typed

## API Method Patterns

### List Methods
```typescript
// TypeScript
async listStations(params?: ListStationsParams): Promise<Station[]>

# Python
def list_stations(self, region: Optional[str] = None) -> List[Dict[str, Any]]
```

### Paginated List Methods
```typescript
// TypeScript
async listAudits(params?: ListAuditsParams): Promise<PaginatedResponse<Audit>>

# Python
def list_audits(self, cursor: Optional[str] = None) -> Dict[str, Any]
```

Returns:
```json
{
  "data": [...],
  "pagination": {
    "hasMore": true,
    "nextCursor": "abc123"
  }
}
```

### Get Methods
```typescript
// TypeScript
async getAudit(id: string): Promise<Audit>

# Python
def get_audit(self, audit_id: str) -> Dict[str, Any]
```

### Create Methods
```typescript
// TypeScript
async createStation(data: CreateStationRequest): Promise<Station>

# Python
def create_station(self, **kwargs) -> Dict[str, Any]
```

### Update Methods
```typescript
// TypeScript
async updateStation(id: string, data: UpdateStationRequest): Promise<Station>

# Python
def update_station(self, station_id: str, **kwargs) -> Dict[str, Any]
```

### Delete Methods
```typescript
// TypeScript
async deleteStation(id: string): Promise<void>

# Python
def delete_station(self, station_id: str) -> None
```

## Configuration Options

### TypeScript
```typescript
interface HSEClientConfig {
  baseUrl?: string;              // Default: http://localhost:3001
  accessToken?: string;          // Initial token
  timeout?: number;              // Default: 30000ms
  maxRetries?: number;           // Default: 3
  retryDelay?: number;           // Default: 1000ms
  onTokenRefresh?: (tokens: AuthTokens) => void | Promise<void>;
}
```

### Python
```python
def __init__(
    self,
    base_url: str = "http://localhost:3001",
    access_token: Optional[str] = None,
    timeout: int = 30,
    max_retries: int = 3,
    retry_delay: float = 1.0,
    on_token_refresh: Optional[Callable[[AuthTokens], None]] = None,
)
```

## Testing Strategy

### Unit Tests
- Mock HTTP responses
- Test token refresh logic
- Test retry behavior
- Test error handling

### Integration Tests
- Real API calls (local/staging)
- End-to-end authentication flow
- CRUD operations
- Pagination
- Error scenarios

### Example Test Structure

#### TypeScript (Jest)
```typescript
describe('HSEClient', () => {
  it('should refresh token on 401', async () => {
    // Mock setup
    // Test logic
    // Assertions
  });
});
```

#### Python (pytest)
```python
def test_token_refresh_on_401():
    # Mock setup
    # Test logic
    # Assertions
    pass
```

## Performance Considerations

### Connection Pooling
- **TypeScript**: Axios reuses connections by default
- **Python**: requests.Session() maintains connection pool

### Request Batching
Not currently implemented, but could be added:
```typescript
async batchCreate(items: CreateRequest[]): Promise<Response[]>
```

### Caching
Not implemented in SDK (should be handled by application layer)

## Security Considerations

### Token Storage
- Never log tokens
- Store securely (encrypted storage recommended)
- Clear tokens on logout

### HTTPS
- Always use HTTPS in production
- SDKs support both HTTP (dev) and HTTPS (prod)

### Rate Limiting
- Respect 429 responses
- Automatic retry with backoff
- Consider implementing client-side rate limiting

## Versioning

- Follow Semantic Versioning (SemVer)
- Major version: Breaking API changes
- Minor version: New features, backward compatible
- Patch version: Bug fixes

## Publishing

### TypeScript
```bash
npm version patch
npm publish
```

### Python
```bash
python -m build
twine upload dist/*
```

## Future Enhancements

### Planned Features
1. **Webhook support** - Listen for real-time events
2. **File upload helpers** - Simplified file handling
3. **Bulk operations** - Batch create/update/delete
4. **Query builders** - Fluent API for complex filters
5. **Caching layer** - Optional client-side caching
6. **Offline support** - Queue requests when offline
7. **Request cancellation** - Cancel in-flight requests
8. **Progress tracking** - Upload/download progress events

### Code Generation
Consider using OpenAPI Generator for future versions:
```bash
openapi-generator generate -i openapi.yaml -g typescript-axios -o sdks/typescript
openapi-generator generate -i openapi.yaml -g python -o sdks/python
```

## Maintenance

### Regular Updates
- Keep dependencies up to date
- Monitor security advisories
- Update OpenAPI spec as API evolves
- Add new endpoints as they're created

### Breaking Changes
- Document in CHANGELOG
- Provide migration guide
- Deprecate before removing
- Major version bump

## Support & Contribution

### Filing Issues
Include:
- SDK version
- Environment (Node/Python version)
- Code snippet to reproduce
- Error messages

### Contributing
1. Fork repository
2. Create feature branch
3. Add tests
4. Update documentation
5. Submit pull request

## License

MIT License - See LICENSE file for details
