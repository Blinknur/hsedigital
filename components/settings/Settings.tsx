
import React, { useState, useMemo, useEffect } from 'react';
import { Station, User, UserRole, Vector, Organization, View, FormDefinition, ActivityLogEntry, Permission } from '../types';
import Card from './shared/Card';
import StationsSettings from './settings/StationsSettings';
import UsersSettings from './settings/UsersSettings';
import FormBuilderSettings from './settings/FormBuilderSettings';
import KnowledgeBaseSettings from './settings/KnowledgeBaseSettings';
import BillingSettings from './settings/BillingSettings';
import ActivityLog from './settings/ActivityLog';
import SecuritySettings from './settings/SecuritySettings';
import ProfileSettings from './settings/ProfileSettings';
import OrganizationSettings from './settings/OrganizationSettings';
import SystemDataSettings from './settings/SystemDataSettings'; // NEW
import { getUserPermissions } from '../auth/permissions';

interface SettingsProps {
    stations: Station[];
    users: User[];
    formDefinitions: FormDefinition[];
    currentUser: User;
    organization: Organization;
    activityLogs: ActivityLogEntry[];
    onUpdateStation: (station: Station) => void;
    onAddStation: (station: Omit<Station, 'id' | 'location' | 'organizationId'>) => void;
    onDeleteStation: (id: string) => void;
    onUpdateUser: (user: User) => void;
    onAddUser: (user: Omit<User, 'id' | 'organizationId'>) => void;
    onDeleteUser: (id: string) => void;
    onUpdateFormDefinition: (item: FormDefinition) => void;
    onAddFormDefinition: (item: Omit<FormDefinition, 'id' | 'organizationId'>) => void;
    onDeleteFormDefinition: (id: string) => void;
    onUpdateVectorStore: (vectorStore: Vector[]) => void;
    onUpdateOrganization: (organization: Organization) => void; 
    setCurrentView: (view: View) => void;
}

type SettingsTab = 'profile' | 'organization' | 'stations' | 'users' | 'formBuilder' | 'knowledgeBase' | 'billing' | 'security' | 'activityLog' | 'systemData';

const Settings: React.FC<SettingsProps> = (props) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    const tabs: { id: SettingsTab; label: string; permission?: Permission }[] = [
        { id: 'profile', label: 'My Profile' }, // No permission required
        { id: 'organization', label: 'Organization', permission: Permission.ManageSubscription }, // Admin usually
        { id: 'stations', label: 'Stations', permission: Permission.ViewStations },
        { id: 'users', label: 'Users & Roles', permission: Permission.ViewUsers },
        { id: 'formBuilder', label: 'Form Builder', permission: Permission.ViewForms },
        { id: 'billing', label: 'Billing', permission: Permission.ViewBilling },
        { id: 'security', label: 'Security', permission: Permission.ManageSecurity },
        { id: 'knowledgeBase', label: 'Knowledge Base', permission: Permission.ViewSettings },
        { id: 'activityLog', label: 'Activity Log', permission: Permission.ViewActivityLog },
        { id: 'systemData', label: 'System Data', permission: Permission.ManageSecurity }, // Only for Admins
    ];

    const userPermissions = useMemo(() => getUserPermissions(props.currentUser), [props.currentUser]);
    const availableTabs = useMemo(() => {
        return tabs.filter(tab => !tab.permission || userPermissions.includes(tab.permission));
    }, [userPermissions]);

    useEffect(() => {
        const isTabAvailable = availableTabs.some(t => t.id === activeTab);
        if (!isTabAvailable && availableTabs.length > 0) {
            setActiveTab(availableTabs[0].id);
        }
    }, [availableTabs, activeTab]);


    const renderActiveTab = () => {
        switch (activeTab) {
            case 'profile':
                return <ProfileSettings user={props.currentUser} onUpdateUser={props.onUpdateUser} />;
            case 'organization':
                return <OrganizationSettings organization={props.organization} onUpdateOrganization={props.onUpdateOrganization} />;
            case 'stations':
                return <StationsSettings 
                            stations={props.stations} 
                            onUpdate={props.onUpdateStation} 
                            onAdd={props.onAddStation} 
                            onDelete={props.onDeleteStation}
                            currentUser={props.currentUser}
                        />;
            case 'users':
                return <UsersSettings 
                            users={props.users}
                            stations={props.stations}
                            onUpdate={props.onUpdateUser}
                            onAdd={props.onAddUser}
                            onDelete={props.onDeleteUser}
                            currentUser={props.currentUser}
                        />;
            case 'formBuilder':
                return <FormBuilderSettings
                            formDefinitions={props.formDefinitions}
                            onUpdate={props.onUpdateFormDefinition}
                            onAdd={props.onAddFormDefinition}
                            onDelete={props.onDeleteFormDefinition}
                            currentUser={props.currentUser}
                        />;
            case 'knowledgeBase':
                 return <KnowledgeBaseSettings onUpdateVectorStore={props.onUpdateVectorStore} />;
            case 'billing':
                return <BillingSettings
                            organization={props.organization}
                            onUpdateOrganization={props.onUpdateOrganization}
                            users={props.users}
                            stations={props.stations}
                            onManageSubscription={() => alert('Redirecting to external payment portal... (Mock)')}
                       />;
            case 'security':
                return <SecuritySettings
                            organization={props.organization}
                            onUpdateOrganization={props.onUpdateOrganization}
                        />;
            case 'activityLog':
                return <ActivityLog logs={props.activityLogs} users={props.users} />;
            case 'systemData':
                return <SystemDataSettings />;
            default:
                return null;
        }
    }

    return (
        <div className="p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Settings</h1>
            <Card>
                <div className="border-b border-gray-200 overflow-x-auto">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        {availableTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${
                                    activeTab === tab.id
                                        ? 'border-emerald-500 text-emerald-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="py-6">
                    {renderActiveTab()}
                </div>
            </Card>
        </div>
    );
};

export default Settings;
