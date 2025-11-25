
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MainLayout from './layout/MainLayout';
import GmDashboard from './dashboards/GmDashboard';
import AreaManagerDashboard from './dashboards/AreaManagerDashboard';
import StationManagerDashboard from './dashboards/StationManagerDashboard';
import ContractorDashboard from './dashboards/ContractorDashboard';
import BIDashboard from './dashboards/BIDashboard';
import ChecklistForm from './ChecklistForm';
import IncidentDashboard from './IncidentDashboard';
import Planning from './Planning';
import PreAuditBriefing from './PreAuditBriefing';
import AuditExecution from './AuditExecution';
import ReportGenerator from './analytics/ReportGenerator';
import Settings from './Settings';
import PermitDashboard from './PermitDashboard';
import ActionCenter from './ActionCenter';
import UpgradePrompt from './shared/UpgradePrompt';
import { usePermissions } from '../hooks/usePermissions';
import {
    View,
    User,
    UserRole,
    Station,
    FormDefinition,
    ChecklistSubmission,
    Incident,
    Audit,
    IncidentStatus,
    IncidentType,
    AuditStatus,
    CorrectiveActionStatus,
    GeolocationCoordinates,
    Vector,
    Organization,
    PermitToWork,
    PermitStatus,
    Notification,
    NotificationType,
    Comment,
    ActivityLogEntry,
    ActivityType,
    Permission,
    SubTask
} from '../types';
import * as api from '../api/dataService';

interface DashboardAppProps {
    currentUser: User;
    users: User[];
    organizations: Organization[];
    currentView: View;
    setCurrentView: (view: View) => void;
    onLogout: () => void;
    onUserChange: (user: User) => void;
}

const DashboardApp: React.FC<DashboardAppProps> = ({ 
    currentUser, 
    users, 
    organizations, 
    currentView, 
    setCurrentView, 
    onLogout,
    onUserChange
}) => {
    const queryClient = useQueryClient();
    const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
    const [viewingOrganizationId, setViewingOrganizationId] = useState<string | null>(null);
    const [vectorStore, setVectorStore] = useState<Vector[]>([]);

    useEffect(() => {
        if (!viewingOrganizationId && currentUser) {
             setViewingOrganizationId(
                 currentUser.role === UserRole.Admin && !currentUser.organizationId && organizations.length > 0
                 ? organizations[0].id 
                 : (currentUser.organizationId || null)
             );
        }
    }, [currentUser, organizations, viewingOrganizationId]);

    const { data: stations = [], isLoading: isLoadingStations } = useQuery({ queryKey: ['stations'], queryFn: api.fetchStations });
    const { data: formDefinitions = [], isLoading: isLoadingFormDefinitions } = useQuery({ queryKey: ['formDefinitions'], queryFn: api.fetchFormDefinitions });
    const { data: submissions = [], isLoading: isLoadingSubmissions } = useQuery({ queryKey: ['submissions'], queryFn: api.fetchSubmissions });
    const { data: incidents = [], isLoading: isLoadingIncidents } = useQuery({ queryKey: ['incidents'], queryFn: api.fetchIncidents });
    const { data: audits = [], isLoading: isLoadingAudits } = useQuery({ queryKey: ['audits'], queryFn: api.fetchAudits });
    const { data: permits = [], isLoading: isLoadingPermits } = useQuery({ queryKey: ['permits'], queryFn: api.fetchPermits });
    const { data: contractors = [], isLoading: isLoadingContractors } = useQuery({ queryKey: ['contractors'], queryFn: api.fetchContractors });
    const { data: vectors = [] } = useQuery({ queryKey: ['vectors'], queryFn: api.fetchVectors, initialData: [] });
    
    useEffect(() => setVectorStore(vectors), [vectors]);

    const canViewAnalytics = usePermissions(currentUser, Permission.ViewAnalytics);
    const canViewBIDashboard = usePermissions(currentUser, Permission.ViewBIDashboard);
    const isLoadingData = isLoadingStations || isLoadingFormDefinitions || isLoadingSubmissions || isLoadingIncidents || isLoadingAudits || isLoadingPermits || isLoadingContractors;

    const currentOrgData = useMemo(() => {
        if (!viewingOrganizationId) return { stations: [], audits: [], submissions: [], incidents: [], formDefinitions: [], users: [], permits: [], organization: null, contractors: [] };
        const orgId = viewingOrganizationId;
        
        const orgPermits = permits.filter(p => p.organizationId === orgId);
        const visiblePermits = (currentUser.role === UserRole.Contractor && currentUser.contractorId)
            ? orgPermits.filter(p => p.contractorId === currentUser.contractorId)
            : orgPermits;

        const orgContractors = Array.isArray(contractors) ? contractors.filter(c => c.organizationId === orgId) : [];

        return {
            stations: stations.filter(s => s.organizationId === orgId),
            audits: audits.filter(a => a.organizationId === orgId),
            submissions: submissions.filter(s => s.organizationId === orgId),
            incidents: incidents.filter(i => i.organizationId === orgId),
            formDefinitions: formDefinitions.filter(c => c.organizationId === orgId),
            users: users.filter(u => u.organizationId === orgId),
            permits: visiblePermits,
            organization: organizations.find(o => o.id === orgId),
            contractors: orgContractors,
        };
    }, [viewingOrganizationId, stations, audits, submissions, incidents, formDefinitions, users, organizations, permits, activityLogs, contractors, currentUser]);

    const currentUserOrganization = useMemo(() => organizations.find(o => o.id === currentUser?.organizationId), [currentUser, organizations]);

    // --- Mutations Wrappers ---
    
    const logActivityMutation = useMutation({
        mutationFn: async (logEntry: Omit<ActivityLogEntry, 'id' | 'timestamp' | 'organizationId'>) => {
            const newLog: ActivityLogEntry = {
                id: `log-${Date.now()}`,
                organizationId: viewingOrganizationId!,
                timestamp: new Date(),
                ...logEntry
            };
            return api.createLog(newLog);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activityLogs'] })
    });

    const updateAuditMutation = useMutation({ mutationFn: api.updateAudit, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['audits'] }) });
    const updatePermitMutation = useMutation({ mutationFn: api.updatePermit, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['permits'] }) });
    const updateIncidentMutation = useMutation({ mutationFn: api.updateIncident, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents'] }) });
    const createStationMutation = useMutation({ mutationFn: api.createStation, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stations'] }) });
    const updateStationMutation = useMutation({ mutationFn: api.updateStation, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stations'] }) });
    const deleteStationMutation = useMutation({ mutationFn: api.deleteStation, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stations'] }) });
    const createUserMutation = useMutation({ mutationFn: api.createUser, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }) });
    const updateUserMutation = useMutation({ mutationFn: api.updateUser, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }) });
    const deleteUserMutation = useMutation({ mutationFn: api.deleteUser, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }) });
    const createFormMutation = useMutation({ mutationFn: api.createForm, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['formDefinitions'] }) });
    const updateFormMutation = useMutation({ mutationFn: api.updateForm, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['formDefinitions'] }) });
    const deleteFormMutation = useMutation({ mutationFn: api.deleteForm, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['formDefinitions'] }) });
    const createAuditMutation = useMutation({ mutationFn: api.createAudit, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['audits'] }) });
    const deleteAuditMutation = useMutation({ mutationFn: api.deleteAudit, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['audits'] }) });
    const createPermitMutation = useMutation({ mutationFn: api.createPermit, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['permits'] }) });
    const createIncidentMutation = useMutation({ mutationFn: api.createIncident, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents'] }) });
    const createSubmissionMutation = useMutation({ mutationFn: api.createSubmission, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['submissions'] }) });
    const updateOrganizationMutation = useMutation({ mutationFn: api.updateOrganization, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }) });
    const updateVectorsMutation = useMutation({ mutationFn: api.updateVectors, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vectors'] }) });


    // --- Event Handlers ---

    const handleChecklistSubmit = (submission: Omit<ChecklistSubmission, 'id' | 'organizationId' | 'submittedAt' | 'submittedBy'>) => {
        const newSubmission: ChecklistSubmission = { id: `sub-${Date.now()}`, organizationId: viewingOrganizationId!, ...submission, submittedAt: new Date(), submittedBy: currentUser.id };
        createSubmissionMutation.mutate(newSubmission);
        setCurrentView('dashboard');
    };

    const handleIncidentSubmit = (incident: { stationId: string; type: IncidentType; description: string; photoUrls: string[]; geolocation?: GeolocationCoordinates; }) => {
        const newIncident: Incident = { id: `inc-${Date.now()}`, organizationId: viewingOrganizationId!, ...incident, timestamp: new Date(), reportedBy: currentUser.id, status: IncidentStatus.Open, comments: [] };
        createIncidentMutation.mutate(newIncident);
        logActivityMutation.mutate({ userId: currentUser.id, actionType: ActivityType.IncidentCreated, entityType: 'incident', entityId: newIncident.id, details: `New ${incident.type} incident reported for station ${stations.find(s=>s.id === incident.stationId)?.name}.` });
    };
    
    const handleUpdateIncident = (updatedIncident: Incident) => {
        const originalIncident = incidents.find(i => i.id === updatedIncident.id);
        if(originalIncident?.status !== updatedIncident.status) {
            logActivityMutation.mutate({ userId: currentUser.id, actionType: ActivityType.IncidentStatusChanged, entityType: 'incident', entityId: updatedIncident.id, details: `Incident status changed to ${updatedIncident.status}.` });
        }
        updateIncidentMutation.mutate(updatedIncident);
    };

    const handleAddCommentToIncident = (incidentId: string, text: string) => {
        const incident = incidents.find(i => i.id === incidentId);
        if(!incident || !currentUser) return;
        const newComment: Comment = { id: `comment-${Date.now()}`, userId: currentUser.id, timestamp: new Date(), text };
        const updatedIncident = {...incident, comments: [...(incident.comments || []), newComment]};
        updateIncidentMutation.mutate(updatedIncident);
    };

    const handleUpdateCapa = (auditId: string, findingItemId: string, newStatus: CorrectiveActionStatus, notes?: string) => {
        const audit = audits.find(a => a.id === auditId);
        if (!audit) return;
        const finding = audit.findings.find(f => f.itemId === findingItemId);
        if(!finding?.correctiveAction) return;

        const updatedFindings = audit.findings.map(f => {
            if (f.itemId !== findingItemId || !f.correctiveAction) return f;
            const newHistory = { status: newStatus, userId: currentUser.id, timestamp: new Date(), notes };
            const updatedCapa = { ...f.correctiveAction, status: newStatus, completionNotes: newStatus === CorrectiveActionStatus.Completed ? notes : f.correctiveAction.completionNotes, history: [...f.correctiveAction.history, newHistory] };
            return { ...f, correctiveAction: updatedCapa };
        });
        const allApproved = updatedFindings.every(f => !f.correctiveAction || f.correctiveAction.status === CorrectiveActionStatus.Approved);
        const newStatus_ = audit.status === AuditStatus.Completed && allApproved ? AuditStatus.Closed : audit.status;
        updateAuditMutation.mutate({ ...audit, findings: updatedFindings, status: newStatus_ });
        logActivityMutation.mutate({ userId: currentUser.id, actionType: ActivityType.CapaStatusChanged, entityType: 'capa', entityId: finding.correctiveAction.id, details: `CAPA status changed to ${newStatus} on Audit ${audit.auditNumber}.` });
    };

    const handleAddCommentToCapa = (auditId: string, findingItemId: string, text: string) => {
        const audit = audits.find(a => a.id === auditId);
        if (!audit || !currentUser) return;
        const updatedFindings = audit.findings.map(f => {
            if (f.itemId !== findingItemId || !f.correctiveAction) return f;
            const newComment: Comment = { id: `comment-${Date.now()}`, userId: currentUser.id, timestamp: new Date(), text };
            const updatedCapa = { ...f.correctiveAction, comments: [...(f.correctiveAction.comments || []), newComment] };
            return { ...f, correctiveAction: updatedCapa };
        });
        updateAuditMutation.mutate({ ...audit, findings: updatedFindings });
    };

     const handleAddSubTask = (auditId: string, findingItemId: string, description: string) => {
        const audit = audits.find(a => a.id === auditId);
        if (!audit || !currentUser) return;
        const updatedFindings = audit.findings.map(f => {
            if (f.itemId !== findingItemId || !f.correctiveAction) return f;
            const newSubTask: SubTask = { id: `sub-${Date.now()}`, description, completed: false };
            const updatedCapa = { ...f.correctiveAction, subTasks: [...(f.correctiveAction.subTasks || []), newSubTask] };
            return { ...f, correctiveAction: updatedCapa };
        });
        updateAuditMutation.mutate({ ...audit, findings: updatedFindings });
    };

    const handleToggleSubTask = (auditId: string, findingItemId: string, subTaskId: string) => {
        const audit = audits.find(a => a.id === auditId);
        if (!audit) return;
        const updatedFindings = audit.findings.map(f => {
            if (f.itemId !== findingItemId || !f.correctiveAction) return f;
             const updatedSubTasks = f.correctiveAction.subTasks?.map(t => t.id === subTaskId ? { ...t, completed: !t.completed } : t);
            const updatedCapa = { ...f.correctiveAction, subTasks: updatedSubTasks };
            return { ...f, correctiveAction: updatedCapa };
        });
        updateAuditMutation.mutate({ ...audit, findings: updatedFindings });
    }

    const handleScheduleAudit = (data: { stationId: string; auditorId: string; scheduledDate: Date, formId: string }) => {
        const newAudit: Audit = { id: `audit-${Date.now()}`, organizationId: viewingOrganizationId!, auditNumber: `AUD-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`, ...data, status: AuditStatus.PendingApproval, findings: [], overallScore: 0 };
        createAuditMutation.mutate(newAudit);
        logActivityMutation.mutate({ userId: currentUser.id, actionType: ActivityType.AuditScheduled, entityType: 'audit', entityId: newAudit.id, details: `Audit scheduled for ${stations.find(s=>s.id === data.stationId)?.name} on ${data.scheduledDate.toLocaleDateString()}.` });
    };

    const handleCreatePermit = (data: Omit<PermitToWork, 'id' | 'organizationId' | 'permitNumber' | 'status' | 'history' | 'requestedBy'>) => {
        const newPermit: PermitToWork = { ...data, id: `ptw-${Date.now()}`, organizationId: viewingOrganizationId!, permitNumber: `PTW-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`, requestedBy: currentUser.id, status: PermitStatus.PendingApproval, history: [{ status: PermitStatus.PendingApproval, userId: currentUser.id, timestamp: new Date(), notes: 'Permit requested.' }] };
        createPermitMutation.mutate(newPermit);
    };
    
    const handleUpdatePermitStatus = (permitId: string, newStatus: PermitStatus, notes?: string) => {
        const permit = permits.find(p => p.id === permitId);
        if (!permit) return;
        const newHistory = { status: newStatus, userId: currentUser.id, timestamp: new Date(), notes };
        const updatedPermit = { ...permit, status: newStatus, history: [...permit.history, newHistory], approvedBy: newStatus === PermitStatus.Approved ? currentUser.id : permit.approvedBy, closedBy: newStatus === PermitStatus.Closed ? currentUser.id : permit.closedBy, rejectionReason: newStatus === PermitStatus.Rejected ? notes : permit.rejectionReason, closeOutNotes: newStatus === PermitStatus.Closed ? notes : permit.closeOutNotes };
        updatePermitMutation.mutate(updatedPermit);
        logActivityMutation.mutate({ userId: currentUser.id, actionType: ActivityType.PermitStatusChanged, entityType: 'permit', entityId: permit.id, details: `Permit ${permit.permitNumber} status changed to ${newStatus}.` });
    };

    const handleUpdateAudit = (updatedAudit: Audit) => {
        const originalAudit = audits.find(a => a.id === updatedAudit.id);
        if(originalAudit?.status !== updatedAudit.status) {
            logActivityMutation.mutate({ userId: currentUser.id, actionType: ActivityType.AuditStatusChanged, entityType: 'audit', entityId: updatedAudit.id, details: `Audit ${updatedAudit.auditNumber} status changed to ${updatedAudit.status}.` });
        }
        updateAuditMutation.mutate(updatedAudit);
    }

    const handleDeleteAudit = (id: string) => deleteAuditMutation.mutate(id);
    const handleApproveAudit = (id: string) => handleUpdateAudit({ ...audits.find(a=>a.id===id)!, status: AuditStatus.Approved });
    const handleAcceptAudit = (id: string) => handleUpdateAudit({ ...audits.find(a=>a.id===id)!, status: AuditStatus.Scheduled });
    const handleDeclineAudit = (id: string, reason: string) => handleUpdateAudit({ ...audits.find(a=>a.id===id)!, status: AuditStatus.Declined, declineReason: reason });
    const handleStartAudit = (id: string) => { setActiveAuditId(id); setCurrentView('preAuditBriefing'); };
    const handleExecuteAudit = (id: string) => {
        const audit = audits.find(a => a.id === id);
        if (audit?.status === AuditStatus.Scheduled) handleUpdateAudit({ ...audit, status: AuditStatus.InProgress });
        setActiveAuditId(id); setCurrentView('auditExecution');
    };
    const handleCompleteAudit = (completedAudit: Audit) => { handleUpdateAudit(completedAudit); setActiveAuditId(null); setCurrentView('dashboard'); };
    
    // Organization Management Wrappers
    const handleAddStation = (station: Omit<Station, 'id' | 'location' | 'organizationId'>) => createStationMutation.mutate({ ...station, organizationId: viewingOrganizationId!, location: { lat: 0, lon: 0 } });
    const handleUpdateStation = (s: Station) => updateStationMutation.mutate(s);
    const handleDeleteStation = (id: string) => deleteStationMutation.mutate(id);
    
    const handleAddUser = (user: Omit<User, 'id' | 'organizationId'>) => createUserMutation.mutate({ ...user, organizationId: viewingOrganizationId! });
    const handleUpdateUser = (u: User) => updateUserMutation.mutate(u);
    const handleDeleteUser = (id: string) => deleteUserMutation.mutate(id);
    
    const handleAddForm = (form: Omit<FormDefinition, 'id' | 'organizationId'>) => createFormMutation.mutate({ ...form, organizationId: viewingOrganizationId! });
    const handleUpdateForm = (form: FormDefinition) => updateFormMutation.mutate(form);
    const handleDeleteForm = (id: string) => deleteFormMutation.mutate(id);
    
    const handleUpdateOrganization = (org: Organization) => {
        updateOrganizationMutation.mutate(org);
        // Log activity if critical fields changed
        const originalOrg = organizations.find(o => o.id === org.id);
        if (originalOrg?.subscriptionPlan !== org.subscriptionPlan) {
            logActivityMutation.mutate({
                userId: currentUser.id,
                actionType: ActivityType.SubscriptionChanged,
                entityType: 'organization',
                entityId: org.id,
                details: `Subscription changed from ${originalOrg?.subscriptionPlan} to ${org.subscriptionPlan}.`
            });
        }
    };

    const handleUpdateVectorStore = (vectors: Vector[]) => {
        updateVectorsMutation.mutate(vectors);
        setVectorStore(vectors);
    }
    
    // Notifications logic
    const notifications: Notification[] = useMemo(() => {
        if (!currentUser) return [];
        const userNotifications: Notification[] = [];
        const now = new Date();
        audits.forEach(audit => {
            audit.findings.forEach(finding => {
                if (finding.correctiveAction) {
                    const capa = finding.correctiveAction;
                    if (capa.assignedTo === currentUser.id && new Date(capa.dueDate) < now && capa.status === CorrectiveActionStatus.Open) {
                        userNotifications.push({ id: `noti-capa-overdue-${capa.id}`, type: NotificationType.CapaOverdue, title: 'Overdue Task', description: `CAPA: ${capa.description.substring(0,30)}... is overdue.`, timestamp: new Date(capa.dueDate), isRead: false, link: `/#/dashboard`, userId: currentUser.id });
                    }
                    if (audit.auditorId === currentUser.id && capa.status === CorrectiveActionStatus.Completed) {
                         userNotifications.push({ id: `noti-capa-review-${capa.id}`, type: NotificationType.CapaReview, title: 'CAPA for Review', description: `Action for "${capa.description.substring(0,30)}..." is complete.`, timestamp: capa.history.find(h=>h.status === CorrectiveActionStatus.Completed)?.timestamp || now, isRead: false, link: `/#/dashboard`, userId: currentUser.id });
                    }
                }
            });
        });
        return userNotifications.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [audits, currentUser]);

    const dashboardProps = { 
        audits: currentOrgData.audits, 
        submissions: currentOrgData.submissions, 
        incidents: currentOrgData.incidents, 
        stations: currentOrgData.stations, 
        formDefinitions: currentOrgData.formDefinitions, 
        users: users, 
        currentUser: currentUser, 
        onUpdateCapa: handleUpdateCapa, 
        onAddSubTask: handleAddSubTask, 
        onToggleSubTask: handleToggleSubTask, 
        onAddComment: handleAddCommentToCapa, 
        setCurrentView: setCurrentView, 
        onStartAudit: handleStartAudit, 
        onAcceptAudit: handleAcceptAudit, 
        onDeclineAudit: handleDeclineAudit, 
        isLoading: isLoadingData 
    };
    const isFreePlan = currentUserOrganization?.subscriptionPlan === 'free';
    
    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                switch (currentUser.role) {
                    case UserRole.StationManager: return <StationManagerDashboard {...dashboardProps} />;
                    case UserRole.ComplianceManager:
                    case UserRole.Auditor: return <AreaManagerDashboard {...dashboardProps} />;
                    case UserRole.Contractor: return <ContractorDashboard currentUser={currentUser} stations={currentOrgData.stations} permits={currentOrgData.permits} contractors={currentOrgData.contractors} setCurrentView={setCurrentView} isLoading={isLoadingData} />;
                    case UserRole.Admin: default: return <GmDashboard {...dashboardProps} />;
                }
            case 'checklist': return <ChecklistForm formDefinitions={currentOrgData.formDefinitions} stations={currentOrgData.stations} currentUser={currentUser} onSubmit={handleChecklistSubmit} />;
            case 'incident': return <IncidentDashboard incidents={currentOrgData.incidents} stations={currentOrgData.stations} users={users} currentUser={currentUser} onSubmit={handleIncidentSubmit} onUpdate={handleUpdateIncident} onAddComment={handleAddCommentToIncident} isLoading={isLoadingIncidents} />;
            case 'planning': return <Planning audits={currentOrgData.audits} stations={currentOrgData.stations} users={users} formDefinitions={currentOrgData.formDefinitions} currentUser={currentUser} onScheduleAudit={handleScheduleAudit} onUpdateAudit={handleUpdateAudit} onDeleteAudit={handleDeleteAudit} onStartAudit={handleStartAudit} onApproveAudit={handleApproveAudit} onRejectAudit={handleDeclineAudit} isLoading={isLoadingAudits} />;
            case 'preAuditBriefing': { const a = audits.find(a => a.id === activeAuditId); if (!a) return <div>Error: Active audit not found.</div>; return <PreAuditBriefing audit={a} allAudits={audits} stations={stations} formDefinitions={formDefinitions} onBeginAudit={handleExecuteAudit} onBack={() => setCurrentView('planning')} />; }
            case 'auditExecution': { const a = audits.find(a => a.id === activeAuditId); if (!a) return <div>Error: Active audit not found.</div>; return <AuditExecution audit={a} formDefinitions={formDefinitions} stations={stations} users={users} onCompleteAudit={handleCompleteAudit} onCancel={() => {setActiveAuditId(null); setCurrentView('planning')}} />; }
            case 'reports': return <ReportGenerator audits={currentOrgData.audits} submissions={currentOrgData.submissions} incidents={currentOrgData.incidents} stations={currentOrgData.stations} users={users} formDefinitions={currentOrgData.formDefinitions} currentUser={currentUser} />;
            case 'analyticsStudio': 
                if (!canViewAnalytics) return <GmDashboard {...dashboardProps} />;
                if (isFreePlan) return <UpgradePrompt featureName="Analytics Studio" setCurrentView={setCurrentView} />;
                return <ReportGenerator audits={currentOrgData.audits} submissions={currentOrgData.submissions} incidents={currentOrgData.incidents} stations={currentOrgData.stations} users={users} formDefinitions={currentOrgData.formDefinitions} currentUser={currentUser} />;
            case 'settings': return <Settings currentUser={currentUser} onUpdateVectorStore={handleUpdateVectorStore} stations={currentOrgData.stations} onAddStation={handleAddStation} onUpdateStation={handleUpdateStation} onDeleteStation={handleDeleteStation} users={currentOrgData.users} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} formDefinitions={currentOrgData.formDefinitions} onAddFormDefinition={handleAddForm} onUpdateFormDefinition={handleUpdateForm} onDeleteFormDefinition={handleDeleteForm} organization={currentOrgData.organization!} onUpdateOrganization={handleUpdateOrganization} setCurrentView={setCurrentView} />;
            case 'permit': return <PermitDashboard permits={currentOrgData.permits} stations={currentOrgData.stations} users={users} contractors={currentOrgData.contractors} currentUser={currentUser} onCreatePermit={handleCreatePermit} onUpdatePermitStatus={handleUpdatePermitStatus} isLoading={isLoadingPermits} />;
            case 'biDashboard':
                if (!canViewBIDashboard) return <GmDashboard {...dashboardProps} />;
                if (isFreePlan) return <UpgradePrompt featureName="BI Dashboard" setCurrentView={setCurrentView} />;
                return <BIDashboard audits={currentOrgData.audits} submissions={currentOrgData.submissions} incidents={currentOrgData.incidents} stations={currentOrgData.stations} users={users} />;
            case 'actionCenter': return <ActionCenter notifications={notifications} currentUser={currentUser} setCurrentView={setCurrentView} />;
            default: return <GmDashboard {...dashboardProps} />;
        }
    };

    if (isLoadingData && !stations.length) {
         return <div className="flex h-screen bg-slate-100 items-center justify-center"><div className="text-center"><h2 className="text-2xl font-bold text-slate-800">HSE.Digital</h2><p className="text-slate-500">Loading your dashboard...</p></div></div>;
    }

    return (
        <MainLayout 
            currentView={currentView} 
            setCurrentView={setCurrentView} 
            currentUser={currentUser} 
            onUserChange={onUserChange}
            users={users} 
            organizations={organizations} 
            viewingOrganizationId={viewingOrganizationId!} 
            setViewingOrganizationId={setViewingOrganizationId} 
            onLogout={onLogout} 
            notifications={notifications} 
            formDefinitions={currentOrgData.formDefinitions} 
            vectorStore={vectorStore}
        >
            {renderView()}
        </MainLayout>
    );
}

export default DashboardApp;
