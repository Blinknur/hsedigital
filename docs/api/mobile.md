# Mobile API Documentation

Comprehensive RESTful mobile API endpoints optimized for mobile applications with response payload size optimization, offline-first data synchronization support, image compression, batch operations, and JWT refresh token handling.

## Base URL

```
/api/mobile
```

## Features

- **Response Payload Optimization**: Minimized response sizes with field selection and null value compression
- **Offline-First Sync**: Incremental data synchronization with conflict detection
- **Image Compression**: Automatic image compression with multiple size variants (thumbnail, mobile, original)
- **Batch Operations**: Upload multiple audits and images in a single request
- **JWT Refresh Tokens**: Secure token rotation and refresh mechanism
- **Lightweight Endpoints**: Optimized queries with selected fields for mobile bandwidth

## Authentication

### Mobile Login

**Endpoint**: `POST /api/mobile/auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "deviceInfo": {
    "deviceId": "unique-device-id",
    "platform": "iOS",
    "version": "14.5",
    "appVersion": "1.0.0"
  }
}
```

**Response**:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "Station Manager",
      "organizationId": "org-id"
    }
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "message": "Invalid credentials",
    "code": "INVALID_CREDENTIALS",
    "statusCode": 401
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Refresh Token

**Endpoint**: `POST /api/mobile/auth/refresh`

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token"
  }
}
```

**Error Codes**:
- `TOKEN_REQUIRED`: No refresh token provided
- `INVALID_TOKEN`: Token is invalid or expired
- `TOKEN_REVOKED`: Token has been revoked
- `USER_NOT_FOUND`: User associated with token not found

## Data Synchronization

### Batch Sync Multiple Resources

**Endpoint**: `POST /api/mobile/sync`

**Headers**:
```
Authorization: Bearer <access-token>
```

**Request Body**:
```json
{
  "resources": ["stations", "audits", "incidents", "workPermits"],
  "lastSyncTimes": {
    "stations": "2024-01-15T08:00:00.000Z",
    "audits": "2024-01-14T10:00:00.000Z",
    "incidents": "2024-01-15T09:00:00.000Z"
  }
}
```

**Response**:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "stations": {
      "resource": "stations",
      "data": [...],
      "hasMore": false,
      "lastSyncTime": "2024-01-15T10:30:00.000Z"
    },
    "audits": {
      "resource": "audits",
      "data": [...],
      "hasMore": true,
      "lastSyncTime": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Sync Single Resource

**Endpoint**: `GET /api/mobile/sync/:resource`

**Headers**:
```
Authorization: Bearer <access-token>
```

**Query Parameters**:
- `lastSync` (optional): ISO 8601 timestamp of last sync
- `limit` (optional): Max records to return (default: 100)

**Example**: `GET /api/mobile/sync/audits?lastSync=2024-01-15T08:00:00.000Z&limit=50`

**Response**:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "resource": "audits",
    "data": [
      {
        "id": "audit-id",
        "auditNumber": "AUD-12345",
        "status": "Completed",
        "updatedAt": "2024-01-15T09:30:00.000Z"
      }
    ],
    "hasMore": false,
    "lastSyncTime": "2024-01-15T10:30:00.000Z"
  }
}
```

**Supported Resources**:
- `stations`
- `audits`
- `incidents`
- `workPermits`

## Image Management

### Single Image Upload with Compression

**Endpoint**: `POST /api/mobile/images/upload`

**Headers**:
```
Authorization: Bearer <access-token>
Content-Type: multipart/form-data
```

**Form Data**:
- `image`: Image file (max 10MB)
- `compress`: "true" or "false" (default: "true")
- `generateThumbnail`: "true" or "false" (default: "true")

**Response**:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "original": {
      "url": "/uploads/1234567890-original.jpg",
      "size": 2048000
    },
    "compressed": {
      "url": "/uploads/1234567890-compressed.jpg",
      "size": 512000,
      "compressionRatio": "75.00%"
    },
    "thumbnail": {
      "url": "/uploads/1234567890-thumbnail.jpg",
      "size": 45000
    }
  }
}
```

**Image Sizes**:
- **Original**: Quality 85%, optimized
- **Mobile**: 800x800px max, quality 75%
- **Thumbnail**: 150x150px, quality 70%

### Batch Image Upload

**Endpoint**: `POST /api/mobile/images/batch-upload`

**Headers**:
```
Authorization: Bearer <access-token>
Content-Type: multipart/form-data
```

**Form Data**:
- `images`: Array of image files (max 10 files)
- `compress`: "true" or "false" (default: "true")

**Response**:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "images": [
      {
        "original": {
          "url": "/uploads/img1.jpg",
          "size": 2048000
        },
        "compressed": {
          "url": "/uploads/img1_compressed.jpg",
          "size": 512000,
          "compressionRatio": "75.00%"
        }
      }
    ],
    "count": 1
  }
}
```

## Batch Operations

### Batch Audit Upload

**Endpoint**: `POST /api/mobile/audits/batch`

**Headers**:
```
Authorization: Bearer <access-token>
```

**Request Body**:
```json
{
  "audits": [
    {
      "stationId": "station-id-1",
      "formId": "form-id",
      "scheduledDate": "2024-01-20T09:00:00.000Z",
      "completedDate": "2024-01-20T11:30:00.000Z",
      "status": "Completed",
      "findings": [
        {
          "question": "Fire extinguisher present?",
          "answer": "Yes",
          "score": 10
        }
      ],
      "overallScore": 95
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "created": [
      {
        "id": "audit-id",
        "auditNumber": "AUD-12345",
        "status": "Completed",
        "overallScore": 95
      }
    ],
    "failed": [],
    "total": 1
  }
}
```

## Lightweight Endpoints

Optimized endpoints with minimal field selection for reduced bandwidth usage.

### Get Stations (Lightweight)

**Endpoint**: `GET /api/mobile/stations/lightweight`

**Headers**:
```
Authorization: Bearer <access-token>
```

**Query Parameters**:
- `region` (optional): Filter by region

**Response**:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "stations": [
      {
        "id": "station-id",
        "name": "Station A",
        "brand": "Brand X",
        "region": "North",
        "riskCategory": "Medium",
        "isActive": true
      }
    ],
    "count": 1
  }
}
```

### Get Audits (Lightweight)

**Endpoint**: `GET /api/mobile/audits/lightweight`

**Headers**:
```
Authorization: Bearer <access-token>
```

**Query Parameters**:
- `status` (optional): Filter by status
- `limit` (optional): Max records (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "audits": [...],
    "count": 25,
    "total": 100,
    "hasMore": true
  }
}
```

### Get Incidents (Lightweight)

**Endpoint**: `GET /api/mobile/incidents/lightweight`

**Headers**:
```
Authorization: Bearer <access-token>
```

**Query Parameters**:
- `severity` (optional): Filter by severity
- `status` (optional): Filter by status
- `limit` (optional): Max records (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "incidents": [...],
    "count": 10,
    "total": 50,
    "hasMore": true
  }
}
```

## Health Check

**Endpoint**: `GET /api/mobile/health`

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "mobile-api"
}
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Common Error Codes**:
- `VALIDATION_ERROR`: Invalid request parameters
- `INVALID_CREDENTIALS`: Authentication failed
- `EMAIL_NOT_VERIFIED`: User email not verified
- `TOKEN_REQUIRED`: Missing authentication token
- `INVALID_TOKEN`: Invalid or expired token
- `TOKEN_REVOKED`: Token has been revoked
- `USER_NOT_FOUND`: User not found
- `FILE_REQUIRED`: Missing required file
- `FILES_REQUIRED`: Missing required files
- `PROCESSING_ERROR`: Server processing error
- `INTERNAL_ERROR`: Internal server error

## Best Practices

### Token Management

1. **Store tokens securely**: Use secure storage (Keychain/Keystore)
2. **Automatic refresh**: Implement automatic token refresh before expiry
3. **Handle token errors**: Redirect to login on 401/403 errors
4. **Logout**: Call logout endpoint and clear local tokens

### Offline Sync Strategy

1. **Initial sync**: Download all resources on first login
2. **Incremental sync**: Use `lastSyncTimes` for subsequent syncs
3. **Conflict resolution**: Server data takes precedence
4. **Queue operations**: Queue create/update operations when offline
5. **Sync on reconnect**: Automatically sync when connection restored

### Image Optimization

1. **Compress before upload**: Use mobile-optimized images
2. **Use thumbnails**: Display thumbnails in lists, full images on detail
3. **Batch uploads**: Upload multiple images together for efficiency
4. **Progress tracking**: Show upload progress to users

### Performance Tips

1. **Use lightweight endpoints**: For list views and syncing
2. **Implement pagination**: Use offset/limit for large datasets
3. **Cache responses**: Cache data locally with TTL
4. **Batch requests**: Combine multiple operations when possible
5. **Minimize payload**: Only request needed fields

## Rate Limiting

All mobile API endpoints are subject to rate limiting:
- **Authentication endpoints**: 10 requests per minute
- **Sync endpoints**: 30 requests per minute
- **Image uploads**: 20 requests per minute
- **Other endpoints**: 60 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1642248000
```
