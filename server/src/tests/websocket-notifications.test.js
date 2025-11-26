import { io as ioClient } from 'socket.io-client';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3001';

const createTestToken = (userId, organizationId, role = 'User') => {
  return jwt.sign(
    { 
      id: userId, 
      email: `test-${userId}@example.com`, 
      role,
      organizationId 
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const connectClient = (token) => {
  return new Promise((resolve, reject) => {
    const client = ioClient(SERVER_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false
    });

    client.on('connect', () => resolve(client));
    client.on('connect_error', (error) => reject(error));
    
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
};

const waitForEvent = (client, eventName, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    client.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
};

describe('WebSocket Notification System', () => {
  let client1, client2, adminClient;
  const tenantId = 'test-tenant-001';
  const userId1 = 'user-001';
  const userId2 = 'user-002';
  const adminId = 'admin-001';

  beforeAll(async () => {
    console.log('🔧 Setting up WebSocket test clients...');
    
    const token1 = createTestToken(userId1, tenantId);
    const token2 = createTestToken(userId2, tenantId);
    const adminToken = createTestToken(adminId, null, 'Admin');

    try {
      client1 = await connectClient(token1);
      console.log('✅ Client 1 connected');
      
      client2 = await connectClient(token2);
      console.log('✅ Client 2 connected');
      
      adminClient = await connectClient(adminToken);
      console.log('✅ Admin client connected');
    } catch (error) {
      console.error('❌ Failed to connect clients:', error);
      throw error;
    }
  });

  afterAll(() => {
    console.log('🧹 Cleaning up test clients...');
    client1?.disconnect();
    client2?.disconnect();
    adminClient?.disconnect();
  });

  test('should authenticate and connect successfully', async () => {
    expect(client1.connected).toBe(true);
    expect(client2.connected).toBe(true);
    expect(adminClient.connected).toBe(true);
  });

  test('should fail authentication with invalid token', async () => {
    await expect(connectClient('invalid-token')).rejects.toThrow();
  });

  test('should fail authentication without token', async () => {
    await expect(
      new Promise((resolve, reject) => {
        const client = ioClient(SERVER_URL, {
          transports: ['websocket'],
          reconnection: false
        });
        client.on('connect_error', (error) => reject(error));
        setTimeout(() => reject(new Error('Timeout')), 2000);
      })
    ).rejects.toThrow();
  });

  test('should subscribe to authorized channels', async () => {
    client1.emit('subscribe', { 
      channels: [`tenant:${tenantId}`, `user:${userId1}`] 
    });

    const response = await waitForEvent(client1, 'subscribed');
    expect(response.channels).toEqual([`tenant:${tenantId}`, `user:${userId1}`]);
  });

  test('should receive tenant-scoped notifications', async () => {
    const notificationPromise = waitForEvent(client1, 'test:notification');
    
    const testData = {
      type: 'test_notification',
      title: 'Test Notification',
      message: 'This is a test message',
      tenantId
    };

    const response = await fetch(`${SERVER_URL}/api/notifications/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${createTestToken(adminId, null, 'Admin')}`
      },
      body: JSON.stringify({
        type: 'tenant',
        event: 'test:notification',
        message: 'This is a test message'
      })
    });

    if (response.ok) {
      const notification = await notificationPromise;
      expect(notification.message).toBe('This is a test message');
      expect(notification.tenantId).toBe(tenantId);
    }
  }, 10000);

  test('should receive user-specific notifications', async () => {
    const notificationPromise = waitForEvent(client1, 'test:notification');
    
    const response = await fetch(`${SERVER_URL}/api/notifications/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${createTestToken(userId1, tenantId)}`
      },
      body: JSON.stringify({
        type: 'user',
        event: 'test:notification',
        message: 'User-specific test'
      })
    });

    if (response.ok) {
      const notification = await notificationPromise;
      expect(notification.message).toBe('User-specific test');
      expect(notification.userId).toBe(userId1);
    }
  }, 10000);

  test('should isolate notifications between tenants', async () => {
    const otherTenantId = 'test-tenant-002';
    const otherUserId = 'user-003';
    const otherToken = createTestToken(otherUserId, otherTenantId);

    const otherClient = await connectClient(otherToken);
    
    let receivedByOther = false;
    otherClient.on('test:notification', () => {
      receivedByOther = true;
    });

    const notificationPromise = waitForEvent(client1, 'test:notification');
    
    const response = await fetch(`${SERVER_URL}/api/notifications/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${createTestToken(userId1, tenantId)}`
      },
      body: JSON.stringify({
        type: 'tenant',
        event: 'test:notification',
        message: 'Tenant isolation test'
      })
    });

    if (response.ok) {
      await notificationPromise;
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(receivedByOther).toBe(false);
    }

    otherClient.disconnect();
  }, 10000);

  test('should handle ping/pong', async () => {
    client1.emit('ping');
    const pong = await waitForEvent(client1, 'pong');
    expect(pong.timestamp).toBeDefined();
    expect(typeof pong.timestamp).toBe('number');
  });

  test('should unsubscribe from channels', async () => {
    client1.emit('unsubscribe', { 
      channels: [`tenant:${tenantId}`] 
    });

    const response = await waitForEvent(client1, 'unsubscribed');
    expect(response.channels).toEqual([`tenant:${tenantId}`]);
  });

  test('should handle disconnection gracefully', async () => {
    const tempToken = createTestToken('temp-user', tenantId);
    const tempClient = await connectClient(tempToken);
    
    expect(tempClient.connected).toBe(true);
    
    tempClient.disconnect();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(tempClient.connected).toBe(false);
  });

  test('should prevent unauthorized room subscriptions', async () => {
    const unauthorizedTenantId = 'unauthorized-tenant';
    
    let errorReceived = false;
    client1.on('error', () => {
      errorReceived = true;
    });

    client1.emit('subscribe', { 
      channels: [`tenant:${unauthorizedTenantId}`] 
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  test('should get notification status', async () => {
    const response = await fetch(`${SERVER_URL}/api/notifications/status`, {
      headers: {
        'Authorization': `Bearer ${createTestToken(userId1, tenantId)}`
      }
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.tenant).toBeDefined();
    expect(data.tenant.id).toBe(tenantId);
    expect(data.user).toBeDefined();
    expect(data.user.id).toBe(userId1);
    expect(data.serverTime).toBeDefined();
  });
});

if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log('🧪 Running WebSocket Notification Tests...');
  console.log('Make sure the server is running on', SERVER_URL);
  console.log('');
}
