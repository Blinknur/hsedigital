
import React, { useState } from 'react';
import { Station, RiskCategory, AuditFrequency, User, Permission } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';

interface StationsSettingsProps {
    stations: Station[];
    onUpdate: (station: Station) => void;
    onAdd: (station: Omit<Station, 'id' | 'location' | 'organizationId'>) => void;
    onDelete: (id: string) => void;
    currentUser: User;
}

const StationModal = ({ station, onClose, onSave }: { station: Partial<Omit<Station, 'organizationId'>>, onClose: () => void, onSave: (station: Partial<Omit<Station, 'organizationId'>>) => void }) => {
    const [formData, setFormData] = useState({
        ...station,
        isActive: station.isActive === undefined ? true : station.isActive // Default to true for new stations
    });
    const isNew = !station.id;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData({ ...formData, [name]: checked });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h3 className="text-lg font-bold mb-4">{isNew ? 'Add New Station' : 'Edit Station'}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Name</label>
                                <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Brand</label>
                                <input type="text" name="brand" value={formData.brand || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Address</label>
                            <input type="text" name="address" value={formData.address || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700">Region</label>
                                <input type="text" name="region" value={formData.region || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Risk Category</label>
                                <select name="riskCategory" value={formData.riskCategory || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required>
                                    <option value="">Select Category...</option>
                                    {Object.values(RiskCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700">Audit Frequency</label>
                                <select name="auditFrequency" value={formData.auditFrequency || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required>
                                    <option value="">Select Frequency...</option>
                                    {Object.values(AuditFrequency).map(freq => <option key={freq} value={freq}>{freq}</option>)}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300" />
                                    <span className="text-sm font-medium text-slate-700">Station is Active</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg">{isNew ? 'Add Station' : 'Save Changes'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const StationsSettings: React.FC<StationsSettingsProps> = ({ stations, onUpdate, onAdd, onDelete, currentUser }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStation, setEditingStation] = useState<Partial<Station> | null>(null);
    const canManage = usePermissions(currentUser, Permission.ManageStations);

    const handleSave = (station: Partial<Omit<Station, 'organizationId'>>) => {
        if (station.id) {
            onUpdate(station as Station);
        } else {
            onAdd(station as Omit<Station, 'id' | 'location' | 'organizationId'>);
        }
        setIsModalOpen(false);
        setEditingStation(null);
    };
    
    const confirmDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this station?')) {
            onDelete(id);
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xl font-semibold">Manage Stations</h4>
                {canManage && (
                    <button onClick={() => { setEditingStation({}); setIsModalOpen(true); }} className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg">Add New Station</button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Brand</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Region</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Risk Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {stations.map(station => (
                            <tr key={station.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{station.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{station.brand}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{station.region}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{station.riskCategory}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${station.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {station.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                    {canManage && (
                                        <>
                                            <button onClick={() => { setEditingStation(station); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800">Edit</button>
                                            <button onClick={() => confirmDelete(station.id)} className="text-red-600 hover:text-red-800">Delete</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && editingStation && canManage && (
                <StationModal
                    station={editingStation}
                    onClose={() => { setIsModalOpen(false); setEditingStation(null); }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default StationsSettings;
