# API Documentation

Complete API reference and integration guides.

## Documents

- **[API Endpoints](./endpoints.md)** - Complete REST API reference
- **[Mobile API](./mobile.md)** - Mobile-specific API documentation
- **[OpenAPI Specification](./openapi.yaml)** - OpenAPI 3.0 spec for API tooling

## Quick Reference

### Authentication Endpoints
```
POST /api/auth/signup-with-org    # Create organization + owner
POST /api/auth/login               # Login
POST /api/auth/refresh             # Refresh access token
POST /api/auth/logout              # Logout
```

### Resource Endpoints
```
GET    /api/stations               # List stations
POST   /api/stations               # Create station
GET    /api/audits                 # List audits
POST   /api/audits                 # Create audit
GET    /api/incidents              # List incidents
POST   /api/incidents              # Create incident
GET    /api/work-permits           # List work permits
POST   /api/work-permits           # Create work permit
```

### Monitoring Endpoints
```
GET /api/health                    # Health check
GET /api/ready                     # Readiness probe
GET /api/live                      # Liveness probe
GET /metrics                       # Prometheus metrics
```

## Authentication

All authenticated endpoints require:

```bash
Authorization: Bearer <jwt-token>
x-tenant-id: <organization-id>
```

## Rate Limiting

All `/api/` endpoints are rate-limited:
- **Tenant-level**: 1000 requests per rolling window
- **User-level**: 100 requests per rolling window
- **IP-level**: 300 requests per 15 minutes
- **Auth endpoints**: 5 requests per 15 minutes

## Error Responses

Standard error response format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common HTTP status codes:
- `400` - Bad Request (validation failed)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Quick Links

- [Complete API Reference](./endpoints.md)
- [Mobile API Guide](./mobile.md)
- [Authentication Guide](../security/overview.md)
