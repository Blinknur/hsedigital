import React, { useState, useMemo } from 'react';
import { Audit, Station, User, AuditStatus, FindingSeverity, FormDefinition, ChecklistStatus, CorrectiveActionStatus, CorrectiveAction, UserRole } from '../types';
import Card from './shared/Card';
import CapaItem from './shared/CapaItem';
import EmptyState from './shared/EmptyState';
import { ICONS } from '../constants';

interface AuditListProps {
  audits: Audit[];
  stations: Station[];
  users: User[];
  formDefinitions: FormDefinition[];
  currentUser: User;
  onUpdateCapa: (auditId: string, findingItemId: string, newStatus: CorrectiveActionStatus, notes?: string) => void;
  onStartAudit: (auditId: string) => void;
  onAddSubTask: (auditId: string, findingItemId: string, description: string) => void;
  onToggleSubTask: (auditId: string, findingItemId: string, subTaskId: string) => void;
  // FIX: Added onAddComment prop to satisfy CapaItem's requirements.
  onAddComment: (auditId: string, findingItemId: string, text: string) => void;
  isEmbedded?: boolean;
}

const getStatusBadge = (status: AuditStatus) => {
    switch (status) {
      case AuditStatus.Completed:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">{status}</span>;
      case AuditStatus.Closed:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{status}</span>;
      case AuditStatus.InProgress:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">{status}</span>;
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
};

const getSeverityBadge = (severity?: FindingSeverity) => {
    if (!severity) return null;
    switch (severity) {
        case FindingSeverity.Critical:
            return <span className="px-2 py-1 text-xs font-bold rounded bg-red-500 text-white">{severity}</span>;
        case FindingSeverity.Major:
            return <span className="px-2 py-1 text-xs font-bold rounded bg-orange-500 text-white">{severity}</span>;
        case FindingSeverity.Minor:
            return <span className="px-2 py-1 text-xs font-bold rounded bg-yellow-400 text-gray-800">{severity}</span>;
    }
};

const AuditList: React.FC<AuditListProps> = ({ audits, stations, users, formDefinitions, currentUser, onUpdateCapa, onStartAudit, onAddSubTask, onToggleSubTask, onAddComment, isEmbedded = false }) => {
    const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);

    const enrichedAudits = useMemo(() => {
        return audits.map(audit => {
            const station = stations.find(s => s.id === audit.stationId);
            const auditor = users.find(u => u.id === audit.auditorId);
            return {
                ...audit,
                stationName: station?.name || 'Unknown Station',
                auditorName: auditor?.name || 'Unknown Auditor',
            };
        }).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
    }, [audits, stations, users]);
    
    const getChecklistText = (audit: Audit, finding: any): string => {
        const form = formDefinitions.find(f => f.id === audit.formId);
        if (!form || !form.schema || !form.schema.components) return 'Unknown Item';
        const component = form.schema.components.find((c: any) => c.key === finding.itemId);
        return component?.label || 'Unknown Item';
    };

    const DetailsModal = () => {
        if (!selectedAudit) return null;
        
        const auditDetails = enrichedAudits.find(a => a.id === selectedAudit.id);
        
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                <Card title={`Audit Details - ${auditDetails?.stationName}`} className="w-full max-w-3xl max-h-[90vh] flex flex-col">
                    <div className="flex justify-between text-sm text-slate-600 mb-4 border-b pb-2">
                        <div><strong>Audit ID:</strong> {auditDetails?.auditNumber}</div>
                        <div><strong>Auditor:</strong> {auditDetails?.auditorName}</div>
                        <div><strong>Scheduled:</strong> {selectedAudit.scheduledDate.toLocaleDateString()}</div>
                        <div><strong>Status:</strong> {getStatusBadge(selectedAudit.status)}</div>
                        <div><strong>Score:</strong> <span className="font-bold">{selectedAudit.overallScore}%</span></div>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2">
                        <h4 className="font-semibold text-lg mb-2">Findings & CAPAs</h4>
                        {selectedAudit.findings.length > 0 ? (
                            <ul className="space-y-4">
                                {selectedAudit.findings.map(finding => {
                                    return (
                                        <li key={finding.itemId} className="p-3 bg-slate-50 rounded-md border">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium text-slate-800">{getChecklistText(selectedAudit, finding)}</p>
                                                    <p className="text-sm text-slate-600 mt-1"><strong>Observation:</strong> {finding.observations || 'N/A'}</p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${finding.status === ChecklistStatus.NonCompliant ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{finding.status}</span>
                                                    {getSeverityBadge(finding.severity)}
                                                </div>
                                            </div>
                                            {finding.rootCauses && finding.rootCauses.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-slate-200">
                                                    <p className="text-sm text-slate-600"><strong>Root Cause(s):</strong></p>
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {finding.rootCauses.map(cause => (
                                                            <span key={cause} className="px-2 py-1 text-xs font-medium rounded-full bg-slate-200 text-slate-700">{cause}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {finding.correctiveAction && (
                                                <div className="mt-3 pt-3 border-t">
                                                    <CapaItem
                                                        finding={finding}
                                                        auditId={selectedAudit.id}
                                                        currentUser={currentUser}
                                                        users={users}
                                                        onUpdateCapa={onUpdateCapa}
                                                        checklistText={getChecklistText(selectedAudit, finding)}
                                                        onAddSubTask={onAddSubTask}
                                                        onToggleSubTask={onToggleSubTask}
                                                        onAddComment={onAddComment}
                                                    />
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : <p className="text-slate-500">No findings reported for this audit.</p>}
                    </div>
                    <div className="mt-6 text-right">
                        <button onClick={() => setSelectedAudit(null)} className="px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700">
                        Close
                        </button>
                    </div>
                </Card>
            </div>
        );
    };

    const content = (
         <Card>
            {enrichedAudits.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Audit #</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Station</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Auditor</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Scheduled Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Score</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                        {enrichedAudits.map(audit => {
                            const isActionable = (audit.status === AuditStatus.Scheduled || audit.status === AuditStatus.InProgress);
                            const isAuditor = currentUser.role === UserRole.ComplianceManager || currentUser.role === UserRole.Admin || currentUser.role === UserRole.Auditor;

                            return (
                                <tr key={audit.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">{audit.auditNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{audit.stationName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{audit.auditorName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(audit.scheduledDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`font-semibold ${audit.overallScore < 80 ? 'text-red-600' : audit.overallScore < 95 ? 'text-amber-600' : 'text-green-600'}`}>
                                            {audit.overallScore > 0 ? `${audit.overallScore}%` : '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{getStatusBadge(audit.status)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => setSelectedAudit(audit)} className="text-emerald-600 hover:text-emerald-900">
                                            View Details
                                        </button>
                                        {isActionable && isAuditor && (
                                            <button onClick={() => onStartAudit(audit.id)} className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700">
                                                {audit.status === AuditStatus.InProgress ? 'Continue Audit' : 'Start Audit'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            ) : (
                 <EmptyState
                    icon={ICONS.audit}
                    title="No Audits Found"
                    message="There are no audits matching the current criteria. Try scheduling one or adjusting your filters."
                />
            )}
        </Card>
    );

    if (isEmbedded) {
        return (
            <>
                {content}
                <DetailsModal />
            </>
        );
    }
    
    return (
        <div className="p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Audit History</h1>
            {content}
            <DetailsModal />
        </div>
    );
};

export default AuditList;