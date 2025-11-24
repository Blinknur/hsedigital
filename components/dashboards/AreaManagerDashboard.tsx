
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
    FormDefinition
} from '../../types';
import Card from '../shared/Card';
import CapaItem from '../shared/CapaItem';
import { ICONS } from '../../constants';
import StationRiskMapView from '../shared/StationRiskMapView';
import SkeletonLoader from '../shared/SkeletonLoader';
import EmptyState from '../shared/EmptyState';
import Leaderboard from '../shared/Leaderboard';

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
    isLoading: boolean;
}

const KpiCard = ({ title, value, colorClass }: { title: string; value: string | number; colorClass: string; }) => (
    <Card className="text-center p-4">
        <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
        <p className="text-sm font-medium text-slate-500 mt-1">{title}</p>
    </Card>
);

const AreaManagerDashboard: React.FC<DashboardProps> = (props) => {
    const { currentUser, setCurrentView, isLoading, formDefinitions } = props;

    // --- Data Filtering for the Manager's Region ---
    const { relevantStations, relevantAudits, relevantSubmissions, relevantIncidents } = useMemo(() => {
        const isAuditor = currentUser.role === UserRole.Auditor;
        const relevantStationIds = isAuditor
            ? currentUser.assignedStationIds || []
            : props.stations.filter(s => s.region === currentUser.region).map(s => s.id);
        
        const stations = props.stations.filter(s => relevantStationIds.includes(s.id));
        const audits = props.audits.filter(a => relevantStationIds.includes(a.stationId));
        const submissions = props.submissions.filter(s => relevantStationIds.includes(s.stationId));
        const incidents = props.incidents.filter(i => relevantStationIds.includes(i.stationId));
        
        return { relevantStations: stations, relevantAudits: audits, relevantSubmissions: submissions, relevantIncidents: incidents };
    }, [currentUser, props.stations, props.audits, props.submissions, props.incidents]);


    // --- KPI Calculations ---
    const { escalatedCapas, openCapas } = useMemo(() => {
        const ESCALATION_THRESHOLD_DAYS = 7;
        const allOpenCapas = relevantAudits.flatMap(audit =>
            audit.findings
                .filter(f => f.correctiveAction && f.correctiveAction.status !== CorrectiveActionStatus.Approved)
                .map(finding => ({ audit, finding }))
        );
        
        const escalated = allOpenCapas.filter(({ finding }) => {
            const capa = finding.correctiveAction!;
            const isOverdue = new Date() > new Date(capa.dueDate);
            if (!isOverdue) return false;
            const daysOverdue = Math.floor((new Date().getTime() - new Date(capa.dueDate).getTime()) / (1000 * 60 * 60 * 24));
            return daysOverdue > ESCALATION_THRESHOLD_DAYS;
        }).sort((a,b) => new Date(a.finding.correctiveAction!.dueDate).getTime() - new Date(b.finding.correctiveAction!.dueDate).getTime());

        return { escalatedCapas: escalated, openCapas: allOpenCapas };
    }, [relevantAudits]);

    const kpis = useMemo(() => {
        let compliantCount = 0, totalCount = 0;
        relevantSubmissions.forEach(s => Object.values(s.data).forEach(status => {
            if (typeof status === 'string' && status !== 'NA') {
                totalCount++;
                if (status === 'Compliant') compliantCount++;
            }
        }));
        const compliance = totalCount > 0 ? (compliantCount / totalCount) * 100 : 0;

        return {
            compliance: compliance.toFixed(1),
            openCapas: openCapas.length,
            escalatedCapas: escalatedCapas.length,
            openIncidents: relevantIncidents.filter(i => i.status !== 'Closed').length
        };
    }, [relevantSubmissions, openCapas, escalatedCapas, relevantIncidents]);
    
    const getChecklistText = (audit: Audit, finding: any): string => {
        const form = formDefinitions.find(f => f.id === audit.formId);
        if (!form) return 'Unknown Item';
        const component = form.schema.components.find((c: any) => c.key === finding.itemId);
        return component?.label || 'Unknown Item';
    };

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Welcome, {currentUser.name.split(' ')[0]}!</h1>
                <p className="text-slate-500 mt-1">
                    {currentUser.role === UserRole.Auditor ? "Your Auditor Dashboard" : `Regional Dashboard: ${currentUser.region}`}
                </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {isLoading ? (<> <SkeletonLoader className="h-24" /> <SkeletonLoader className="h-24" /> <SkeletonLoader className="h-24" /> <SkeletonLoader className="h-24" /> </>) : (
                    <>
                        <KpiCard title="Avg Compliance" value={`${kpis.compliance}%`} colorClass="text-emerald-500" />
                        <KpiCard title="Open CAPAs" value={kpis.openCapas} colorClass="text-amber-500" />
                        <KpiCard title="Escalated CAPAs" value={kpis.escalatedCapas} colorClass="text-red-500" />
                        <KpiCard title="Open Incidents" value={kpis.openIncidents} colorClass="text-blue-500" />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card title="Escalated Corrective Actions">
                        {isLoading ? <SkeletonLoader className="h-64" /> : escalatedCapas.length > 0 ? (
                             <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                {escalatedCapas.map(({ audit, finding }) => (
                                    <CapaItem key={finding.correctiveAction!.id} {...props} finding={finding} auditId={audit.id} checklistText={getChecklistText(audit, finding)} />
                                ))}
                            </div>
                        ) : (
                            <EmptyState icon={ICONS.audit} title="No Escalated Actions" message="All high-priority corrective actions in your region are on track." />
                        )}
                    </Card>

                    <Card title="Recent Incidents">
                         {isLoading ? <SkeletonLoader className="h-40" /> : relevantIncidents.length > 0 ? (
                             <div className="space-y-2">
                                {relevantIncidents.slice(0, 5).map(incident => (
                                    <div key={incident.id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
                                        <div>
                                            {/* FIX: Use props.stations to find the station name, as `stations` is not in scope. */}
                                            <p className="font-semibold">{props.stations.find(s=>s.id === incident.stationId)?.name}</p>
                                            <p className="text-sm text-slate-600">{incident.type}: {incident.description.substring(0, 50)}...</p>
                                        </div>
                                        <button onClick={() => setCurrentView('incident')} className="btn btn-secondary !text-xs !py-1 !px-3">View</button>
                                    </div>
                                ))}
                            </div>
                         ) : (
                             <EmptyState icon={ICONS.incident} title="No Recent Incidents" message="No incidents have been reported in this region recently." />
                         )}
                    </Card>
                </div>

                <div className="space-y-8">
                    <Leaderboard title="Station Performance" stations={relevantStations} submissions={relevantSubmissions} />
                    <Card title="Regional Risk Map">
                        <StationRiskMapView stations={relevantStations} />
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AreaManagerDashboard;
