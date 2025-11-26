
import React from 'react';
import { User, View, Notification } from '../types';
import NotificationBell from './NotificationBell';

interface HeaderProps {
    currentView: View;
    currentUser: User;
    notifications: Notification[];
    onNavigateToProfile: () => void;
}

// A simple function to format view names into titles
const formatTitle = (view: View) => {
    switch (view) {
        case 'dashboard': return 'Dashboard';
        case 'actionCenter': return 'Action Center';
        case 'planning': return 'Audit Planning & Scheduling';
        case 'auditExecution': return 'Audit Execution';
        case 'preAuditBriefing': return 'Pre-Audit Briefing';
        case 'checklist': return 'Submit Checklist';
        case 'incident': return 'Report Incident';
        case 'reports': return 'Analytics & Reports';
        case 'settings': return 'System Settings';
        case 'analyticsStudio': return 'Analytics Studio';
        case 'biDashboard': return 'BI Dashboard';
        case 'permit': return 'Permit to Work';
        default: return 'HSE Dashboard';
    }
};

const Header: React.FC<HeaderProps> = ({ currentView, currentUser, notifications, onNavigateToProfile }) => {
    return (
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/80 p-4 flex items-center justify-between flex-shrink-0 z-10 print:hidden sticky top-0">
            {/* Left side: Title */}
            <div>
                <h1 className="text-xl font-bold text-slate-800">
                    {formatTitle(currentView)}
                </h1>
            </div>
            
            {/* Right side: Actions & User */}
            <div className="flex items-center space-x-5">
                <NotificationBell 
                    notifications={notifications}
                />
                <div className="w-px h-7 bg-slate-200"></div>
                <button 
                    onClick={onNavigateToProfile}
                    className="flex items-center space-x-3 group focus:outline-none"
                    title="Go to Profile Settings"
                >
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors border-2 border-transparent group-hover:border-emerald-200">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-sm text-slate-700 group-hover:text-emerald-700 transition-colors">{currentUser.name}</p>
                        <p className="text-xs text-slate-500">{currentUser.role}</p>
                    </div>
                </button>
            </div>
        </header>
    );
};

export default Header;
