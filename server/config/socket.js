import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

const pubClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
        if (times > 3) {
            logger.error('Redis pub client connection failed after 3 retries');
            return null;
        }
        return Math.min(times * 50, 2000);
    }
});

const subClient = pubClient.duplicate();

pubClient.on('error', (err) => {
    logger.error({ err }, 'Redis pub client error for Socket.io');
});

subClient.on('error', (err) => {
    logger.error({ err }, 'Redis sub client error for Socket.io');
});

pubClient.on('connect', () => {
    logger.info('✓ Redis pub client connected for Socket.io');
});

subClient.on('connect', () => {
    logger.info('✓ Redis sub client connected for Socket.io');
});

export const initializeSocketIO = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
    });

    io.adapter(createAdapter(pubClient, subClient));

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
            
            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, JWT_SECRET);
            socket.user = decoded;
            socket.tenantId = decoded.organizationId;
            socket.userId = decoded.id;

            logger.info({ 
                userId: socket.userId, 
                tenantId: socket.tenantId,
                socketId: socket.id 
            }, 'WebSocket authenticated');

            next();
        } catch (error) {
            logger.error({ err: error }, 'WebSocket authentication failed');
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        const { tenantId, userId } = socket;
        
        logger.info({ 
            userId, 
            tenantId, 
            socketId: socket.id,
            transport: socket.conn.transport.name
        }, 'Client connected to WebSocket');

        if (tenantId) {
            socket.join(`tenant:${tenantId}`);
            logger.info({ userId, tenantId, socketId: socket.id }, 'Joined tenant room');
        }

        socket.join(`user:${userId}`);
        logger.info({ userId, socketId: socket.id }, 'Joined user room');

        socket.on('subscribe', (data) => {
            try {
                const { channels } = data;
                
                if (!Array.isArray(channels)) {
                    socket.emit('error', { message: 'Invalid channels format' });
                    return;
                }

                channels.forEach(channel => {
                    if (channel.startsWith('tenant:') && channel === `tenant:${tenantId}`) {
                        socket.join(channel);
                        logger.info({ userId, channel }, 'Subscribed to channel');
                    } else if (channel.startsWith('user:') && channel === `user:${userId}`) {
                        socket.join(channel);
                        logger.info({ userId, channel }, 'Subscribed to channel');
                    } else {
                        logger.warn({ userId, channel }, 'Unauthorized subscription attempt');
                    }
                });

                socket.emit('subscribed', { channels });
            } catch (error) {
                logger.error({ err: error, userId }, 'Subscription error');
                socket.emit('error', { message: 'Subscription failed' });
            }
        });

        socket.on('unsubscribe', (data) => {
            try {
                const { channels } = data;
                
                if (!Array.isArray(channels)) {
                    socket.emit('error', { message: 'Invalid channels format' });
                    return;
                }

                channels.forEach(channel => {
                    socket.leave(channel);
                    logger.info({ userId, channel }, 'Unsubscribed from channel');
                });

                socket.emit('unsubscribed', { channels });
            } catch (error) {
                logger.error({ err: error, userId }, 'Unsubscription error');
                socket.emit('error', { message: 'Unsubscription failed' });
            }
        });

        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });

        socket.on('disconnect', (reason) => {
            logger.info({ 
                userId, 
                tenantId, 
                socketId: socket.id, 
                reason 
            }, 'Client disconnected from WebSocket');
        });

        socket.on('error', (error) => {
            logger.error({ 
                err: error, 
                userId, 
                tenantId, 
                socketId: socket.id 
            }, 'Socket error');
        });
    });

    return io;
};

export { pubClient, subClient };
