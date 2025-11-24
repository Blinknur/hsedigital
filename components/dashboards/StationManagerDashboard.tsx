
import React, { useMemo } from 'react';
import {
    Audit,
    ChecklistSubmission,
    User,
    Station,
    CorrectiveActionStatus,
    Incident,
    UserRole,
    View,
    AuditStatus,
    FormDefinition
} from '../../types';
import Card from '../shared/Card';
import CapaItem from '../shared/CapaItem';
import { ICONS } from '../../constants';
import SkeletonLoader from '../shared/SkeletonLoader';
import EmptyState from '../shared/EmptyState';

interface DashboardProps {
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
    isLoading: boolean;
}

const KpiCard = ({ title, value, helpText }: { title: string; value: string | number; helpText: string; }) => (
    <Card className="text-center p-4 group relative">
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <p className="text-sm font-medium text-slate-500 mt-1">{title}</p>
        <div className="absolute top-2 right-2 p-2 text-xs text-white bg-slate-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {helpText}
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-slate-700 rotate-45"></div>
        </div>
    </Card>
);

const QuickActionButton = ({ icon, text, onClick }: { icon: React.ReactElement<any>; text: string; onClick: () => void }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center p-4 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors text-center w-full group h-full">
        <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-white border group-hover:border-emerald-200">
            {React.cloneElement(icon, { className: 'h-6 w-6 text-emerald-600' })}
        </div>
        <span className="text-sm font-semibold text-slate-700 mt-3">{text}</span>
    </button>
);

const StationManagerDashboard: React.FC<DashboardProps> = (props) => {
    const { currentUser, setCurrentView, isLoading, formDefinitions } = props;

    const assignedStation = useMemo(() => {
        const stationId = currentUser.assignedStationIds?.[0];
        return props.stations.find(s => s.id === stationId);
    }, [currentUser, props.stations]);

    const { stationAudits, stationSubmissions, stationIncidents } = useMemo(() => {
        if (!assignedStation) return { stationAudits: [], stationSubmissions: [], stationIncidents: [] };
        return {
            stationAudits: props.audits.filter(a => a.stationId === assignedStation.id),
            stationSubmissions: props.submissions.filter(s => s.stationId === assignedStation.id),
            stationIncidents: props.incidents.filter(i => i.stationId === assignedStation.id)
        };
    }, [assignedStation, props.audits, props.submissions, props.incidents]);

    const myOpenCapas = useMemo(() => {
        return stationAudits.flatMap(audit =>
            audit.findings
                .filter(f => f.correctiveAction && f.correctiveAction.assignedTo === currentUser.id && f.correctiveAction.status !== CorrectiveActionStatus.Approved)
                .map(finding => ({ audit, finding }))
        ).sort((a,b) => new Date(a.finding.correctiveAction!.dueDate).getTime() - new Date(b.finding.correctiveAction!.dueDate).getTime());
    }, [stationAudits, currentUser.id]);

    const upcomingAudit = useMemo(() => {
        const now = new Date();
        return stationAudits
            .filter(a => new Date(a.scheduledDate) >= now && a.status === AuditStatus.Scheduled)
            // FIX: Corrected the sort function by calling getTime() to return a number.
            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0];
    }, [stationAudits]);

    const getChecklistText = (audit: Audit, finding: any): string => {
        const form = formDefinitions.find(f => f.id === audit.formId);
        if (!form) return 'Unknown Item';
        const component = form.schema.components.find((c: any) => c.key === finding.itemId);
        return component?.label || 'Unknown Item';
    };

    if (!assignedStation) {
        return (
            <div className="p-8">
                <Card>
                    <EmptyState 
                        icon={ICONS.incident}
                        title="No Station Assigned"
                        message="You are not assigned to a station. Please contact your administrator."
                    />
                </Card>
            </div>
        );
    }
    
    // FIX: Added the missing JSX return statement to the component.
    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Station Dashboard: {assignedStation.name}</h1>
                <p className="text-slate-500 mt-1">Welcome back, {currentUser.name.split(' ')[0]}!</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                 {isLoading ? (<> <SkeletonLoader className="h-24" /> <SkeletonLoader className="h-24" /> <SkeletonLoader className="h-24" /> <SkeletonLoader className="h-24" /> </>) : (
                    <>
                        <KpiCard title="Open Tasks (CAPAs)" value={myOpenCapas.length} helpText="Corrective actions assigned to you that are not yet approved." />
                        <KpiCard title="Upcoming Audit" value={upcomingAudit ? new Date(upcomingAudit.scheduledDate).toLocaleDateString() : 'None'} helpText="Date of the next scheduled audit for your station." />
                        <KpiCard title="Open Incidents" value={stationIncidents.filter(i => i.status !== 'Closed').length} helpText="Incidents at your station that are not yet closed." />
                        <KpiCard title="Station Risk" value={assignedStation.riskCategory} helpText="The assigned risk category for your station." />
                    </>
                 )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card title="Your Action Items (Open CAPAs)">
                         {isLoading ? <SkeletonLoader className="h-64" /> : myOpenCapas.length > 0 ? (
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                {myOpenCapas.map(({ audit, finding }) => (
                                    <CapaItem key={finding.correctiveAction!.id} {...props} finding={finding} auditId={audit.id} checklistText={getChecklistText(audit, finding)} />
                                ))}
                            </div>
                        ) : (
                            <EmptyState icon={ICONS.audit} title="No Open Tasks" message="You have no pending corrective actions. Keep up the great work!" />
                        )}
                    </Card>
                </div>
                <div className="space-y-8">
                     <Card title="Quick Actions">
                        <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 h-full">
                           <QuickActionButton text="Submit Daily Checklist" icon={ICONS.checklist} onClick={() => setCurrentView('checklist')} />
                           <QuickActionButton text="Report an Incident" icon={ICONS.incident} onClick={() => setCurrentView('incident')} />
                        </div>
                    </Card>

                    <Card title="Recent Incidents">
                         {isLoading ? <SkeletonLoader className="h-40" /> : stationIncidents.length > 0 ? (
                             <div className="space-y-2">
                                {stationIncidents.slice(0, 3).map(incident => (
                                    <div key={incident.id} className="p-3 bg-slate-50 rounded-lg">
                                        <p className="font-semibold text-sm">{incident.type}</p>
                                        <p className="text-xs text-slate-600">{incident.description.substring(0, 50)}...</p>
                                    </div>
                                ))}
                            </div>
                         ) : (
                             <EmptyState icon={ICONS.incident} title="No Incidents" message="No incidents reported recently." />
                         )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

// FIX: Added the missing default export for the component.
export default StationManagerDashboard;
