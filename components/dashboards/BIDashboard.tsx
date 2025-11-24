
import React, { useState, useMemo } from 'react';
import { Audit, ChecklistSubmission, Station, User, Incident, CorrectiveActionStatus, ChecklistStatus, IncidentType } from '../../types';
import Card from '../shared/Card';
import ComplianceTrendChart from '../charts/ComplianceTrendChart';
import CapaStatusChart from '../charts/CapaStatusChart';
import RegionalComplianceComparisonChart from '../charts/RegionalComplianceComparisonChart';
import IncidentTypeDistributionChart from '../charts/IncidentTypeDistributionChart';
import SkeletonLoader from '../shared/SkeletonLoader';
import { ICONS } from '../../constants';
import { generateBiReport } from '../../services/geminiService';

interface BIDashboardProps {
    audits: Audit[];
    submissions: ChecklistSubmission[];
    stations: Station[];
    users: User[];
    incidents: Incident[];
}

const KpiCard = ({ title, value, icon, helpText }: { title: string; value: string | number; icon: React.ReactElement<any>; helpText: string; }) => (
    <Card className="flex items-start p-4 group relative">
        <div className="p-3 rounded-lg bg-slate-100 mr-4">
            {React.cloneElement(icon, { className: 'h-6 w-6 text-slate-600' })}
        </div>
        <div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-sm font-medium text-slate-500">{title}</p>
        </div>
        <div className="absolute top-2 right-2 p-2 text-xs text-white bg-slate-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {helpText}
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-slate-700 rotate-45"></div>
        </div>
    </Card>
);


const BIDashboard: React.FC<BIDashboardProps> = ({ audits, submissions, stations, users, incidents }) => {
    const [regionFilter, setRegionFilter] = useState('');
    const [stationFilter, setStationFilter] = useState('');
    const [aiInsights, setAiInsights] = useState('');
    const [isLoadingAi, setIsLoadingAi] = useState(false);

    const uniqueRegions = useMemo(() => Array.from(new Set(stations.map(s => s.region))), [stations]);

    const filteredData = useMemo(() => {
        let filteredStations = stations;
        if (regionFilter) {
            filteredStations = filteredStations.filter(s => s.region === regionFilter);
        }
        if (stationFilter) {
            filteredStations = filteredStations.filter(s => s.id === stationFilter);
        }
        const stationIds = filteredStations.map(s => s.id);
        
        return {
            stations: filteredStations,
            audits: audits.filter(a => stationIds.includes(a.stationId)),
            submissions: submissions.filter(s => stationIds.includes(s.stationId)),
            incidents: incidents.filter(i => stationIds.includes(i.stationId)),
        };
    }, [regionFilter, stationFilter, audits, submissions, stations, incidents]);

    const kpis = useMemo(() => {
        let compliant = 0, total = 0;
        // FIX: Property 'items' does not exist on type 'ChecklistSubmission'. Use 'data' instead.
        filteredData.submissions.forEach(s => Object.values(s.data).forEach(status => {
            if (typeof status === 'string' && status !== ChecklistStatus.NA) {
                total++;
                if (status === ChecklistStatus.Compliant) compliant++;
            }
        }));
        const complianceScore = total > 0 ? (compliant / total) * 100 : 100;

        // FIX: Replaced chained .map() with a nested .map() inside .flatMap() to correctly capture the parent 'audit' for each finding.
        const capas = filteredData.audits.flatMap(audit =>
            audit.findings
                .filter(finding => finding.correctiveAction)
                .map(finding => ({
                    capa: finding.correctiveAction!,
                    audit: audit
                }))
        );
        
        const openCapas = capas.filter(c => c.capa.status !== CorrectiveActionStatus.Approved).length;

        // FIX: The `CorrectiveActionStatus` enum does not have a 'Closed' member. A CAPA is considered closed when it reaches the 'Approved' state.
        const closedCapas = capas.filter(c => c.capa.status === CorrectiveActionStatus.Approved);
        let totalClosureDays = 0;
        closedCapas.forEach(({ capa, audit }) => {
            const completionEntry = capa.history.find(h => h.status === CorrectiveActionStatus.Completed || h.status === CorrectiveActionStatus.Approved);
            if (completionEntry) {
                const creationDate = new Date(audit.completionDate || audit.scheduledDate);
                const completionDate = new Date(completionEntry.timestamp);
                totalClosureDays += (completionDate.getTime() - creationDate.getTime()) / (1000 * 3600 * 24);
            }
        });
        const avgCapaClosureDays = closedCapas.length > 0 ? (totalClosureDays / closedCapas.length).toFixed(1) : 'N/A';
        
        const incidentRate = filteredData.incidents.length;

        return {
            complianceScore: `${complianceScore.toFixed(1)}%`,
            openCapas,
            avgCapaClosureDays: avgCapaClosureDays,
            incidentRate: `${incidentRate} total`,
        };
    }, [filteredData]);

    const handleGenerateInsights = async () => {
        setIsLoadingAi(true);
        setAiInsights('');

        const reportData = {
            kpis,
            regionalCompliance: uniqueRegions.map(region => {
                const regionStationIds = stations.filter(s => s.region === region).map(s => s.id);
                const regionSubmissions = submissions.filter(s => regionStationIds.includes(s.stationId));
                let compliant = 0, total = 0;
                // FIX: Property 'items' does not exist on type 'ChecklistSubmission'. Use 'data' instead.
                regionSubmissions.forEach(s => Object.values(s.data).forEach(status => {
                     if (typeof status === 'string' && status !== ChecklistStatus.NA) {
                        total++;
                        if (status === ChecklistStatus.Compliant) compliant++;
                    }
                }));
                return { name: region, compliance: total > 0 ? (compliant / total) * 100 : 100 };
            }),
            incidentDistribution: Object.values(IncidentType).map(type => ({
                name: type,
                value: filteredData.incidents.filter(inc => inc.type === type).length,
            })),
            submissions: filteredData.submissions,
            audits: filteredData.audits,
            incidents: filteredData.incidents
        };

        const insights = await generateBiReport(reportData);
        setAiInsights(insights.replace(/\n/g, '<br />'));
        setIsLoadingAi(false);
    };

    return (
        <div className="p-6 lg:p-8 space-y-8">
            <h1 className="text-3xl font-bold text-slate-800">Business Intelligence Dashboard</h1>
            
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Region</label>
                        <select value={regionFilter} onChange={e => {setRegionFilter(e.target.value); setStationFilter('');}} className="mt-1 block w-full text-sm rounded-md border-gray-300">
                             <option value="">All Regions</option>
                             {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700">Station</label>
                        <select value={stationFilter} onChange={e => setStationFilter(e.target.value)} className="mt-1 block w-full text-sm rounded-md border-gray-300" disabled={!regionFilter}>
                             <option value="">All Stations in Region</option>
                             {stations.filter(s=> s.region === regionFilter).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <button onClick={() => {setRegionFilter(''); setStationFilter('');}} className="w-full md:w-auto px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 text-sm">Clear Filters</button>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Compliance Score" value={kpis.complianceScore} icon={ICONS.checklist} helpText="Overall % of checklist items marked 'Compliant'." />
                <KpiCard title="Open CAPAs" value={kpis.openCapas} icon={ICONS.audit} helpText="Total corrective actions not yet approved." />
                <KpiCard title="Avg. CAPA Closure" value={kpis.avgCapaClosureDays + ' days'} icon={ICONS.history} helpText="Average time from audit completion to CAPA approval."/>
                <KpiCard title="Total Incidents" value={kpis.incidentRate} icon={ICONS.incident} helpText="Total incidents reported in the selected scope."/>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-8">
                     <Card title="Compliance Trend">{<ComplianceTrendChart submissions={filteredData.submissions} />}</Card>
                     <Card title="Regional Compliance">{<RegionalComplianceComparisonChart submissions={submissions} stations={stations}/>}</Card>
                </div>
                <div className="lg:col-span-2 space-y-8">
                     <Card title="AI-Powered Insights">
                        <button onClick={handleGenerateInsights} disabled={isLoadingAi} className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:bg-slate-400">
                            {React.cloneElement(ICONS.ai, { className: 'w-4 h-4'})}
                            <span>{isLoadingAi ? 'Generating...' : 'Generate AI Insights'}</span>
                        </button>
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg min-h-[150px]">
                            {isLoadingAi && <SkeletonLoader className="w-full h-24"/>}
                            {aiInsights && <div className="prose prose-sm max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: aiInsights }} />}
                            {!aiInsights && !isLoadingAi && <p className="text-sm text-center text-slate-500">Click the button to generate an executive summary of the current data.</p>}
                        </div>
                     </Card>
                     <Card title="CAPA Status Overview">{<CapaStatusChart audits={filteredData.audits} />}</Card>
                     <Card title="Incident Type Distribution">{<IncidentTypeDistributionChart incidents={filteredData.incidents} />}</Card>
                </div>
            </div>

        </div>
    );
};

export default BIDashboard;
