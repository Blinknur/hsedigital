
import React, { useState, useEffect } from 'react';
import { Incident, Station, User, IncidentStatus, IncidentType, UserRole, GeolocationCoordinates, Permission } from '../../types';
import Card from '../../shared/Card';
import CommentThread from '../../shared/CommentThread';
import { usePermissions } from '../../hooks/usePermissions';
import * as api from '../../api/dataService';

interface IncidentModalProps {
    incident: Incident | null;
    stations: Station[];
    users: User[];
    currentUser: User;
    onClose: () => void;
    onSubmit: (data: { stationId: string; type: IncidentType; description: string; photoUrls: string[]; geolocation?: GeolocationCoordinates }) => void;
    onUpdate: (incident: Incident) => void;
    onAddComment: (incidentId: string, text: string) => void;
}

const getStatusBadge = (status: IncidentStatus) => {
    const styles = {
        [IncidentStatus.Open]: 'bg-red-100 text-red-800',
        [IncidentStatus.UnderInvestigation]: 'bg-yellow-100 text-yellow-800',
        [IncidentStatus.Closed]: 'bg-blue-100 text-blue-800',
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};


const IncidentModal: React.FC<IncidentModalProps> = ({ incident, stations, users, currentUser, onClose, onSubmit, onUpdate, onAddComment }) => {
    const isNew = !incident;
    const canManage = usePermissions(currentUser, Permission.ManageIncidents);

    const [stationId, setStationId] = useState<string>(incident?.stationId || (stations.length > 0 ? stations[0].id : ''));
    const [incidentType, setIncidentType] = useState<IncidentType>(incident?.type || IncidentType.NearMiss);
    const [description, setDescription] = useState(incident?.description || '');
    const [photos, setPhotos] = useState<File[]>([]);
    const [geolocation, setGeolocation] = useState<GeolocationCoordinates>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');

    // Fields for managing an existing incident
    const [status, setStatus] = useState<IncidentStatus>(incident?.status || IncidentStatus.Open);
    const [assignedTo, setAssignedTo] = useState<string>(incident?.assignedTo || '');
    const [investigationNotes, setInvestigationNotes] = useState(incident?.investigationNotes || '');

    useEffect(() => {
        if (!isNew) return;
        navigator.geolocation.getCurrentPosition(
            (position) => setGeolocation(position.coords),
            (error) => console.warn(`Error getting geolocation: ${error.message}`)
        );
    }, [isNew]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description) return;
        setIsSubmitting(true);
        setUploadStatus('Uploading evidence...');
        
        let photoUrls: string[] = [];
        if (photos.length > 0) {
            try {
                const uploadPromises = photos.map(file => api.uploadFile(file));
                photoUrls = await Promise.all(uploadPromises);
            } catch (error) {
                console.error("Upload failed", error);
                alert("Failed to upload images. Proceeding without them.");
            }
        }
        
        setUploadStatus('Submitting report...');
        onSubmit({ stationId, type: incidentType, description, photoUrls, geolocation });
    };

    const handleUpdate = () => {
        if (!incident) return;
        const updatedIncident = {
            ...incident,
            status,
            assignedTo,
            investigationNotes,
        };
        onUpdate(updatedIncident);
    };

    const handleAddCommentLocal = (text: string) => {
        if (incident) {
            onAddComment(incident.id, text);
        }
    }
    
    const renderForm = () => (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Station</label>
                    <select value={stationId} onChange={e => setStationId(e.target.value)} className="mt-1 w-full form-input" required>
                        {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium">Incident Type</label>
                    <select value={incidentType} onChange={e => setIncidentType(e.target.value as IncidentType)} className="mt-1 w-full form-input" required>
                        {Object.values(IncidentType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 w-full form-input" required></textarea>
            </div>
             <div>
                <label className="block text-sm font-medium">Upload Evidence (Photos)</label>
                <input type="file" multiple accept="image/*" onChange={e => setPhotos(Array.from(e.target.files || []))} className="mt-1 w-full text-sm"/>
                {photos.length > 0 && <p className="text-xs text-slate-500 mt-1">{photos.length} files selected</p>}
            </div>
        </form>
    );

    const renderDetails = () => {
        if (!incident) return null;
        const reporter = users.find(u => u.id === incident.reportedBy);
        const station = stations.find(s => s.id === incident.stationId);
        
        return (
             <div className="space-y-4">
                 <div className="p-3 bg-slate-50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><p className="font-medium text-slate-500">Status</p>{getStatusBadge(incident.status)}</div>
                    <div><p className="font-medium text-slate-500">Station</p><p className="font-semibold">{station?.name}</p></div>
                    <div><p className="font-medium text-slate-500">Type</p><p className="font-semibold">{incident.type}</p></div>
                    <div><p className="font-medium text-slate-500">Reporter</p><p className="font-semibold">{reporter?.name}</p></div>
                </div>

                <div>
                    <h4 className="font-semibold">Description</h4>
                    <p className="text-sm p-2 bg-slate-100 rounded-md mt-1">{incident.description}</p>
                </div>

                {incident.photoUrls.length > 0 && (
                    <div>
                         <h4 className="font-semibold">Evidence</h4>
                         <div className="flex gap-2 mt-1 flex-wrap">
                            {incident.photoUrls.map((url, idx) => (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                    <img src={url} alt="Incident evidence" className="w-24 h-24 object-cover rounded-md border hover:border-blue-400"/>
                                </a>
                            ))}
                         </div>
                    </div>
                )}
                
                <div className="pt-4 border-t">
                    <h3 className="font-semibold text-lg mb-2">Investigation Details</h3>
                    {canManage ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Status</label>
                                    <select value={status} onChange={e => setStatus(e.target.value as IncidentStatus)} className="mt-1 w-full form-input">
                                        {Object.values(IncidentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Assign To</label>
                                    <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="mt-1 w-full form-input">
                                        <option value="">Unassigned</option>
                                        {users.filter(u => u.role === UserRole.ComplianceManager || u.role === UserRole.Admin).map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Investigation Notes</label>
                                <textarea value={investigationNotes} onChange={e => setInvestigationNotes(e.target.value)} rows={4} className="mt-1 w-full form-input" placeholder="Add follow-up actions, root cause analysis, etc."/>
                            </div>
                        </div>
                    ) : (
                         <div className="space-y-2 text-sm">
                            <p><strong>Assigned To:</strong> {users.find(u => u.id === incident.assignedTo)?.name || 'Unassigned'}</p>
                            <p><strong>Notes:</strong> {incident.investigationNotes || 'No notes yet.'}</p>
                        </div>
                    )}
                </div>
                 <CommentThread
                    comments={incident.comments || []}
                    users={users}
                    currentUser={currentUser}
                    onAddComment={handleAddCommentLocal}
                />
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <Card title={isNew ? 'Report a New Incident' : 'Incident Details'} className="w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex-1 overflow-y-auto pr-2">
                    {isNew ? renderForm() : renderDetails()}
                </div>
                <div className="mt-6 flex justify-between items-center">
                     {uploadStatus && <span className="text-xs text-blue-600 font-semibold animate-pulse">{uploadStatus}</span>}
                    <div className="flex space-x-3 ml-auto">
                        <button onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        {isNew ? (
                             <button type="submit" onClick={handleSubmit} disabled={isSubmitting} className="btn btn-primary">
                                {isSubmitting ? 'Processing...' : 'Submit Report'}
                            </button>
                        ) : (
                           canManage && <button onClick={handleUpdate} className="btn btn-primary">Update Incident</button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default IncidentModal;
