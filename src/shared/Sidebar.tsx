
import React, { useMemo } from 'react';
import { ICONS } from '../constants';
import { View, User, UserRole, Organization, Permission } from '../types';
import { getUserPermissions } from '../auth/permissions';

declare global {
  interface Window {
    marker?: {
      capture: (type: string) => void;
    };
  }
}

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  currentUser: User;
  onUserChange: (user: User) => void;
  users: User[];
  organizations: Organization[];
  viewingOrganizationId: string;
  setViewingOrganizationId: (orgId: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setCurrentView, 
  currentUser, 
  onUserChange, 
  users, 
  organizations, 
  viewingOrganizationId, 
  setViewingOrganizationId,
  onLogout
}) => {
  const currentOrganization = organizations.find(org => org.id === currentUser.organizationId);
  const isFreePlan = currentOrganization?.subscriptionPlan === 'free';

  const navItems: { id: View; name: string; icon: React.ReactElement<any>; permission: Permission; premium?: boolean }[] = [
    { id: 'dashboard', name: 'Dashboard', icon: ICONS.dashboard, permission: Permission.ViewDashboard },
    { id: 'actionCenter', name: 'Action Center', icon: ICONS.actionCenter, permission: Permission.ViewActionCenter },
    { id: 'planning', name: 'Planning', icon: ICONS.planning, permission: Permission.ViewPlanning },
    { id: 'permit', name: 'Permit to Work', icon: ICONS.permit, permission: Permission.RequestPermits },
    { id: 'analyticsStudio', name: 'Analytics Studio', icon: ICONS.reports, permission: Permission.ViewAnalytics, premium: true },
    { id: 'biDashboard', name: 'BI Dashboard', icon: ICONS.biDashboard, permission: Permission.ViewBIDashboard, premium: true },
    { id: 'checklist', name: 'Submit Checklist', icon: ICONS.checklist, permission: Permission.SubmitChecklists },
    { id: 'incident', name: 'Incidents', icon: ICONS.incident, permission: Permission.ReportIncidents },
  ];

  const settingsItem: { id: View; name: string; icon: React.ReactElement<any>; permission: Permission } = { id: 'settings', name: 'Settings', icon: ICONS.settings, permission: Permission.ViewSettings };
  
  // To avoid hook violations in loops/filters, get all permissions once.
  const userPermissions = useMemo(() => getUserPermissions(currentUser), [currentUser]);
  // Then use a simple function to check against the memoized list.
  const canView = (permission: Permission) => userPermissions.includes(permission);


  const handleFeedbackClick = () => {
    if (window.marker) {
      window.marker.capture('fullscreen');
    } else {
      alert("Feedback tool not available.");
    }
  };

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col min-h-screen print:hidden">
      <div className="p-5 text-2xl font-bold border-b border-slate-800">
        HSE<span className="text-emerald-400">.Digital</span>
      </div>
      <nav className="mt-6 flex-1 px-3">
        <ul>
          {navItems.filter(item => canView(item.permission)).map((item) => (
            <li key={item.id}>
              <a
                href={`#/${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentView(item.id);
                }}
                className={`flex items-center p-3 my-1 rounded-md transition-colors duration-200 relative ${
                  currentView === item.id
                    ? 'bg-slate-700 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {currentView === item.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400 rounded-r-full"></div>}
                {React.cloneElement(item.icon, { className: 'h-5 w-5 mr-3' })}
                <span className="flex-grow">{item.name}</span>
                {item.premium && isFreePlan && (
                  <span className="ml-2 text-xs font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">PRO</span>
                )}
              </a>
            </li>
          ))}
        </ul>
      </nav>
       <div className="p-4 border-t border-slate-800 space-y-4">
        {currentUser.role === UserRole.Admin && currentUser.organizationId === null ? (
            <div>
                <label htmlFor="org-switcher" className="text-xs text-slate-400 font-medium">SUPERADMIN: VIEWING ORGANIZATION</label>
                <select 
                    id="org-switcher"
                    value={viewingOrganizationId}
                    onChange={(e) => setViewingOrganizationId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white p-2 rounded-md mt-1 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                >
                    {organizations.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                </select>
            </div>
        ) : (
            <div className="px-3 py-2 bg-slate-800 rounded-md">
                <p className="text-xs text-slate-400 font-medium">ORGANIZATION</p>
                <p className="font-semibold text-white">{currentOrganization?.name || 'N/A'}</p>
            </div>
        )}

        <div>
            <label htmlFor="user-switcher" className="text-xs text-slate-400 font-medium">SWITCH USER (DEMO)</label>
            <select 
                id="user-switcher"
                value={currentUser.id}
                onChange={(e) => {
                    const selectedUser = users.find(u => u.id === e.target.value);
                    if (selectedUser) {
                        onUserChange(selectedUser);
                        setCurrentView('dashboard');
                    }
                }}
                className="w-full bg-slate-800 border border-slate-700 text-white p-2 rounded-md mt-1 text-sm focus:ring-emerald-500 focus:border-emerald-500"
            >
                {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                ))}
            </select>
        </div>

         <nav className="px-0">
            <ul>
                <li>
                  <button
                    onClick={handleFeedbackClick}
                    className="flex w-full items-center p-3 my-1 rounded-md transition-colors text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    {React.cloneElement(ICONS.feedback, { className: 'h-5 w-5 mr-3' })}
                    <span className="font-medium text-sm">Send Feedback</span>
                  </button>
                </li>
                 {canView(settingsItem.permission) && (
                    <li>
                      <a
                        href={`#/${settingsItem.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentView(settingsItem.id);
                        }}
                        className={`flex items-center p-3 my-1 rounded-md transition-colors duration-200 relative ${
                          currentView === settingsItem.id
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {currentView === settingsItem.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400 rounded-r-full"></div>}
                        {React.cloneElement(settingsItem.icon, { className: 'h-5 w-5 mr-3' })}
                        <span className="font-medium text-sm">{settingsItem.name}</span>
                      </a>
                    </li>
                 )}
                <li>
                  <button
                    onClick={onLogout}
                    className="flex w-full items-center p-3 my-1 rounded-md transition-colors text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    <span className="font-medium text-sm">Logout</span>
                  </button>
                </li>
            </ul>
         </nav>
        <p className="text-xs text-slate-500 text-center pt-2">&copy; 2024 HSE.Digital</p>
      </div>
    </div>
  );
};

export default Sidebar;
