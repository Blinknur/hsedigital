# WebSocket Notifications - Quick Start Guide

## Installation

The WebSocket notification system is already integrated. All required dependencies are installed.

```bash
# Dependencies already installed:
# - socket.io
# - socket.io-client
# - @socket.io/redis-adapter
```

## Server Setup

The WebSocket server is automatically initialized when you start the application:

```bash
# Start the server
npm start

# Or in development mode
npm run dev

# With Docker
npm run docker:up
```

The server will log:
```
✅ WebSocket server initialized with Redis adapter for horizontal scaling
```

## Client Setup (React/TypeScript)

### 1. Wrap your app with NotificationProvider

```tsx
import { NotificationProvider } from './components/NotificationProvider';
import { NotificationBell } from './components/NotificationBell';

function App() {
  return (
    <NotificationProvider enableToast={true}>
      <div className="app">
        <header>
          <nav>
            {/* Other nav items */}
            <NotificationBell />
          </nav>
        </header>
        <main>
          {/* Your app content */}
        </main>
      </div>
    </NotificationProvider>
  );
}
```

### 2. Use notifications in any component

```tsx
import { useNotificationContext } from './components/NotificationProvider';

function MyComponent() {
  const { notifications, unreadCount, connected } = useNotificationContext();

  return (
    <div>
      <p>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</p>
      <p>Unread: {unreadCount}</p>
      <ul>
        {notifications.map((notification, index) => (
          <li key={index}>
            <strong>{notification.title}</strong>: {notification.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 3. Or use the hook directly

```tsx
import { useNotifications } from '../hooks/useNotifications';

function CustomComponent() {
  const { connected, notifications } = useNotifications({
    autoConnect: true,
    onNotification: (notification) => {
      console.log('New notification:', notification);
      // Custom handling
    }
  });

  // Your component logic
}
```

## Testing

### 1. Test with HTML Client

Open `server/examples/notification-client-example.html` in your browser:

1. Get a JWT token by logging in
2. Paste the token in the input field
3. Click "Connect"
4. You'll see real-time notifications appear

### 2. Test with API

```bash
# Get your auth token
TOKEN="your-jwt-token-here"

# Send test notification
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"user","message":"Test notification"}'

# Check connection status
curl http://localhost:3001/api/notifications/status \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Test with automated tests

```bash
# Make sure server is running
npm start

# In another terminal, run tests
npm test -- tests/websocket-notifications.test.js
```

## Environment Variables

Add to your `.env` file:

```bash
# Redis Configuration (required for multi-instance scaling)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-secret-key

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

## Notification Events

The system automatically emits notifications for:

### Incidents
- ✅ **incident:created** - When new incident is reported
- ✅ **incident:updated** - When incident is modified
- ✅ **incident:status_changed** - When incident status changes

### Audits
- ✅ **audit:created** - When new audit is scheduled
- ✅ **audit:updated** - When audit is modified
- ✅ **audit:status_changed** - When audit status changes
- ✅ **audit:assigned** - When audit is assigned to auditor (user-specific)

### System
- ✅ **audit_log:created** - When audit log entry is created
- ✅ **quota:warning** - When approaching quota limit (80%+)
- ✅ **quota:exceeded** - When quota limit is exceeded
- ✅ **system:notification** - General system notifications

### Work Permits
- ✅ **work_permit:created** - When new permit is issued
- ✅ **work_permit:status_changed** - When permit status changes

## Sending Custom Notifications

### From your code

```javascript
import { notificationService } from '../services/notificationService.js';

// Notify entire tenant
notificationService.emitToTenant(tenantId, 'custom:event', {
  type: 'custom_event',
  title: 'Custom Notification',
  message: 'Your message here',
  level: 'info',
  data: { /* any additional data */ }
});

// Notify specific user
notificationService.emitToUser(userId, 'user:alert', {
  type: 'user_alert',
  title: 'Personal Alert',
  message: 'This is for you',
  level: 'warning'
});

// Broadcast to everyone
notificationService.broadcast('maintenance:scheduled', {
  title: 'Scheduled Maintenance',
  message: 'System maintenance in 30 minutes',
  level: 'warning'
});
```

### From API (Admin only)

```bash
# Send system notification to tenant
curl -X POST http://localhost:3001/api/notifications/system \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "System Alert",
    "message": "Important update",
    "level": "warning"
  }'

# Broadcast to all users
curl -X POST http://localhost:3001/api/notifications/broadcast \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "system:announcement",
    "title": "Announcement",
    "message": "System update completed",
    "level": "info"
  }'
```

## Monitoring

### Check connection status

```bash
curl http://localhost:3001/api/notifications/status \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "tenant": {
    "id": "your-tenant-id",
    "connections": 5
  },
  "user": {
    "id": "your-user-id",
    "connections": 1
  },
  "serverTime": "2024-01-01T00:00:00.000Z"
}
```

### Server logs

The server logs all WebSocket activity:
- Connection/disconnection events
- Authentication success/failure
- Notification emissions
- Subscription changes

Check logs:
```bash
# Docker
docker-compose logs -f app

# Local
tail -f server/logs/*.log
```

## Troubleshooting

### "Authentication required" error
- Ensure you're passing a valid JWT token
- Check token expiration
- Verify JWT_SECRET matches between client and server

### Not receiving notifications
- Check WebSocket connection status (should show 🟢 Connected)
- Verify you're subscribed to the correct room
- Check browser console for errors
- Ensure Redis is running

### Connection keeps dropping
- Check network stability
- Verify Redis connection
- Review server logs for errors
- Check firewall/proxy settings

### CORS errors
- Add your frontend URL to CORS_ORIGIN in .env
- Restart the server after changing CORS settings

## Production Deployment

### 1. Enable WSS (WebSocket Secure)

Configure your reverse proxy (nginx/Apache) to handle WSS:

```nginx
location /socket.io/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

### 2. Scale with Redis

The system uses Redis adapter, so you can run multiple server instances:

```bash
# Start multiple instances
PORT=3001 npm start &
PORT=3002 npm start &
PORT=3003 npm start &

# Use load balancer (nginx/HAProxy) to distribute connections
```

### 3. Monitor Redis

```bash
# Check Redis memory usage
redis-cli INFO memory

# Monitor pub/sub channels
redis-cli PUBSUB CHANNELS socket.io*
```

## Next Steps

1. Customize notification styling in `NotificationBell.tsx`
2. Add notification preferences per user
3. Implement read/unread status tracking
4. Add email fallback for offline users
5. Create notification templates

For more details, see [WEBSOCKET_NOTIFICATIONS.md](./WEBSOCKET_NOTIFICATIONS.md)
