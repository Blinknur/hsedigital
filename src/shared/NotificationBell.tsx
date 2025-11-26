import React, { useState } from 'react';
import { useNotificationContext } from './NotificationProvider';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, clearNotifications, removeNotification, markAsRead, connected } = useNotificationContext();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      markAsRead();
    }
  };

  const getSeverityColor = (notification: any) => {
    const severity = notification.severity || notification.level;
    switch (severity) {
      case 'high':
      case 'error':
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'medium':
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
      case 'info':
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('incident')) return '🚨';
    if (type.includes('audit')) return '📋';
    if (type.includes('work_permit')) return '📝';
    if (type.includes('quota')) return '⚠️';
    if (type.includes('system')) return '🔔';
    if (type.includes('user')) return '👤';
    return '📬';
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {!connected && (
          <span className="absolute bottom-0 right-0 w-2 h-2 bg-gray-400 rounded-full" title="Disconnected" />
        )}
        {connected && (
          <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full" title="Connected" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-50 w-96 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="overflow-y-auto max-h-80">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-2 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification, index) => (
                  <div
                    key={index}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${getSeverityColor(notification)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                          <h4 className="text-sm font-semibold text-gray-900">
                            {notification.title}
                          </h4>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => removeNotification(index)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
