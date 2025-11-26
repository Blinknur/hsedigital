
import React, { useState, useEffect } from 'react';
import { Station, User, UserRole, Audit, AuditStatus, FindingSeverity, FormDefinition, Permission } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';

interface AuditModalProps {
    modalData: { date?: Date; audit?: Audit };
    stations: Station[];
    users: User[];
    audits: Audit[];
    // FIX: Add formDefinitions to select a form for the audit
    formDefinitions: FormDefinition[];
    currentUser: User;
    onClose: () => void;
    // FIX: Add formId to the onSchedule signature
    onSchedule: (data: { stationId: string; auditorId: string; scheduledDate: Date; formId: string }) => void;
    onUpdate: (audit: Audit) => void;
    onDelete: (auditId: string) => void;
    onApprove: (auditId: string) => void;
    // FIX: Updated onReject signature to include a reason, resolving the type error.
    onReject: (auditId: string, reason: string) => void;
}

const AuditModal: React.FC<AuditModalProps> = ({ modalData, stations, users, audits, formDefinitions, currentUser, onClose, onSchedule, onUpdate, onDelete, onApprove, onReject }) => {
    const { audit, date } = modalData;
    const isEditMode = !!audit;

    const [stationId, setStationId] = useState<string>('');
    const [auditorId, setAuditorId] = useState<string>('');
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(date);
    const [formId, setFormId] = useState<string>('');
    const [error, setError] = useState('');
    const [suggestion, setSuggestion] = useState('');
    
    const canApprove = usePermissions(currentUser, Permission.ApproveAudits);
    const canSchedule = usePermissions(currentUser, Permission.ScheduleAudits);

    const isPendingApproval = isEditMode && audit.status === AuditStatus.PendingApproval;
    const isDeclined = isEditMode && audit.status === AuditStatus.Declined;

    useEffect(() => {
        if (audit) {
            setStationId(audit.stationId);
            setAuditorId(audit.auditorId);
            setScheduledDate(new Date(audit.scheduledDate));
            setFormId(audit.formId);
        }
    }, [audit]);

    useEffect(() => {
        setSuggestion('');
        if (stationId) {
            const stationAudits = audits
                .filter(a => a.stationId === stationId && (a.status === AuditStatus.Completed || a.status === AuditStatus.Closed))
                .sort((a,b) => new Date(b.completionDate!).getTime() - new Date(a.completionDate!).getTime());

            const lastAudit = stationAudits[0];
            if (lastAudit) {
                const hasMajorFindings = lastAudit.findings.some(f => f.severity === FindingSeverity.Major || f.severity === FindingSeverity.Critical);
                if (hasMajorFindings) {
                    setSuggestion("Recommendation: This station had major/critical findings on its last audit. Consider increasing audit frequency or assigning a senior auditor.");
                }
            }
        }
    }, [stationId, audits]);

    const auditors = users.filter(u => u.role === UserRole.ComplianceManager || u.role === UserRole.Admin || u.role === UserRole.Auditor);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!stationId || !auditorId || !scheduledDate || !formId) {
            setError('Please fill all fields.');
            return;
        }
        
        const selectedDate = new Date(scheduledDate);
        selectedDate.setHours(0, 0, 0, 0);

        const auditorConflict = audits.find(existingAudit => {
            if (isEditMode && audit && existingAudit.id === audit.id) return false;
            const existingDate = new Date(existingAudit.scheduledDate);
            existingDate.setHours(0, 0, 0, 0);
            return existingAudit.auditorId === auditorId && existingDate.getTime() === selectedDate.getTime();
        });

        if (auditorConflict) {
            const conflictStation = stations.find(s => s.id === auditorConflict.stationId);
            setError(`Auditor is already scheduled for an audit at ${conflictStation?.name || 'another station'} on this date.`);
            return;
        }

        const stationConflict = audits.find(existingAudit => {
            if (isEditMode && audit && existingAudit.id === audit.id) return false;
            const existingDate = new Date(existingAudit.scheduledDate);
            existingDate.setHours(0, 0, 0, 0);
            return existingAudit.stationId === stationId && existingDate.getTime() === selectedDate.getTime();
        });

        if (stationConflict) {
            setError(`This station is already scheduled for an audit on this date.`);
            return;
        }

        if (isEditMode && audit) {
            onUpdate({ ...audit, stationId, auditorId, scheduledDate, formId });
        } else if(scheduledDate) {
            onSchedule({ stationId, auditorId, scheduledDate, formId });
        }
    };

    const handleDelete = () => {
        if (audit && window.confirm('Are you sure you want to delete this scheduled audit?')) {
            onDelete(audit.id);
        }
    };

    const handleApprove = () => {
        if (audit) {
            onApprove(audit.id);
            onClose();
        }
    }
    const handleReject = () => {
        // FIX: Prompt for a rejection reason and pass it to the onReject handler.
        if (audit && window.confirm('Are you sure you want to reject this audit request?')) {
            const reason = prompt('Please provide a reason for rejecting this audit request.');
            if (reason === null) {
                // User cancelled the prompt
                return;
            }
            if (!reason.trim()) {
                alert('A reason is required to reject an audit request.');
                return;
            }
            onReject(audit.id, reason);
            onClose();
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity duration-300">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md transition-all duration-300 scale-100">
                <h3 className="text-lg font-bold mb-2 text-slate-800">
                    {isPendingApproval ? 'Review Audit Request' : isDeclined ? 'Review Declined Audit' : isEditMode ? 'Edit Audit' : 'Schedule Audit'}
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                    Scheduling for: <strong>{scheduledDate?.toLocaleDateString()}</strong>
                </p>
                
                {suggestion && (
                    <div className="p-3 bg-amber-100 border-l-4 border-amber-500 text-amber-800 text-sm my-4 rounded-r-lg">
                        <p className="font-bold">Heads Up!</p>
                        <p>{suggestion}</p>
                    </div>
                )}

                {isDeclined && audit.declineReason && (
                    <div className="p-3 bg-red-100 border-l-4 border-red-500 text-red-800 text-sm my-4 rounded-r-lg">
                        <p className="font-bold">Declined by Auditor:</p>
                        <p className="italic">"{audit.declineReason}"</p>
                    </div>
                )}


                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                         <div>
                            <label htmlFor="date" className="block text-sm font-medium text-slate-700">Date</label>
                            <input 
                                type="date" 
                                id="date" 
                                value={scheduledDate ? scheduledDate.toISOString().split('T')[0] : ''} 
                                onChange={e => {
                                    if (e.target.value) {
                                        const [year, month, day] = e.target.value.split('-').map(Number);
                                        setScheduledDate(new Date(year, month - 1, day));
                                    } else {
                                        setScheduledDate(undefined);
                                    }
                                }}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                                required
                                disabled={isPendingApproval && !canApprove}
                            />
                        </div>
                        <div>
                            <label htmlFor="station" className="block text-sm font-medium text-slate-700">Station</label>
                            <select id="station" value={stationId} onChange={e => setStationId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md" required disabled={isPendingApproval && !canApprove}>
                                <option value="">Select a station...</option>
                                {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="auditor" className="block text-sm font-medium text-slate-700">Assign Auditor</label>
                            <select id="auditor" value={auditorId} onChange={e => setAuditorId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md" required disabled={isPendingApproval && !canApprove}>
                                <option value="">Select an auditor...</option>
                                {auditors.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="form" className="block text-sm font-medium text-slate-700">Audit Form</label>
                            <select id="form" value={formId} onChange={e => setFormId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md" required disabled={isPendingApproval && !canApprove}>
                                <option value="">Select a form...</option>
                                {formDefinitions.map(f => <option key={f.id} value={f.id}>{f.name} ({f.frequency})</option>)}
                            </select>
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    
                    <div className="mt-6 flex justify-between items-center">
                        <div>
                             {isEditMode && !isPendingApproval && canSchedule && (
                                <button type="button" onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">Delete</button>
                            )}
                        </div>
                        <div className="flex space-x-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300">Cancel</button>
                            {isPendingApproval && canApprove ? (
                                <>
                                    <button type="button" onClick={handleReject} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">Reject</button>
                                    <button type="button" onClick={handleApprove} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Approve</button>
                                </>
                            ) : !isPendingApproval && canSchedule ? (
                                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700">
                                    {isEditMode ? (isDeclined ? 'Resubmit for Approval' : 'Update Audit') : 'Request Audit'}
                                </button>
                            ) : null}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AuditModal;
