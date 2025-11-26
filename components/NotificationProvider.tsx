import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';

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

interface NotificationContextValue {
  connected: boolean;
  notifications: NotificationData[];
  clearNotifications: () => void;
  removeNotification: (index: number) => void;
  unreadCount: number;
  markAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
  enableToast?: boolean;
  onNotification?: (notification: NotificationData) => void;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  enableToast = false,
  onNotification 
}) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const handleNotification = (notification: NotificationData) => {
    setUnreadCount(prev => prev + 1);
    
    if (enableToast && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.type,
        requireInteraction: notification.severity === 'high' || notification.level === 'error'
      });
    }

    if (enableToast && !document.hidden) {
      console.log('🔔', notification.title, ':', notification.message);
    }
    
    onNotification?.(notification);
  };

  const {
    connected,
    notifications,
    clearNotifications: baseClearNotifications,
    removeNotification
  } = useNotifications({
    autoConnect: true,
    onConnect: () => {
      console.log('✅ Real-time notifications connected');
    },
    onDisconnect: (reason) => {
      console.warn('⚠️ Real-time notifications disconnected:', reason);
    },
    onError: (error) => {
      console.error('❌ Notification error:', error);
    },
    onNotification: handleNotification
  });

  const clearNotifications = () => {
    baseClearNotifications();
    setUnreadCount(0);
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  useEffect(() => {
    if (enableToast && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [enableToast]);

  const value: NotificationContextValue = {
    connected,
    notifications,
    clearNotifications,
    removeNotification,
    unreadCount,
    markAsRead
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
