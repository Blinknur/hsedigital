
import React, { useState, useMemo } from 'react';
import { PermitToWork, Station, User, PermitStatus, UserRole, PermitType, Permission, Contractor } from '../types';
import Card from './shared/Card';
import EmptyState from './shared/EmptyState';
import { ICONS } from '../constants';
import SkeletonLoader from './shared/SkeletonLoader';
import PermitModal from './PermitModal';
import { usePermissions } from '../hooks/usePermissions';

interface PermitDashboardProps {
    permits: PermitToWork[];
    stations: Station[];
    users: User[];
    contractors: Contractor[]; // NEW: Added contractors prop
    currentUser: User;
    onCreatePermit: (data: Omit<PermitToWork, 'id' | 'organizationId' | 'permitNumber' | 'status' | 'history' | 'requestedBy'>) => void;
    onUpdatePermitStatus: (permitId: string, newStatus: PermitStatus, notes?: string) => void;
    isLoading: boolean;
}

const getStatusBadge = (status: PermitStatus) => {
    const styles = {
        [PermitStatus.Draft]: 'bg-gray-100 text-gray-800',
        [PermitStatus.PendingApproval]: 'bg-yellow-100 text-yellow-800',
        [PermitStatus.Approved]: 'bg-cyan-100 text-cyan-800',
        [PermitStatus.Active]: 'bg-green-100 text-green-800 animate-pulse',
        [PermitStatus.Closed]: 'bg-blue-100 text-blue-800',
        [PermitStatus.Rejected]: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};

const PermitDashboard: React.FC<PermitDashboardProps> = ({ permits, stations, users, contractors, currentUser, onCreatePermit, onUpdatePermitStatus, isLoading }) => {
    const [selectedPermit, setSelectedPermit] = useState<PermitToWork | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const enrichedPermits = useMemo(() => {
        return permits.map(permit => ({
            ...permit,
            stationName: stations.find(s => s.id === permit.stationId)?.name || 'Unknown',
            requesterName: users.find(u => u.id === permit.requestedBy)?.name || 'Unknown',
            contractorName: contractors.find(c => c.id === permit.contractorId)?.name || 'Unknown Contractor',
        })).sort((a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime());
    }, [permits, stations, users, contractors]);

    const handleOpenModal = (permit: PermitToWork | null = null) => {
        setSelectedPermit(permit);
        setIsModalOpen(true);
    }
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedPermit(null);
    }

    const handleCreateSubmit = (data: Omit<PermitToWork, 'id' | 'organizationId' | 'permitNumber' | 'status' | 'history' | 'requestedBy'>) => {
        onCreatePermit(data);
        handleCloseModal();
    };

    const handleUpdateStatus = (permitId: string, newStatus: PermitStatus, notes?: string) => {
        onUpdatePermitStatus(permitId, newStatus, notes);
        handleCloseModal();
    }

    const canRequestPermit = usePermissions(currentUser, Permission.RequestPermits);

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div>
                     <h1 className="text-3xl font-bold text-slate-800">Contractor Safety Management</h1>
                     <p className="text-slate-500 mt-1">Manage permits, track external work, and ensure contractor compliance.</p>
                </div>
               
                {canRequestPermit && (
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 flex items-center space-x-2">
                        {React.cloneElement(ICONS.permit, { className: 'w-5 h-5'})}
                        <span>Request New Permit</span>
                    </button>
                )}
            </div>
            <Card>
                {isLoading ? <SkeletonLoader className="h-96" /> : enrichedPermits.length > 0 ? (
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Permit #</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Station</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contractor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Valid From</th>
                                    <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {enrichedPermits.map(permit => (
                                    <tr key={permit.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-slate-700">{permit.permitNumber}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{permit.stationName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-900">{permit.contractorName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{permit.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(permit.status)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(permit.validFrom).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleOpenModal(permit)} className="text-emerald-600 hover:text-emerald-900">View Details</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        icon={ICONS.permit}
                        title="No Work Permits Found"
                        message="There are no active or historical permits. Start by requesting a new permit for contractor work."
                        action={canRequestPermit ? { text: 'Request New Permit', onClick: () => handleOpenModal() } : undefined}
                    />
                )}
            </Card>
            
            {isModalOpen && (
                <PermitModal
                    permit={selectedPermit}
                    stations={stations}
                    users={users}
                    contractors={contractors}
                    currentUser={currentUser}
                    onClose={handleCloseModal}
                    onCreate={handleCreateSubmit}
                    onUpdateStatus={handleUpdateStatus}
                />
            )}
        </div>
    );
};

export default PermitDashboard;
