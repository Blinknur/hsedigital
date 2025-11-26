
import React, { useState, useMemo } from 'react';
// FIX: Added IncidentType and GeolocationCoordinates to the import.
import { Incident, Station, User, IncidentStatus, UserRole, IncidentType, GeolocationCoordinates } from '../../types';
import Card from '../../shared/Card';
import EmptyState from '../../shared/EmptyState';
import { ICONS } from '../../constants';
import SkeletonLoader from '../../shared/SkeletonLoader';
import IncidentModal from './IncidentModal';

interface IncidentDashboardProps {
    incidents: Incident[];
    stations: Station[];
    users: User[];
    currentUser: User;
    onSubmit: (incident: { stationId: string; type: IncidentType; description: string; photoUrls: string[]; geolocation?: GeolocationCoordinates; }) => void;
    onUpdate: (incident: Incident) => void;
    onAddComment: (incidentId: string, text: string) => void; // NEW: Add comment handler prop
    isLoading: boolean;
}

const getStatusBadge = (status: IncidentStatus) => {
    const styles = {
        [IncidentStatus.Open]: 'bg-red-100 text-red-800',
        [IncidentStatus.UnderInvestigation]: 'bg-yellow-100 text-yellow-800',
        [IncidentStatus.Closed]: 'bg-blue-100 text-blue-800',
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};

const IncidentDashboard: React.FC<IncidentDashboardProps> = ({ incidents, stations, users, currentUser, onSubmit, onUpdate, onAddComment, isLoading }) => {
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const enrichedIncidents = useMemo(() => {
        return incidents.map(incident => ({
            ...incident,
            stationName: stations.find(s => s.id === incident.stationId)?.name || 'Unknown',
            reporterName: users.find(u => u.id === incident.reportedBy)?.name || 'Unknown',
        })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [incidents, stations, users]);

    const handleOpenModal = (incident: Incident | null = null) => {
        setSelectedIncident(incident);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedIncident(null);
    };

    const handleSubmitNew = (data: any) => {
        onSubmit(data);
        handleCloseModal();
    };

    const handleUpdateIncident = (data: any) => {
        onUpdate(data);
        handleCloseModal();
    };

    const canManageIncidents = currentUser.role === UserRole.Admin || currentUser.role === UserRole.ComplianceManager;

    return (
        <div className="p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Incident Log</h1>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 flex items-center space-x-2">
                    {React.cloneElement(ICONS.incident, { className: 'w-5 h-5' })}
                    <span>Report New Incident</span>
                </button>
            </div>
            <Card>
                {isLoading ? <SkeletonLoader className="h-96" /> : enrichedIncidents.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Incident ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Station</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reported At</th>
                                    <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {enrichedIncidents.map(incident => (
                                    <tr key={incident.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{incident.id.slice(-6).toUpperCase()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{incident.stationName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{incident.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(incident.status)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(incident.timestamp).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleOpenModal(incident)} className="text-emerald-600 hover:text-emerald-900">
                                                {canManageIncidents ? 'Manage' : 'View Details'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        icon={ICONS.incident}
                        title="No Incidents Reported"
                        message="The incident log is clear. You can report a new incident, near-miss, or safety observation using the button above."
                        action={{ text: 'Report New Incident', onClick: () => handleOpenModal() }}
                    />
                )}
            </Card>

            {isModalOpen && (
                <IncidentModal
                    incident={selectedIncident}
                    stations={stations}
                    users={users}
                    currentUser={currentUser}
                    onClose={handleCloseModal}
                    onSubmit={handleSubmitNew}
                    onUpdate={handleUpdateIncident}
                    onAddComment={onAddComment}
                />
            )}
        </div>
    );
};

export default IncidentDashboard;
