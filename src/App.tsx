
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import ErrorBoundary from './shared/ErrorBoundary';
import DashboardApp from './features/dashboard/DashboardApp';
import LoginPage from './features/auth/LoginPage';
import SkeletonLoader from './shared/SkeletonLoader';
import {
    View,
    User,
    UserRole,
    Organization,
    ActivityLogEntry,
    ActivityType,
} from './types';
import * as api from './api/dataService';

type AppView = View | 'login';

const getViewFromHash = (): AppView => {
    const hash = window.location.hash.replace('#/', '');
    const [view] = hash.split('/'); // Handle parameters like incident/123
    const validViews: AppView[] = ['dashboard', 'planning', 'reports', 'checklist', 'incident', 'settings', 'preAuditBriefing', 'auditExecution', 'billing', 'login', 'permit', 'biDashboard', 'analyticsStudio', 'actionCenter'];
    if (validViews.includes(view as AppView)) return view as AppView;
    return 'login';
};

const App: React.FC = () => {
    const queryClient = useQueryClient();

    const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('accessToken'));
    const [currentView, setCurrentView] = useState<AppView>(getViewFromHash());
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // Fetch minimal data required for Auth and routing
    const { data: organizations = [], isLoading: isLoadingOrgs } = useQuery({ queryKey: ['organizations'], queryFn: api.fetchOrganizations });
    const { data: users = [], isLoading: isLoadingUsers } = useQuery({ queryKey: ['users'], queryFn: api.fetchUsers });

    useEffect(() => {
        const handleHashChange = () => setCurrentView(getViewFromHash());
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Session Restoration Logic - Fixed Race Condition
    useEffect(() => {
        // Wait for critical data to load before attempting to restore session
        if (isLoadingUsers || isLoadingOrgs) return;

        if (isAuthenticated && !currentUser) {
            const loggedInUserId = localStorage.getItem('loggedInUserId');
            // In a real app, we would fetch /api/auth/me here
            const foundUser = users.find(u => u.id === loggedInUserId);

            if (foundUser) {
                setCurrentUser(foundUser);
                setIsInitialLoading(false);
                if (currentView === 'login') {
                    window.location.hash = '#/dashboard';
                }
            } else {
                // Token exists but user locally unknown (or data invalid)
                console.warn("Session invalid: User not found in local cache.");
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('loggedInUserId');
                setIsAuthenticated(false);
                setIsInitialLoading(false);
            }
        } else {
            // Not authenticated or user already set
            setIsInitialLoading(false);
        }
    }, [isAuthenticated, users, organizations, currentUser, isLoadingUsers, isLoadingOrgs, currentView]);

    // --- Auth Handlers ---

    const logActivityMutation = useMutation({
        mutationFn: async (logEntry: Omit<ActivityLogEntry, 'id' | 'timestamp' | 'organizationId'>) => {
             console.log("Auth Activity:", logEntry.details);
             return null;
        }
    });

    const handleLogin = async (email: string) => {
        if (isLoadingUsers) {
            alert("System is initializing. Please try again in a moment.");
            return;
        }
        
        try {
            // Attempt to login via the backend service
            const { accessToken, refreshToken, user } = await api.login(email, 'password');
            
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('loggedInUserId', user.id);
            
            setCurrentUser(user);
            setIsAuthenticated(true);
            
            logActivityMutation.mutate({ userId: user.id, actionType: ActivityType.UserLogin, entityType: 'system', details: 'User logged in successfully.' });
            window.location.hash = '#/dashboard';
        } catch (error) {
            console.error("Login failed:", error);
            alert("Login failed. Please check your email or contact administrator.");
        }
    };

    const handleSsoLogin = (email: string) => {
        // For SSO, we might simulate the redirect flow or just allow mock login if configured
        handleLogin(email);
    };

    const handleLogout = () => {
        if(currentUser) {
             logActivityMutation.mutate({ userId: currentUser.id, actionType: ActivityType.UserLogout, entityType: 'system', details: 'User logged out.' });
        }
        localStorage.clear();
        setIsAuthenticated(false);
        setCurrentUser(null);
        setIsInitialLoading(true);
        window.location.hash = '#/login';
    };
    
    const handleUserChange = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem('loggedInUserId', user.id);
    };

    const handleSetCurrentView = (view: View) => {
        window.location.hash = `#/${view}`;
        setCurrentView(view);
    };

    if (isLoadingOrgs || isLoadingUsers || isInitialLoading) {
        return <div className="flex h-screen bg-slate-100 items-center justify-center"><div className="text-center"><h2 className="text-2xl font-bold text-slate-800">HSE.Digital</h2><p className="text-slate-500">Initializing...</p><SkeletonLoader className="h-2 w-48 mx-auto mt-4" /></div></div>;
    }

    return (
        <ErrorBoundary>
            {isAuthenticated && currentUser ? (
                <DashboardApp 
                    currentUser={currentUser}
                    users={users}
                    organizations={organizations}
                    currentView={currentView as View}
                    setCurrentView={handleSetCurrentView}
                    onLogout={handleLogout}
                    onUserChange={handleUserChange}
                />
            ) : (
                <LoginPage 
                    onLogin={handleLogin}
                    onSsoLogin={handleSsoLogin}
                    isLoading={isLoadingUsers}
                    organizations={organizations}
                />
            )}
        </ErrorBoundary>
    );
};

export default App;
