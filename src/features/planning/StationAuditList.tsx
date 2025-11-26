
import React, { useMemo } from 'react';
import { Station, Audit, User, AuditStatus } from '../../types';

interface StationAuditListProps {
    stations: Station[];
    audits: Audit[];
    users: User[];
}

const getStatusBadge = (status: AuditStatus | 'N/A' | 'Completed') => {
    switch (status) {
        case AuditStatus.PendingApproval:
            return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">{status}</span>;
        case AuditStatus.Approved:
            return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-cyan-100 text-cyan-800">{status}</span>;
        case AuditStatus.Declined:
            return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-rose-100 text-rose-800">{status}</span>;
        case AuditStatus.Completed:
        case AuditStatus.Closed:
            return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">{status}</span>;
        case AuditStatus.InProgress:
            return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">{status}</span>;
        case AuditStatus.Scheduled:
            return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{status}</span>;
        default:
            return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
};


const StationAuditList: React.FC<StationAuditListProps> = ({ stations, audits, users }) => {
    const stationData = useMemo(() => {
        return stations.map(station => {
            const stationAudits = audits.filter(a => a.stationId === station.id);
            const completedAudits = stationAudits
                .filter(a => a.status === AuditStatus.Completed || a.status === AuditStatus.Closed)
                .sort((a, b) => b.completionDate!.getTime() - a.completionDate!.getTime());

            const futureAudits = stationAudits
                .filter(a => new Date(a.scheduledDate) >= new Date() || a.status === AuditStatus.PendingApproval)
                .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

            const lastAudit = completedAudits[0];
            const nextAudit = futureAudits[0];

            let status: AuditStatus | 'N/A' | 'Completed' = 'N/A';
            if (nextAudit) {
                status = nextAudit.status;
            } else if (lastAudit) {
                status = 'Completed';
            }

            const auditor = nextAudit ? users.find(u => u.id === nextAudit.auditorId) : null;

            return {
                station,
                lastAudited: lastAudit?.completionDate,
                nextScheduled: nextAudit?.scheduledDate,
                status,
                auditorName: auditor?.name || '-',
                remarks: nextAudit?.status === AuditStatus.Declined ? 'Auditor declined' : '-'
            };
        }).sort((a,b) => a.station.name.localeCompare(b.station.name));
    }, [stations, audits, users]);

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Station</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Last Audited</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Next Scheduled</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Auditor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Remarks</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {stationData.map(({ station, lastAudited, nextScheduled, status, auditorName, remarks }) => (
                        <tr key={station.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{station.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{lastAudited ? lastAudited.toLocaleDateString() : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{nextScheduled ? nextScheduled.toLocaleDateString() : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(status)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{auditorName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{remarks}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default StationAuditList;
