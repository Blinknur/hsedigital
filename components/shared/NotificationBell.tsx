
import React, { useState, useRef, useEffect } from 'react';
import { Notification, NotificationType } from '../../types';
import { ICONS } from '../../constants';

interface NotificationBellProps {
    notifications: Notification[];
}

const getNotificationIcon = (type: NotificationType) => {
    switch(type) {
        case NotificationType.CapaOverdue: return <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">{ICONS.audit}</div>;
        case NotificationType.CapaReview: return <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">{ICONS.checklist}</div>;
        case NotificationType.IncidentAlert: return <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">{ICONS.incident}</div>;
        case NotificationType.PermitApproval: return <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center flex-shrink-0">{ICONS.permit}</div>;
        default: return <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">{ICONS.bell}</div>;
    }
}

const NotificationBell: React.FC<NotificationBellProps> = ({ notifications }) => {
    const [isOpen, setIsOpen] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);

    const notificationCount = notifications.length;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    if (notificationCount === 0) {
        return (
             <button className="relative text-slate-500 hover:text-slate-700 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                {React.cloneElement(ICONS.bell, { className: "w-6 h-6" })}
            </button>
        );
    }

    return (
        <div className="relative" ref={notificationRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative text-slate-500 hover:text-slate-700 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
                {React.cloneElement(ICONS.bell, { className: "w-6 h-6" })}
                <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center border-2 border-white">
                    {notificationCount}
                </span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-20">
                    <div className="p-3 border-b font-semibold text-sm text-slate-800 flex justify-between items-center">
                        <span>Notifications</span>
                        <a href="/#/actionCenter" onClick={() => setIsOpen(false)} className="text-xs font-medium text-emerald-600 hover:underline">View All</a>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.slice(0, 5).map((notif) => (
                            <a href={notif.link} key={notif.id} onClick={() => setIsOpen(false)} className="p-3 hover:bg-slate-50 border-b flex items-start space-x-3">
                                {getNotificationIcon(notif.type)}
                                <div>
                                    <p className="text-sm font-medium text-slate-900">
                                        {notif.title}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {notif.description}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {new Date(notif.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
