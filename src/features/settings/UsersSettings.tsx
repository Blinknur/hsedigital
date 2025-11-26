
import React, { useState } from 'react';
import { User, UserRole, Station, Permission } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';

interface UsersSettingsProps {
    users: User[];
    stations: Station[];
    onUpdate: (user: User) => void;
    onAdd: (user: Omit<User, 'id' | 'organizationId'>) => void;
    onDelete: (id: string) => void;
    currentUser: User;
}

const UserModal = ({ user, stations, onClose, onSave }: { user: Partial<User>, stations: Station[], onClose: () => void, onSave: (user: Partial<User>) => void }) => {
    const [formData, setFormData] = useState({
        ...user,
        assignedStationIds: user.assignedStationIds || []
    });
    const isNew = !user.id;
    const selectedRole = formData.role as UserRole;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleStationAssignmentChange = (stationId: string) => {
        if (selectedRole === UserRole.StationManager) {
            setFormData(prev => ({ ...prev, assignedStationIds: [stationId] }));
        } else {
            setFormData(prev => {
                const currentIds = prev.assignedStationIds || [];
                const newIds = currentIds.includes(stationId)
                    ? currentIds.filter(id => id !== stationId)
                    : [...currentIds, stationId];
                return { ...prev, assignedStationIds: newIds };
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h3 className="text-lg font-bold mb-4">{isNew ? 'Add New User' : 'Edit User'}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Name</label>
                                <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700">Email</label>
                                <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Role</label>
                            <select name="role" value={formData.role || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required>
                                <option value="">Select a role</option>
                                {Object.values(UserRole).filter(r => r !== UserRole.Admin).map(role => <option key={role} value={role}>{role}</option>)}
                            </select>
                        </div>

                        {selectedRole === UserRole.StationManager && (
                             <div>
                                <label className="block text-sm font-medium text-slate-700">Assigned Station</label>
                                <select value={formData.assignedStationIds?.[0] || ''} onChange={e => handleStationAssignmentChange(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required>
                                    <option value="">Select station...</option>
                                    {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        )}
                        {(selectedRole === UserRole.ComplianceManager || selectedRole === UserRole.Auditor) && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Assigned Stations</label>
                                <div className="mt-2 border rounded-md max-h-48 overflow-y-auto p-2 space-y-1">
                                    {stations.map(s => (
                                        <label key={s.id} className="flex items-center space-x-2 p-1 rounded-md hover:bg-slate-100">
                                            <input type="checkbox" checked={(formData.assignedStationIds || []).includes(s.id)} onChange={() => handleStationAssignmentChange(s.id)} className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300" />
                                            <span>{s.name} ({s.region})</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg">{isNew ? 'Add User' : 'Save Changes'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const UsersSettings: React.FC<UsersSettingsProps> = ({ users, stations, onUpdate, onAdd, onDelete, currentUser }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
    const canManage = usePermissions(currentUser, Permission.ManageUsers);

    const handleSave = (user: Partial<User>) => {
        if (user.id) {
            onUpdate(user as User);
        } else {
            onAdd(user as Omit<User, 'id' | 'organizationId'>);
        }
        setIsModalOpen(false);
        setEditingUser(null);
    };
    
    const confirmDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            onDelete(id);
        }
    }

    const getStationNames = (assignedIds?: string[]) => {
        if (!assignedIds || assignedIds.length === 0) return 'N/A';
        return assignedIds.map(id => stations.find(s => s.id === id)?.name || 'Unknown').join(', ');
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xl font-semibold">Manage Users</h4>
                {canManage && (
                    <button onClick={() => { setEditingUser({}); setIsModalOpen(true); }} className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg">Add New User</button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assignment(s)</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{user.role}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{getStationNames(user.assignedStationIds)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                    {canManage && (
                                        <>
                                            <button onClick={() => { setEditingUser(user); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800">Edit</button>
                                            <button onClick={() => confirmDelete(user.id)} className="text-red-600 hover:text-red-800">Delete</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && editingUser && canManage && (
                <UserModal
                    user={editingUser}
                    stations={stations}
                    onClose={() => { setIsModalOpen(false); setEditingUser(null); }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default UsersSettings;
