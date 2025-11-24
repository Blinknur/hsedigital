
import React, { useState } from 'react';
import Sidebar from '../Sidebar';
import Header from '../shared/Header';
import Chatbot from '../AuditGuru';
import { ICONS } from '../../constants';
import { View, User, Organization, FormDefinition, Vector, Notification } from '../../types';

interface MainLayoutProps {
    children: React.ReactNode;
    currentView: View;
    setCurrentView: (view: View) => void;
    currentUser: User;
    onUserChange: (user: User) => void;
    users: User[];
    organizations: Organization[];
    viewingOrganizationId: string;
    setViewingOrganizationId: (orgId: string) => void;
    onLogout: () => void;
    notifications: Notification[];
    formDefinitions: FormDefinition[];
    vectorStore: Vector[];
}

const MainLayout: React.FC<MainLayoutProps> = (props) => {
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const toggleChatbot = () => setIsChatbotOpen(prev => !prev);
    
    return (
        <div className="flex h-screen bg-slate-100 font-sans">
            <Sidebar
                currentView={props.currentView}
                setCurrentView={props.setCurrentView}
                currentUser={props.currentUser}
                onUserChange={props.onUserChange}
                users={props.users}
                organizations={props.organizations}
                viewingOrganizationId={props.viewingOrganizationId}
                setViewingOrganizationId={props.setViewingOrganizationId}
                onLogout={props.onLogout}
            />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header 
                    currentView={props.currentView} 
                    currentUser={props.currentUser} 
                    notifications={props.notifications}
                    onNavigateToProfile={() => props.setCurrentView('settings')}
                />
                <main className="flex-1 overflow-y-auto">
                    {props.children}
                </main>
            </div>
            <button
                onClick={toggleChatbot}
                className="fixed bottom-6 right-8 bg-slate-800 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 z-40 print:hidden"
                aria-label="Open Audit Guru"
                title="Open Audit Guru"
            >
                {React.cloneElement(ICONS.owl, { className: "w-7 h-7 animate-pulse" })}
            </button>
            <Chatbot
                isOpen={isChatbotOpen}
                onClose={toggleChatbot}
                vectorStore={props.vectorStore}
            />
        </div>
    );
};

export default MainLayout;
