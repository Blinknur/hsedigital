
import React, { useMemo } from 'react';
import { Audit, Station, FormDefinition, AuditStatus } from '../types';
import Card from './shared/Card';

interface PreAuditBriefingProps {
    audit: Audit;
    allAudits: Audit[];
    stations: Station[];
    formDefinitions: FormDefinition[];
    onBeginAudit: (auditId: string) => void;
    onBack: () => void;
}

const InfoItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-md font-semibold text-slate-800">{value}</p>
    </div>
);

const PreAuditBriefing: React.FC<PreAuditBriefingProps> = ({ audit, allAudits, stations, formDefinitions, onBeginAudit, onBack }) => {
    
    const station = useMemo(() => stations.find(s => s.id === audit.stationId), [stations, audit.stationId]);
    const auditForm = useMemo(() => formDefinitions.find(f => f.id === audit.formId), [formDefinitions, audit.formId]);

    const { lastAuditScore, openCapasCount } = useMemo(() => {
        const stationAudits = allAudits
            .filter(a => a.stationId === audit.stationId && (a.status === AuditStatus.Completed || a.status === AuditStatus.Closed))
            .sort((a, b) => new Date(b.completionDate!).getTime() - new Date(a.completionDate!).getTime());
        
        const lastAudit = stationAudits[0];
        const openCapas = stationAudits.flatMap(a => a.findings).filter(f => f.correctiveAction && f.correctiveAction.status !== 'Approved' && f.correctiveAction.status !== 'Completed').length;

        return {
            lastAuditScore: lastAudit ? lastAudit.overallScore : null,
            openCapasCount: openCapas
        };
    }, [allAudits, audit.stationId]);
    

    const isAuditInProgress = audit.status === AuditStatus.InProgress;

    return (
        <div className="p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button onClick={onBack} className="text-sm text-slate-600 hover:text-slate-900 mb-2">
                        &larr; Back to Planning
                    </button>
                    <h1 className="text-3xl font-bold text-slate-800">
                        {isAuditInProgress ? "Audit in Progress" : "Pre-Audit Briefing"}
                    </h1>
                    <p className="text-lg text-slate-500 mt-1">
                        Audit #{audit.auditNumber} - {station?.name}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="md:col-span-2 space-y-6">
                        <Card title="Station Snapshot">
                            <div className="grid grid-cols-2 gap-4">
                                <InfoItem label="Station Name" value={station?.name} />
                                <InfoItem label="Region" value={station?.region} />
                                <InfoItem label="Address" value={station?.address} />
                                <InfoItem label="Scheduled Date" value={new Date(audit.scheduledDate).toLocaleDateString()} />
                                 <InfoItem 
                                    label="Last Audit Score" 
                                    value={
                                        lastAuditScore !== null 
                                            ? <span className={`font-bold ${lastAuditScore < 80 ? 'text-red-600' : lastAuditScore < 95 ? 'text-amber-600' : 'text-green-600'}`}>{lastAuditScore}%</span>
                                            : 'N/A'
                                    } 
                                />
                                <InfoItem label="Open CAPAs" value={openCapasCount} />
                            </div>
                        </Card>
                        <Card title="Audit Scope">
                             <p className="text-sm text-slate-600 mb-3">This audit will be conducted using the following form:</p>
                             <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 text-sm font-medium rounded-full bg-slate-200 text-slate-700">{auditForm?.name || 'Unknown Form'}</span>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <Card title="Auditor Checklist">
                             <ul className="space-y-3">
                                {['Review station\'s previous audit findings.', 'Confirm travel & accommodation.', 'Contact Station Manager to confirm readiness.'].map((task, index) => (
                                    <li key={index} className="flex items-center">
                                        <input id={`task-${index}`} type="checkbox" className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300" />
                                        <label htmlFor={`task-${index}`} className="ml-2 text-sm text-slate-700">{task}</label>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                         <div className="p-4 bg-white rounded-xl shadow-md">
                             <h3 className="text-lg font-semibold text-slate-800 mb-2">{isAuditInProgress ? "Ready to Continue?" : "Ready to Begin?"}</h3>
                             <p className="text-sm text-slate-600 mb-4">
                                {isAuditInProgress
                                    ? "Resume the audit to continue recording findings."
                                    : "Once you begin, the audit status will be set to 'In Progress' and you can start recording findings."
                                }
                             </p>
                             <button 
                                onClick={() => onBeginAudit(audit.id)} 
                                className="w-full px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors text-lg"
                             >
                                 {isAuditInProgress ? "Resume Audit" : "Begin Audit Now"}
                             </button>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreAuditBriefing;
