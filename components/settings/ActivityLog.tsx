
import React, { useState, useMemo } from 'react';
import { ActivityLogEntry, User, ActivityType } from '../../types';

interface ActivityLogProps {
    logs: ActivityLogEntry[];
    users: User[];
}

const ActivityLog: React.FC<ActivityLogProps> = ({ logs, users }) => {
    const [userFilter, setUserFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');

    const filteredLogs = useMemo(() => {
        return logs
            .filter(log => {
                const userMatch = !userFilter || log.userId === userFilter;
                const actionMatch = !actionFilter || log.actionType === actionFilter;
                return userMatch && actionMatch;
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [logs, userFilter, actionFilter]);

    const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Unknown User';

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                <h4 className="text-xl font-semibold">Activity Log</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="user-filter" className="text-xs font-medium text-slate-600">Filter by User</label>
                        <select id="user-filter" value={userFilter} onChange={e => setUserFilter(e.target.value)} className="w-full mt-1 form-input text-sm">
                            <option value="">All Users</option>
                            {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="action-filter" className="text-xs font-medium text-slate-600">Filter by Action</label>
                        <select id="action-filter" value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="w-full mt-1 form-input text-sm">
                            <option value="">All Actions</option>
                            {Object.values(ActivityType).map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Timestamp</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredLogs.map(log => (
                            <tr key={log.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{getUserName(log.userId)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">{log.actionType}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">{log.details}</td>
                            </tr>
                        ))}
                         {filteredLogs.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-8 text-slate-500">
                                    No activity logs match the current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ActivityLog;
