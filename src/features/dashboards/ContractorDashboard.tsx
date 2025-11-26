
import React, { useMemo } from 'react';
import { User, Station, PermitToWork, Contractor, PermitStatus, View } from '../../types';
import Card from '../../shared/Card';
import { ICONS } from '../../constants';
import SkeletonLoader from '../../shared/SkeletonLoader';
import EmptyState from '../../shared/EmptyState';

interface ContractorDashboardProps {
    currentUser: User;
    stations: Station[];
    permits: PermitToWork[];
    contractors: Contractor[];
    setCurrentView: (view: View) => void;
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

const ContractorDashboard: React.FC<ContractorDashboardProps> = ({ currentUser, stations, permits, contractors, setCurrentView, isLoading }) => {
    
    const myContractorProfile = useMemo(() => {
        return contractors.find(c => c.id === currentUser.contractorId);
    }, [contractors, currentUser.contractorId]);

    const myPermits = useMemo(() => {
        if (!currentUser.contractorId) return [];
        return permits.filter(p => p.contractorId === currentUser.contractorId)
            .sort((a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime());
    }, [permits, currentUser.contractorId]);

    const activePermitCount = myPermits.filter(p => p.status === PermitStatus.Active).length;
    const pendingPermitCount = myPermits.filter(p => p.status === PermitStatus.PendingApproval || p.status === PermitStatus.Approved).length;

    if (isLoading) return <SkeletonLoader className="h-screen w-full" />;

    if (!myContractorProfile) {
        return (
            <div className="p-8">
                <Card>
                    <EmptyState 
                        icon={ICONS.actionCenter}
                        title="Contractor Profile Not Found"
                        message="Your user account is not linked to a valid contractor profile. Please contact the system administrator."
                    />
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Contractor Portal</h1>
                <p className="text-slate-500 mt-1">Welcome, {currentUser.name} | <strong>{myContractorProfile.name}</strong></p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-4 bg-blue-50 border-blue-200">
                    <h3 className="text-blue-800 font-semibold">Active Permits</h3>
                    <p className="text-3xl font-bold text-blue-900">{activePermitCount}</p>
                    <p className="text-xs text-blue-600">Work currently authorized</p>
                </Card>
                <Card className="p-4 bg-amber-50 border-amber-200">
                    <h3 className="text-amber-800 font-semibold">Pending/Approved</h3>
                    <p className="text-3xl font-bold text-amber-900">{pendingPermitCount}</p>
                    <p className="text-xs text-amber-600">Upcoming or awaiting approval</p>
                </Card>
                <Card className="p-4 flex items-center justify-center">
                     <button onClick={() => setCurrentView('permit')} className="flex flex-col items-center text-emerald-600 hover:text-emerald-700">
                        <div className="p-2 bg-emerald-100 rounded-full mb-2">
                            {React.cloneElement(ICONS.permit, { className: 'w-6 h-6' })}
                        </div>
                        <span className="font-semibold">Request Permit</span>
                     </button>
                </Card>
            </div>

            <Card title="My Work Permits">
                {myPermits.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Permit #</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Station</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {myPermits.map(permit => (
                                    <tr key={permit.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold">{permit.permitNumber}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{stations.find(s => s.id === permit.stationId)?.name || 'Unknown'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{permit.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(permit.status)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(permit.validFrom).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        icon={ICONS.permit}
                        title="No Permits Found"
                        message="You have no permit history. Request a new permit to start work."
                        action={{ text: 'Request New Permit', onClick: () => setCurrentView('permit') }}
                    />
                )}
            </Card>
        </div>
    );
};

export default ContractorDashboard;
