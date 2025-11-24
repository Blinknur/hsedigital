
import React, { useMemo, useState, useEffect } from 'react';
import {
    Audit,
    ChecklistSubmission,
    User,
    Station,
    CorrectiveActionStatus,
    Incident,
    UserRole,
    ChecklistStatus,
    IncidentStatus,
    View,
    AuditStatus,
    FormDefinition
} from '../../types';
import Card from '../shared/Card';
import CapaItem from '../shared/CapaItem';
import { ICONS } from '../../constants';
import StationRiskMapView from '../shared/StationRiskMapView';
import SkeletonLoader from '../shared/SkeletonLoader';
import EmptyState from '../shared/EmptyState';


interface UnifiedDashboardProps {
    audits: Audit[];
    submissions: ChecklistSubmission[];
    currentUser: User;
    stations: Station[];
    users: User[];
    formDefinitions: FormDefinition[];
    incidents: Incident[];
    onUpdateCapa: (auditId: string, findingItemId: string, newStatus: CorrectiveActionStatus, notes?: string) => void;
    onAddSubTask: (auditId: string, findingItemId: string, description: string) => void;
    onToggleSubTask: (auditId: string, findingItemId: string, subTaskId: string) => void;
    onAddComment: (auditId: string, findingItemId: string, text: string) => void; // NEW: Add comment handler
    setCurrentView: (view: View) => void;
    onStartAudit: (auditId: string) => void;
    onAcceptAudit: (auditId: string) => void;
    onDeclineAudit: (auditId: string, reason: string) => void;
    isLoading: boolean;
}

// --- Helper Components ---

// FIX: Changed icon type to React.ReactElement<any> to allow adding className prop.
const KpiCard = ({ title, value, icon, colorClass }: { title: string; value: string | number; icon: React.ReactElement<any>; colorClass: string; }) => {
    return (
        <Card className="flex items-center p-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${colorClass}`}>
                {React.cloneElement(icon, { className: 'w-6 h-6 text-white' })}
            </div>
            <div>
                <div className="text-2xl font-bold text-slate-800">{value}</div>
                <div className="text-sm font-medium text-slate-500">{title}</div>
            </div>
        </Card>
    );
};


const QuickActionButton = ({ icon, text, onClick }: { icon: React.ReactElement<any>; text: string; onClick: () => void }) => (
    <button onClick={onClick} className="flex items-center p-3 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors text-left w-full group">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-white border group-hover:border-emerald-200">
            {React.cloneElement(icon, { className: 'h-5 w-5 text-emerald-600' })}
        </div>
        <span className="text-sm font-semibold text-slate-700 ml-3">{text}</span>
    </button>
);


const GmDashboard: React.FC<UnifiedDashboardProps> = (props) => {
    const { currentUser, setCurrentView, onStartAudit, stations, users, onAcceptAudit, onDeclineAudit, isLoading, formDefinitions } = props;
    const [aiReport, setAiReport] = useState('');
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [capaFilter, setCapaFilter] = useState('All');
    const [decliningAuditId, setDecliningAuditId] = useState<string | null>(null);
    const [declineReason, setDeclineReason] = useState('');
    
    // --- Data Filtering based on User Role ---
    const { relevantStations, relevantAudits, relevantSubmissions, relevantIncidents } = useMemo(() => {
        const allStationsInOrg = props.stations;
        const allAuditsInOrg = props.audits;
        const allSubmissionsInOrg = props.submissions;
        const allIncidentsInOrg = props.incidents;

        switch (currentUser.role) {
            case UserRole.Admin:
                return { relevantStations: allStationsInOrg, relevantAudits: allAuditsInOrg, relevantSubmissions: allSubmissionsInOrg, relevantIncidents: allIncidentsInOrg };
            case UserRole.Auditor:
                const auditorStationIds = currentUser.assignedStationIds || [];
                const auditorStations = allStationsInOrg.filter(s => auditorStationIds.includes(s.id));
                return { relevantStations: auditorStations, relevantAudits: allAuditsInOrg.filter(a => auditorStationIds.includes(a.stationId)), relevantSubmissions: allSubmissionsInOrg.filter(s => auditorStationIds.includes(s.stationId)), relevantIncidents: allIncidentsInOrg.filter(i => auditorStationIds.includes(i.stationId)) };
            case UserRole.ComplianceManager:
                const regionStations = allStationsInOrg.filter(s => s.region === currentUser.region);
                const regionStationIds = regionStations.map(s => s.id);
                return { relevantStations: regionStations, relevantAudits: allAuditsInOrg.filter(a => regionStationIds.includes(a.stationId)), relevantSubmissions: allSubmissionsInOrg.filter(s => regionStationIds.includes(s.stationId)), relevantIncidents: allIncidentsInOrg.filter(i => regionStationIds.includes(i.stationId)) };
            case UserRole.StationManager:
                const managerStationIds = currentUser.assignedStationIds || [];
                const managerStations = allStationsInOrg.filter(s => managerStationIds.includes(s.id));
                return { relevantStations: managerStations, relevantAudits: allAuditsInOrg.filter(a => managerStationIds.includes(a.stationId)), relevantSubmissions: allSubmissionsInOrg.filter(s => managerStationIds.includes(s.stationId)), relevantIncidents: allIncidentsInOrg.filter(i => managerStationIds.includes(i.stationId)) };
            default:
                return { relevantStations: [], relevantAudits: [], relevantSubmissions: [], relevantIncidents: [] };
        }
    }, [currentUser, props.stations, props.audits, props.submissions, props.incidents]);

    
    // --- KPI Calculations ---
    const overallCompliance = useMemo(() => {
        let compliantCount = 0, totalCount = 0;
        relevantSubmissions.forEach(s => {
            Object.values(s.data).forEach(status => {
                if (status !== 'NA') {
                    totalCount++;
                    if (status === 'Compliant') {
                        compliantCount++;
                    }
                }
            });
        });
        return totalCount > 0 ? (compliantCount / totalCount) * 100 : 100;
    }, [relevantSubmissions]);

    const { escalatedCapas, openCapas } = useMemo(() => {
        const ESCALATION_THRESHOLD_DAYS = 7;
        const allOpenCapas = relevantAudits.flatMap(audit =>
            audit.findings
                .filter(f => f.correctiveAction && f.correctiveAction.status !== CorrectiveActionStatus.Approved && f.correctiveAction.status !== CorrectiveActionStatus.Reviewed)
                .map(finding => ({ audit, finding }))
        );
        
        const escalated = allOpenCapas.filter(({ finding }) => {
            const capa = finding.correctiveAction!;
            const isOverdue = new Date() > new Date(capa.dueDate);
            if (!isOverdue) return false;
            const daysOverdue = Math.floor((new Date().getTime() - new Date(capa.dueDate).getTime()) / (1000 * 60 * 60 * 24));
            return daysOverdue > ESCALATION_THRESHOLD_DAYS && (capa.status === CorrectiveActionStatus.Open || capa.status === CorrectiveActionStatus.InProgress);
        });

        const open = allOpenCapas.filter(({ finding }) => 
            !escalated.some(e => e.finding.correctiveAction!.id === finding.correctiveAction!.id)
        );

        return { 
            escalatedCapas: escalated.sort((a,b) => new Date(a.finding.correctiveAction!.dueDate).getTime() - new Date(b.finding.correctiveAction!.dueDate).getTime()),
            openCapas: open.sort((a,b) => new Date(a.finding.correctiveAction!.dueDate).getTime() - new Date(b.finding.correctiveAction!.dueDate).getTime()),
        };
    }, [relevantAudits]);
    
    const filteredOpenCapas = useMemo(() => {
        if (capaFilter === 'All') return openCapas;
        if (capaFilter === 'Pending Review') return openCapas.filter(c => c.finding.correctiveAction?.status === CorrectiveActionStatus.Completed);
        return openCapas.filter(c => c.finding.correctiveAction?.status === capaFilter);
    }, [openCapas, capaFilter]);

    const totalOpenCapasCount = escalatedCapas.length + openCapas.length;
    const openIncidents = relevantIncidents.filter(i => i.status !== IncidentStatus.Closed).length;
    
    const upcomingAudits = useMemo(() => {
        const now = new Date();
        return relevantAudits
            .filter(a => new Date(a.scheduledDate) >= now && (a.status === AuditStatus.Scheduled || a.status === AuditStatus.Approved))
            .sort((a,b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    }, [relevantAudits]);

    const getComplianceColor = (score: number): 'bg-emerald-500' | 'bg-amber-500' | 'bg-red-500' => {
        if (score >= 95) return 'bg-emerald-500';
        if (score >= 80) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const dashboardTitle = {
        [UserRole.Admin]: "Welcome to the Executive Dashboard",
        [UserRole.ComplianceManager]: `Area Dashboard: ${currentUser.region}`,
        [UserRole.StationManager]: `Station Dashboard`,
        [UserRole.Auditor]: "Welcome to your Auditor Dashboard"
    }[currentUser.role];


    const getChecklistText = (audit: Audit, finding: any): string => {
        const form = formDefinitions.find(f => f.id === audit.formId);
        if (!form || !form.schema || !form.schema.components) return 'Unknown Item';
        const component = form.schema.components.find((c: any) => c.key === finding.itemId);
        return component?.label || 'Unknown Item';
    };

    const isAuditor = currentUser.role === UserRole.Admin || currentUser.role === UserRole.ComplianceManager || currentUser.role === UserRole.Auditor;
    const isManager = currentUser.role === UserRole.Admin || currentUser.role === UserRole.ComplianceManager;

    return (
        <div className="p-6 lg:p-8 font-sans">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
                <p className="text-slate-500 mt-1">{dashboardTitle}</p>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {isLoading ? (<> <SkeletonLoader className="h-24" /> <SkeletonLoader className="h-24" /> <SkeletonLoader className="h-24" /> <SkeletonLoader className="h-24" /> </>) : (
                    <>
                        <KpiCard title="Compliance Score" value={`${overallCompliance.toFixed(1)}%`} colorClass={getComplianceColor(overallCompliance)} icon={ICONS.checklist} />
                        <KpiCard title="Open CAPAs" value={totalOpenCapasCount} colorClass={totalOpenCapasCount > 5 ? 'bg-red-500' : totalOpenCapasCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'} icon={ICONS.audit}/>
                        <KpiCard title="Open Incidents" value={openIncidents} colorClass={openIncidents > 2 ? 'bg-red-500' : openIncidents > 0 ? 'bg-amber-500' : 'bg-emerald-500'} icon={ICONS.incident}/>
                        <KpiCard title="Upcoming Audits" value={upcomingAudits.length} colorClass="bg-blue-500" icon={ICONS.planning}/>
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div className="lg:col-span-2 space-y-8">
                    {isAuditor && (
                        <Card title="Your Upcoming Audits">
                            {isLoading ? <SkeletonLoader className="h-40" /> : upcomingAudits.length > 0 ? (
                                <div className="space-y-3">
                                    {upcomingAudits.slice(0, 5).map(audit => {
                                        const station = stations.find(s => s.id === audit.stationId);
                                        const isPendingAcceptance = audit.status === AuditStatus.Approved && audit.auditorId === currentUser.id;
                                        return (
                                            <div key={audit.id} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100/80 transition-colors">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-semibold text-slate-800 flex items-center">{station?.name}
                                                            {isPendingAcceptance && <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-100 text-cyan-800">Pending Your Acceptance</span>}
                                                        </p>
                                                        <p className="text-sm text-slate-500">Scheduled for: {new Date(audit.scheduledDate).toLocaleDateString()}</p>
                                                    </div>
                                                    {isPendingAcceptance ? (
                                                        <div className="flex space-x-2">
                                                            <button onClick={() => onAcceptAudit(audit.id)} className="px-3 py-1 bg-green-600 text-white font-semibold rounded-lg text-xs hover:bg-green-700">Accept</button>
                                                            <button onClick={() => setDecliningAuditId(audit.id)} className="px-3 py-1 bg-red-600 text-white font-semibold rounded-lg text-xs hover:bg-red-700">Decline</button>
                                                        </div>
                                                    ) : (
                                                        audit.status === AuditStatus.Scheduled &&
                                                        <button onClick={() => onStartAudit(audit.id)} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700">
                                                            Start Audit
                                                        </button>
                                                    )}
                                                </div>
                                                 {decliningAuditId === audit.id && (
                                                    <div className="mt-3 pt-3 border-t">
                                                        <label className="text-xs font-bold text-slate-600">Reason for declining:</label>
                                                        <textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} className="w-full p-1 mt-1 border rounded-md text-sm" rows={2} placeholder="e.g., Scheduling conflict" />
                                                        <div className="flex justify-end space-x-2 mt-1">
                                                            <button onClick={() => setDecliningAuditId(null)} className="px-3 py-1 text-xs bg-slate-200 rounded-md">Cancel</button>
                                                            <button onClick={() => { if (!declineReason.trim()) { alert("Please provide a reason."); return; } onDeclineAudit(audit.id, declineReason); setDecliningAuditId(null); setDeclineReason(''); }} className="px-3 py-1 text-xs bg-red-600 text-white rounded-md">Submit Decline</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState icon={ICONS.planning} title="No Upcoming Audits" message="There are no audits scheduled for you in the near future." action={{ text: 'Go to Planning View', onClick: () => setCurrentView('planning') }} />
                            )}
                        </Card>
                    )}

                    <Card>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                            <h3 className="text-lg font-semibold text-slate-800">Live Task Board: Open CAPAs</h3>
                            {isManager && (
                                <div className="mt-2 sm:mt-0">
                                    <select value={capaFilter} onChange={(e) => setCapaFilter(e.target.value)} className="text-sm rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500">
                                        <option value="All">All Statuses</option>
                                        <option value="Open">Open</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Pending Review">Pending Review</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        {isLoading ? (<div className="space-y-4"> <SkeletonLoader className="h-28 w-full" /> <SkeletonLoader className="h-28 w-full" /> <SkeletonLoader className="h-28 w-full" /> </div>) : totalOpenCapasCount === 0 ? (
                            <EmptyState icon={ICONS.audit} title="No Open Tasks" message="All corrective actions are closed. Great work maintaining compliance!" />
                        ) : (
                            <>
                                {isManager && escalatedCapas.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="font-bold text-red-700 flex items-center mb-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.636-1.21 2.26-1.21 2.896 0l6.317 12.003c.665 1.263-.22 2.898-1.644 2.898H3.584c-1.424 0-2.309-1.635-1.644-2.898L8.257 3.099zM10 13a1 1 0 11-2 0 1 1 0 012 0zm-1-3a1 1 0 00-1 1v2a1 1 0 102 0v-2a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                            Escalated Actions ({escalatedCapas.length})
                                        </h4>
                                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2 -mr-2">
                                            {escalatedCapas.map(({ audit, finding }) => (
                                                <CapaItem key={finding.correctiveAction!.id} {...props} finding={finding} auditId={audit.id} checklistText={getChecklistText(audit, finding)} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {filteredOpenCapas.length > 0 ? (
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 -mr-2">
                                        {filteredOpenCapas.map(({ audit, finding }) => (
                                            <CapaItem key={finding.correctiveAction!.id} {...props} finding={finding} auditId={audit.id} checklistText={getChecklistText(audit, finding)} />
                                        ))}
                                    </div>
                                ) : capaFilter !== 'All' && (
                                    <p className="text-slate-500 p-4 text-center">No CAPAs match the current filter.</p>
                                )}
                            </>
                        )}
                    </Card>
                </div>
                
                <div className="space-y-8">
                     <Card title="Quick Actions">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                            <QuickActionButton text="New Checklist" icon={ICONS.checklist} onClick={() => setCurrentView('checklist')} />
                            <QuickActionButton text="New Incident" icon={ICONS.incident} onClick={() => setCurrentView('incident')} />
                            <QuickActionButton text="View Reports" icon={ICONS.reports} onClick={() => setCurrentView('analyticsStudio')} />
                             {currentUser.role !== UserRole.StationManager && <QuickActionButton text="Plan Audits" icon={ICONS.planning} onClick={() => setCurrentView('planning')} />}
                        </div>
                    </Card>

                    <Card title="Station Risk Overview">
                        {isLoading ? <SkeletonLoader className="h-56" /> : <StationRiskMapView stations={relevantStations} />}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default GmDashboard;
