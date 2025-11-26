# WebSocket Real-Time Notification System

## Overview

The HSE Digital platform includes a comprehensive real-time notification system built with Socket.io, Redis adapter for horizontal scaling, and multi-tenant architecture with proper tenant isolation.

## Architecture

### Components

1. **Socket.io Server** (`server/config/socket.js`)
   - WebSocket server with Redis adapter for multi-instance scaling
   - JWT-based authentication middleware
   - Tenant-scoped room management
   - Connection lifecycle management

2. **Notification Service** (`server/services/notificationService.js`)
   - Centralized notification emission service
   - Event-specific notification methods
   - Multi-tenant and per-user notification support

3. **Client Hooks** (`hooks/useNotifications.ts`)
   - React hook for WebSocket connection management
   - Automatic reconnection with exponential backoff
   - Event subscription management

4. **UI Components** (`components/NotificationBell.tsx`, `components/NotificationProvider.tsx`)
   - Notification bell with unread count
   - Notification list UI
   - Browser notification integration

## Features

### Multi-Tenant Support

- **Tenant Rooms**: Each tenant gets a dedicated room (`tenant:{tenantId}`)
- **User Rooms**: Each user gets a personal room (`user:{userId}`)
- **Automatic Isolation**: Socket.io middleware enforces tenant boundaries
- **Subscription Control**: Clients can only subscribe to their authorized rooms

### Horizontal Scaling

- **Redis Adapter**: Uses Redis pub/sub for multi-instance communication
- **Load Balancing**: WebSocket connections can be distributed across multiple server instances
- **Session Persistence**: Not required due to Redis-based message distribution

### Security

- **JWT Authentication**: All WebSocket connections require valid JWT token
- **Room Authorization**: Middleware prevents unauthorized room subscriptions
- **Tenant Isolation**: Users can only receive notifications for their tenant

### Event Types

#### Incident Events
- `incident:created` - New incident reported
- `incident:updated` - Incident details changed
- `incident:status_changed` - Incident status transition

#### Audit Events
- `audit:created` - New audit scheduled
- `audit:updated` - Audit details changed
- `audit:status_changed` - Audit status transition
- `audit:assigned` - Audit assigned to auditor (user-specific)

#### Audit Log Events
- `audit_log:created` - New audit log entry (compliance tracking)

#### Work Permit Events
- `work_permit:created` - New work permit issued
- `work_permit:status_changed` - Permit status changed

#### System Events
- `system:notification` - General system notifications
- `quota:warning` - Approaching quota limit (80%+)
- `quota:exceeded` - Quota limit exceeded
- `user:role_changed` - User role modification

## Usage

### Server-Side

#### Emitting Notifications

```javascript
import { notificationService } from '../services/notificationService.js';

// Notify entire tenant
notificationService.incidentCreated(tenantId, incident);

// Notify specific user
notificationService.emitToUser(userId, 'audit:assigned', {
  title: 'Audit Assigned',
  message: 'You have been assigned a new audit',
  data: audit
});

// Broadcast to all connected clients
notificationService.broadcast('system:maintenance', {
  title: 'System Maintenance',
  message: 'Scheduled maintenance in 30 minutes'
});
```

#### Custom Notifications

```javascript
notificationService.emitToTenant(tenantId, 'custom:event', {
  type: 'custom_event',
  title: 'Custom Notification',
  message: 'Your custom message',
  level: 'info',
  data: { /* custom data */ }
});
```

### Client-Side

#### Using the Hook

```typescript
import { useNotifications } from '../hooks/useNotifications';

const MyComponent = () => {
  const { 
    connected, 
    notifications, 
    clearNotifications,
    removeNotification 
  } = useNotifications({
    autoConnect: true,
    onNotification: (notification) => {
      console.log('New notification:', notification);
    },
    onConnect: () => {
      console.log('Connected to notifications');
    }
  });

  return (
    <div>
      <p>Status: {connected ? 'Connected' : 'Disconnected'}</p>
      <p>Notifications: {notifications.length}</p>
    </div>
  );
};
```

#### Using the Context Provider

```typescript
import { NotificationProvider, useNotificationContext } from '../components/NotificationProvider';
import { NotificationBell } from '../components/NotificationBell';

// Wrap your app
<NotificationProvider enableToast={true}>
  <App />
</NotificationProvider>

// Use in components
const MyComponent = () => {
  const { notifications, unreadCount } = useNotificationContext();
  
  return (
    <div>
      <NotificationBell />
      <p>Unread: {unreadCount}</p>
    </div>
  );
};
```

## API Endpoints

### GET `/api/notifications/status`

Get connection status and counts.

**Response:**
```json
{
  "tenant": {
    "id": "tenant-id",
    "connections": 5
  },
  "user": {
    "id": "user-id",
    "connections": 1
  },
  "serverTime": "2024-01-01T00:00:00.000Z"
}
```

### POST `/api/notifications/test`

Send test notification (admin only).

**Request:**
```json
{
  "type": "user",
  "event": "test:notification",
  "message": "Test message"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test notification sent to user",
  "event": "test:notification"
}
```

### POST `/api/notifications/broadcast`

Broadcast notification to all clients (admin only).

**Request:**
```json
{
  "event": "system:announcement",
  "title": "System Announcement",
  "message": "Important system update",
  "level": "info"
}
```

### POST `/api/notifications/system`

Send system notification to tenant (admin only).

**Request:**
```json
{
  "title": "System Alert",
  "message": "Your message here",
  "level": "warning"
}
```

## WebSocket Events

### Client → Server

#### `subscribe`
Subscribe to additional channels (must be authorized).

```javascript
socket.emit('subscribe', { 
  channels: ['tenant:my-tenant-id', 'user:my-user-id'] 
});
```

#### `unsubscribe`
Unsubscribe from channels.

```javascript
socket.emit('unsubscribe', { 
  channels: ['tenant:my-tenant-id'] 
});
```

#### `ping`
Check connection health.

```javascript
socket.emit('ping');
// Response: { timestamp: 1234567890 }
```

### Server → Client

#### Event Structure

All notifications follow this structure:

```typescript
{
  type: string;           // Event type identifier
  title: string;          // Notification title
  message: string;        // Notification message
  timestamp: string;      // ISO 8601 timestamp
  tenantId?: string;      // Tenant ID (for tenant events)
  userId?: string;        // User ID (for user events)
  severity?: string;      // 'low' | 'medium' | 'high'
  level?: string;         // 'info' | 'warning' | 'error'
  data?: any;            // Event-specific data
}
```

## Configuration

### Environment Variables

```bash
# Redis Configuration (required for multi-instance scaling)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# JWT Configuration
JWT_SECRET=your-secret-key
```

### Socket.io Options

The server is configured with:
- **Transports**: WebSocket (primary), polling (fallback)
- **Ping Timeout**: 60 seconds
- **Ping Interval**: 25 seconds
- **Reconnection**: Automatic with exponential backoff

## Monitoring

### Connection Metrics

```javascript
// Get connected clients count for a tenant
const count = notificationService.getTenantConnectedClientsCount(tenantId);

// Get connected clients count for a user
const count = notificationService.getUserConnectedClientsCount(userId);

// Get connected socket IDs
const socketIds = notificationService.getConnectedClients(`tenant:${tenantId}`);
```

### Logging

All WebSocket events are logged using Pino logger:
- Connection/disconnection events
- Authentication events
- Subscription changes
- Notification emissions

## Best Practices

### Server-Side

1. **Always use the notification service** instead of directly accessing Socket.io
2. **Include relevant data** in notifications for client-side rendering
3. **Use appropriate event names** following the `entity:action` pattern
4. **Set proper severity/level** for filtering and UI rendering
5. **Avoid sending sensitive data** in notifications

### Client-Side

1. **Handle connection state** gracefully (show disconnected indicator)
2. **Implement reconnection** with exponential backoff
3. **Request browser notification permissions** early
4. **Limit notification history** to prevent memory issues
5. **Unsubscribe on unmount** to prevent memory leaks

## Testing

### Test WebSocket Connection

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:3001 -H "Authorization: Bearer YOUR_TOKEN"

# Send subscription
> {"type":"subscribe","channels":["tenant:your-tenant-id"]}
```

### Test Notifications API

```bash
# Test user notification
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"user","message":"Test notification"}'

# Test broadcast (admin only)
curl -X POST http://localhost:3001/api/notifications/broadcast \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event":"test","message":"Broadcast test"}'
```

## Troubleshooting

### WebSocket Connection Fails

1. Check JWT token validity
2. Verify CORS configuration
3. Check Redis connection
4. Review server logs for authentication errors

### Notifications Not Received

1. Verify user is subscribed to correct room
2. Check tenant ID matches
3. Confirm Socket.io server is initialized
4. Review browser console for connection errors

### Redis Connection Issues

1. Verify Redis is running
2. Check Redis connection credentials
3. Review Redis logs
4. Test Redis connectivity with `redis-cli`

### Multiple Server Instances

1. Ensure Redis adapter is properly configured
2. Verify all instances use same Redis server
3. Check network connectivity between instances
4. Monitor Redis pub/sub channels

## Performance Considerations

- **Connection Limits**: Monitor concurrent WebSocket connections
- **Message Size**: Keep notification payloads small (< 1KB recommended)
- **Rate Limiting**: Consider rate limiting notification emissions
- **Memory Usage**: Limit client-side notification history
- **Redis Memory**: Monitor Redis memory usage for pub/sub

## Security Considerations

- **Authentication**: All connections require valid JWT
- **Authorization**: Middleware enforces tenant boundaries
- **Rate Limiting**: Consider implementing connection rate limits
- **Input Validation**: Validate all client → server messages
- **Encryption**: Use WSS (WebSocket Secure) in production
- **Token Rotation**: Handle JWT expiration and rotation

## Future Enhancements

- [ ] Persistent notification storage
- [ ] Read/unread status tracking
- [ ] Notification preferences per user
- [ ] Notification categories and filtering
- [ ] Push notifications for mobile apps
- [ ] Email fallback for offline users
- [ ] Notification templates
- [ ] Multi-language support
- [ ] Notification scheduling
- [ ] Advanced analytics and metrics
