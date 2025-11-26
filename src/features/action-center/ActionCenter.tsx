
import React from 'react';
// FIX: Imported the 'User' type to resolve the reference error.
import { Notification, NotificationType, UserRole, User } from '../../types';
import { ICONS } from '../../constants';
import Card from '../../shared/Card';
import EmptyState from '../../shared/EmptyState';

interface ActionCenterProps {
    notifications: Notification[];
    currentUser: User;
    setCurrentView: (view: string) => void;
}

const getNotificationIcon = (type: NotificationType) => {
    switch(type) {
        case NotificationType.CapaOverdue: return { icon: ICONS.audit, color: 'bg-red-100 text-red-600' };
        case NotificationType.CapaReview: return { icon: ICONS.checklist, color: 'bg-purple-100 text-purple-600' };
        case NotificationType.IncidentAlert: return { icon: ICONS.incident, color: 'bg-amber-100 text-amber-600' };
        case NotificationType.PermitApproval: return { icon: ICONS.permit, color: 'bg-cyan-100 text-cyan-600' };
        default: return { icon: ICONS.bell, color: 'bg-slate-100 text-slate-600' };
    }
};

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
    const { icon, color } = getNotificationIcon(notification.type);
    
    return (
        <a href={notification.link} className="block p-4 bg-white rounded-lg border hover:border-emerald-300 hover:shadow-sm transition-all">
            <div className="flex items-start space-x-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                    {React.cloneElement(icon, { className: 'w-5 h-5' })}
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center">
                        <p className="font-semibold text-slate-800">{notification.title}</p>
                        <p className="text-xs text-slate-400">{new Date(notification.timestamp).toLocaleDateString()}</p>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{notification.description}</p>
                </div>
            </div>
        </a>
    );
};

const ActionCenter: React.FC<ActionCenterProps> = ({ notifications, currentUser, setCurrentView }) => {
    
    // In a real app, logic for "tasks" vs "reviews" would be more robust.
    const myTasks = notifications.filter(n => 
        n.type === NotificationType.CapaAssigned || 
        n.type === NotificationType.CapaOverdue
    );

    const forReview = notifications.filter(n =>
        n.type === NotificationType.CapaReview ||
        n.type === NotificationType.PermitApproval
    );

    const activityFeed = notifications.filter(n => 
        !myTasks.some(t => t.id === n.id) && !forReview.some(r => r.id === n.id)
    );

    return (
        <div className="p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Action Center</h1>
            
            {notifications.length === 0 ? (
                <Card>
                    <EmptyState 
                        icon={ICONS.actionCenter}
                        title="All Caught Up!"
                        message="Your action center is clear. There are no pending tasks or notifications for you at the moment."
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {myTasks.length > 0 && (
                            <Card title={`My Tasks (${myTasks.length})`}>
                                <div className="space-y-3">
                                    {myTasks.map(n => <NotificationItem key={n.id} notification={n} />)}
                                </div>
                            </Card>
                        )}

                        {forReview.length > 0 && (
                             <Card title={`For Your Review (${forReview.length})`}>
                                <div className="space-y-3">
                                    {forReview.map(n => <NotificationItem key={n.id} notification={n} />)}
                                </div>
                            </Card>
                        )}
                    </div>
                    
                    <div className="lg:col-span-1">
                        <Card title="Activity Feed">
                            <div className="space-y-3">
                                {activityFeed.length > 0 ? (
                                    activityFeed.map(n => <NotificationItem key={n.id} notification={n} />)
                                ) : (
                                    <p className="text-sm text-slate-500 p-4 text-center">No other activities.</p>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActionCenter;
