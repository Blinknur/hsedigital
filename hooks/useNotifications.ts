import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface NotificationData {
  type: string;
  title: string;
  message: string;
  timestamp: string;
  tenantId?: string;
  userId?: string;
  severity?: string;
  level?: string;
  data?: any;
}

interface UseNotificationsOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onNotification?: (notification: NotificationData) => void;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const {
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError,
    onNotification
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const getToken = useCallback(() => {
    return localStorage.getItem('token');
  }, []);

  const connect = useCallback(() => {
    const token = getToken();
    
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    const newSocket = io(serverUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      onConnect?.();
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setConnected(false);
      onDisconnect?.(reason);
    });

    newSocket.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      onError?.(error);
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('WebSocket connection error:', error);
      onError?.(error);
    });

    const handleNotification = (data: NotificationData) => {
      console.log('Notification received:', data);
      setNotifications(prev => [data, ...prev].slice(0, 100));
      onNotification?.(data);
    };

    newSocket.on('incident:created', handleNotification);
    newSocket.on('incident:updated', handleNotification);
    newSocket.on('incident:status_changed', handleNotification);
    newSocket.on('audit:created', handleNotification);
    newSocket.on('audit:updated', handleNotification);
    newSocket.on('audit:status_changed', handleNotification);
    newSocket.on('audit:assigned', handleNotification);
    newSocket.on('audit_log:created', handleNotification);
    newSocket.on('work_permit:created', handleNotification);
    newSocket.on('work_permit:status_changed', handleNotification);
    newSocket.on('system:notification', handleNotification);
    newSocket.on('quota:warning', handleNotification);
    newSocket.on('quota:exceeded', handleNotification);
    newSocket.on('user:role_changed', handleNotification);
    newSocket.on('test:notification', handleNotification);

    newSocket.on('subscribed', (data) => {
      console.log('Subscribed to channels:', data.channels);
    });

    newSocket.on('unsubscribed', (data) => {
      console.log('Unsubscribed from channels:', data.channels);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [getToken, onConnect, onDisconnect, onError, onNotification]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    }
  }, []);

  const subscribe = useCallback((channels: string[]) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('subscribe', { channels });
    }
  }, [connected]);

  const unsubscribe = useCallback((channels: string[]) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('unsubscribe', { channels });
    }
  }, [connected]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  return {
    socket,
    connected,
    notifications,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    clearNotifications,
    removeNotification
  };
};
