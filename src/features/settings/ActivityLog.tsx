
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { client } from '../../api/client';

interface AuditLogEntry {
    id: string;
    organizationId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string | null;
    changes: any;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
}

interface ActivityLogProps {
    users: User[];
}

const ActivityLog: React.FC<ActivityLogProps> = ({ users }) => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [userFilter, setUserFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [entityTypeFilter, setEntityTypeFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchLogs();
    }, [userFilter, actionFilter, entityTypeFilter, startDate, endDate, page]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {
                page: page.toString(),
                limit: '50'
            };
            
            if (userFilter) params.userId = userFilter;
            if (actionFilter) params.action = actionFilter;
            if (entityTypeFilter) params.entityType = entityTypeFilter;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const data = await client.get<{ 
                logs: AuditLogEntry[], 
                pagination: { page: number, limit: number, total: number, totalPages: number } 
            }>('/admin/audit-logs', params);
            
            setLogs(data.logs);
            setTotalPages(data.pagination.totalPages);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Unknown User';

    const entityTypes = Array.from(new Set(logs.map(log => log.entityType))).sort();
    const actions = Array.from(new Set(logs.map(log => log.action))).sort();

    return (
        <div>
            <div className="mb-6">
                <h4 className="text-xl font-semibold mb-4">Audit Logs</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label htmlFor="user-filter" className="text-xs font-medium text-slate-600">User</label>
                        <select 
                            id="user-filter" 
                            value={userFilter} 
                            onChange={e => { setUserFilter(e.target.value); setPage(1); }} 
                            className="w-full mt-1 form-input text-sm"
                        >
                            <option value="">All Users</option>
                            {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="action-filter" className="text-xs font-medium text-slate-600">Action</label>
                        <select 
                            id="action-filter" 
                            value={actionFilter} 
                            onChange={e => { setActionFilter(e.target.value); setPage(1); }} 
                            className="w-full mt-1 form-input text-sm"
                        >
                            <option value="">All Actions</option>
                            {actions.map(action => <option key={action} value={action}>{action}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="entity-type-filter" className="text-xs font-medium text-slate-600">Entity Type</label>
                        <select 
                            id="entity-type-filter" 
                            value={entityTypeFilter} 
                            onChange={e => { setEntityTypeFilter(e.target.value); setPage(1); }} 
                            className="w-full mt-1 form-input text-sm"
                        >
                            <option value="">All Types</option>
                            {entityTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="start-date" className="text-xs font-medium text-slate-600">Start Date</label>
                        <input 
                            id="start-date"
                            type="date" 
                            value={startDate} 
                            onChange={e => { setStartDate(e.target.value); setPage(1); }} 
                            className="w-full mt-1 form-input text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="text-xs font-medium text-slate-600">End Date</label>
                        <input 
                            id="end-date"
                            type="date" 
                            value={endDate} 
                            onChange={e => { setEndDate(e.target.value); setPage(1); }} 
                            className="w-full mt-1 form-input text-sm"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    <p className="mt-2 text-slate-600">Loading logs...</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Timestamp</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Entity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">IP Address</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                                            {getUserName(log.userId)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                                                log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                                log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {log.entityType}
                                            {log.entityId && <span className="text-slate-400 text-xs ml-2">({log.entityId.substring(0, 8)}...)</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {log.ipAddress || 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-slate-500">
                                            No audit logs match the current filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-4">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-slate-600">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ActivityLog;
