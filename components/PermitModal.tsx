
import React, { useState, useEffect } from 'react';
import { PermitToWork, Station, User, PermitStatus, UserRole, PermitType, AuditTrailEntry, Permission, Contractor } from '../types';
import Card from './shared/Card';
import { usePermissions } from '../hooks/usePermissions';

interface PermitModalProps {
    permit: PermitToWork | null;
    stations: Station[];
    users: User[];
    contractors: Contractor[]; // NEW: Pass contractors list
    currentUser: User;
    onClose: () => void;
    onCreate: (data: Omit<PermitToWork, 'id' | 'organizationId' | 'permitNumber' | 'status' | 'history' | 'requestedBy'>) => void;
    onUpdateStatus: (permitId: string, newStatus: PermitStatus, notes?: string) => void;
}

const SAFETY_PRECAUTIONS = {
    [PermitType.HotWork]: [
        { key: 'fireExtinguisher', label: 'Fire Extinguisher Ready' },
        { key: 'barricadeArea', label: 'Area Barricaded & Signed' },
        { key: 'hotWorkWatch', label: 'Fire Watch Personnel Present' },
    ],
    [PermitType.ConfinedSpaceEntry]: [
        { key: 'gasMonitoring', label: 'Atmosphere Monitored' },
        { key: 'rescuePlan', label: 'Rescue Plan in Place' },
        { key: 'ventilation', label: 'Forced Ventilation Active' },
    ],
    [PermitType.ElectricalWork]: [
        { key: 'lockoutTagout', label: 'Lockout/Tagout Applied' },
        { key: 'insulatedTools', label: 'Insulated Tools in Use' },
        { key: 'arcFlashPPE', label: 'Arc Flash PPE Worn' },
    ],
    [PermitType.Excavation]: [
        { key: 'shoring', label: 'Shoring/Sloping in Place' },
        { key: 'undergroundUtilities', label: 'Underground Utilities Marked' },
        { key: 'accessEgress', label: 'Safe Access/Egress Provided' },
    ],
    [PermitType.WorkAtHeight]: [
        { key: 'fallArrestSystem', label: 'Fall Arrest System in Use' },
        { key: 'scaffoldInspection', label: 'Scaffold/Ladder Inspected' },
        { key: 'toolTethering', label: 'Tools Tethered' },
    ]
};

const getStatusBadge = (status: PermitStatus) => {
    const styles = {
        [PermitStatus.Draft]: 'bg-gray-100 text-gray-800',
        [PermitStatus.PendingApproval]: 'bg-yellow-100 text-yellow-800',
        [PermitStatus.Approved]: 'bg-cyan-100 text-cyan-800',
        [PermitStatus.Active]: 'bg-green-100 text-green-800',
        [PermitStatus.Closed]: 'bg-blue-100 text-blue-800',
        [PermitStatus.Rejected]: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};


const PermitModal: React.FC<PermitModalProps> = ({ permit, stations, users, contractors, currentUser, onClose, onCreate, onUpdateStatus }) => {
    const isNew = !permit;
    const initialFormData = {
        stationId: permit?.stationId || '',
        contractorId: permit?.contractorId || '',
        type: permit?.type || PermitType.HotWork,
        description: permit?.description || '',
        locationOfWork: permit?.locationOfWork || '',
        validFrom: permit?.validFrom ? new Date(permit.validFrom) : new Date(),
        validTo: permit?.validTo ? new Date(permit.validTo) : new Date(new Date().setHours(new Date().getHours() + 8)),
        safetyPrecautions: permit?.safetyPrecautions || {},
    };

    const [formData, setFormData] = useState(initialFormData);
    const [actionNotes, setActionNotes] = useState('');
    const [showNotesFor, setShowNotesFor] = useState<PermitStatus | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({
                ...prev,
                safetyPrecautions: { ...prev.safetyPrecautions, [name]: checked }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simple validation
        if (!formData.stationId || !formData.description || !formData.locationOfWork || !formData.contractorId) {
            alert('Please fill all required fields, including the Contractor.');
            return;
        }
        onCreate(formData);
    };

    const handleAction = (newStatus: PermitStatus) => {
        if (!permit) return;
        if ((newStatus === PermitStatus.Rejected || newStatus === PermitStatus.Closed) && !actionNotes.trim()) {
            alert('Notes are required for this action.');
            return;
        }
        onUpdateStatus(permit.id, newStatus, actionNotes);
    };

    const canApprove = usePermissions(currentUser, Permission.ApprovePermits);
    const canActivate = (permit?.status === PermitStatus.Approved && (currentUser.id === permit.requestedBy || canApprove));
    const canClose = (permit?.status === PermitStatus.Active && (currentUser.id === permit.requestedBy || canApprove));

    const renderActionButtons = () => {
        if (!permit) return null;

        if (showNotesFor) {
            return (
                <div className="w-full mt-4 p-3 bg-slate-100 rounded-lg border">
                    <label className="text-sm font-semibold">{showNotesFor === PermitStatus.Rejected ? 'Rejection Reason' : 'Close-out Notes'}</label>
                    <textarea value={actionNotes} onChange={e => setActionNotes(e.target.value)} rows={3} className="w-full mt-1 p-2 border rounded-md" required />
                    <div className="flex justify-end space-x-2 mt-2">
                        <button onClick={() => setShowNotesFor(null)} className="btn btn-secondary !py-1.5 !px-3">Cancel</button>
                        <button onClick={() => handleAction(showNotesFor)} className="btn btn-primary !py-1.5 !px-3">Confirm</button>
                    </div>
                </div>
            );
        }

        switch (permit.status) {
            case PermitStatus.PendingApproval:
                if (canApprove) {
                    return (
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setShowNotesFor(PermitStatus.Rejected)} className="btn btn-secondary bg-red-100 text-red-700 hover:bg-red-200">Reject</button>
                            <button onClick={() => handleAction(PermitStatus.Approved)} className="btn btn-primary">Approve</button>
                        </div>
                    );
                }
                return <p className="text-sm text-slate-500 text-right">Awaiting approval from a compliance manager.</p>;
            
            case PermitStatus.Approved:
                if(canActivate) return <button onClick={() => handleAction(PermitStatus.Active)} className="btn btn-primary w-full">Activate Permit</button>;
                return <p className="text-sm text-slate-500 text-right">Permit is approved. Ready to be activated by requester.</p>;

            case PermitStatus.Active:
                if(canClose) return <button onClick={() => setShowNotesFor(PermitStatus.Closed)} className="btn btn-primary w-full bg-blue-600 hover:bg-blue-700">Close Out Permit</button>;
                return <p className="text-sm text-slate-500 text-right">Permit is currently active.</p>;

            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <Card title={isNew ? 'Request New Contractor Permit' : `Permit Details: ${permit.permitNumber}`} className="w-full max-w-2xl max-h-[90vh] flex flex-col">
                {isNew ? (
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Station</label>
                                <select name="stationId" value={formData.stationId} onChange={handleChange} className="mt-1 w-full form-input" required>
                                    <option value="">Select Station...</option>
                                    {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium">Permit Type</label>
                                <select name="type" value={formData.type} onChange={handleChange} className="mt-1 w-full form-input" required>
                                    {Object.values(PermitType).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Contractor (Vendor)</label>
                            <select name="contractorId" value={formData.contractorId} onChange={handleChange} className="mt-1 w-full form-input" required>
                                <option value="">Select Assigned Contractor...</option>
                                {contractors.map(c => <option key={c.id} value={c.id}>{c.name} ({c.specialization})</option>)}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">Select the verified contractor company performing this work.</p>
                        </div>

                        <div>
                             <label className="block text-sm font-medium">Location of Work</label>
                             <input type="text" name="locationOfWork" value={formData.locationOfWork} onChange={handleChange} className="mt-1 w-full form-input" placeholder="e.g., Pump 3, Electrical Room" required/>
                        </div>
                        <div>
                             <label className="block text-sm font-medium">Description of Work</label>
                             <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="mt-1 w-full form-input" required/>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium">Valid From</label>
                                <input type="datetime-local" name="validFrom" value={new Date(formData.validFrom.getTime() - formData.validFrom.getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={e => setFormData(f => ({...f, validFrom: new Date(e.target.value)}))} className="mt-1 w-full form-input"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Valid To</label>
                                <input type="datetime-local" name="validTo" value={new Date(formData.validTo.getTime() - formData.validTo.getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={e => setFormData(f => ({...f, validTo: new Date(e.target.value)}))} className="mt-1 w-full form-input"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Mandatory Safety Precautions (Checklist)</label>
                            <div className="space-y-2 bg-slate-50 p-3 rounded-lg border">
                                {SAFETY_PRECAUTIONS[formData.type].map(prec => (
                                    <label key={prec.key} className="flex items-center space-x-2">
                                        <input type="checkbox" name={prec.key} checked={!!formData.safetyPrecautions[prec.key]} onChange={handleChange} className="h-4 w-4 rounded text-emerald-600"/>
                                        <span className="text-sm">{prec.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {/* Details View */}
                         <div className="p-3 bg-slate-50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div><p className="font-medium text-slate-500">Status</p>{getStatusBadge(permit.status)}</div>
                            <div><p className="font-medium text-slate-500">Station</p><p className="font-semibold">{stations.find(s=>s.id === permit.stationId)?.name}</p></div>
                            <div><p className="font-medium text-slate-500">Type</p><p className="font-semibold">{permit.type}</p></div>
                            <div><p className="font-medium text-slate-500">Requester</p><p className="font-semibold">{users.find(u=>u.id === permit.requestedBy)?.name}</p></div>
                        </div>
                        
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="font-medium text-blue-800 text-sm">Assigned Contractor</p>
                            <p className="font-bold text-lg text-slate-800">
                                {contractors.find(c => c.id === permit.contractorId)?.name || 'Unknown Contractor'}
                            </p>
                            <p className="text-xs text-slate-600">{contractors.find(c => c.id === permit.contractorId)?.specialization}</p>
                        </div>

                         <div>
                            <h4 className="font-semibold">Work Details</h4>
                            <p><strong>Location:</strong> {permit.locationOfWork}</p>
                            <p><strong>Description:</strong> {permit.description}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold">Validity</h4>
                            <p><strong>From:</strong> {new Date(permit.validFrom).toLocaleString()}</p>
                            <p><strong>To:</strong> {new Date(permit.validTo).toLocaleString()}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold">History</h4>
                            <ul className="text-xs space-y-1 mt-1">
                                {permit.history.map((entry: AuditTrailEntry, index) => (
                                     <li key={index} className="p-2 bg-slate-100 rounded-md">
                                        <strong>{entry.status}</strong> by {users.find(u=>u.id===entry.userId)?.name} on {new Date(entry.timestamp).toLocaleString()}
                                        {entry.notes && <p className="italic">"{entry.notes}"</p>}
                                     </li>
                                ))}
                            </ul>
                        </div>
                        <div className="pt-4 border-t">
                            {renderActionButtons()}
                        </div>
                    </div>
                )}

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="btn btn-secondary">
                        {isNew ? 'Cancel' : 'Close'}
                    </button>
                    {isNew && <button type="submit" onClick={handleSubmit} className="btn btn-primary">Request Permit</button>}
                </div>
            </Card>
        </div>
    );
};

export default PermitModal;
