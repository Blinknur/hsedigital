

import React, { useState } from 'react';
import { Organization } from '../../types';
import * as api from '../../api/dataService';

interface OrganizationSettingsProps {
    organization: Organization;
    onUpdateOrganization: (org: Organization) => void;
}

const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({ organization, onUpdateOrganization }) => {
    const [name, setName] = useState(organization.name);
    const [message, setMessage] = useState('');
    const [logoUrl, setLogoUrl] = useState(organization.logoUrl || '');
    const [isUploading, setIsUploading] = useState(false);

    const handleSave = () => {
        onUpdateOrganization({ ...organization, name, logoUrl });
        setMessage('Organization details updated.');
        setTimeout(() => setMessage(''), 3000);
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploading(true);
            try {
                const url = await api.uploadFile(e.target.files[0]);
                setLogoUrl(url);
                // Optimistically update org logo if supported by type, else just show preview
            } catch (error) {
                alert('Failed to upload logo.');
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <div className="max-w-3xl">
            <h4 className="text-xl font-semibold mb-6">Organization Settings</h4>

            <div className="space-y-8">
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <h5 className="text-lg font-medium text-slate-800 mb-4">General Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Organization Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full form-input" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Organization ID</label>
                            <input type="text" value={organization.id} disabled className="mt-1 block w-full form-input bg-slate-100 text-slate-500 cursor-not-allowed" />
                        </div>
                    </div>
                    <div className="mt-4">
                         <label className="block text-sm font-medium text-slate-700 mb-2">Company Logo</label>
                         <div className="flex items-center gap-6">
                            <div className="flex items-center justify-center w-full max-w-xs">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 relative overflow-hidden">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Company Logo" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <svg className="w-8 h-8 mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                            <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span></p>
                                            <p className="text-xs text-slate-500">SVG, PNG, JPG (MAX. 800x400px)</p>
                                        </div>
                                    )}
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                            <span className="text-sm font-bold text-emerald-600 animate-pulse">Uploading...</span>
                                        </div>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </label>
                            </div>
                             {logoUrl && (
                                <button onClick={() => setLogoUrl('')} className="text-sm text-red-600 hover:underline">Remove Logo</button>
                            )}
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end items-center">
                        {message && <span className="text-green-600 text-sm font-medium mr-3">{message}</span>}
                        <button onClick={handleSave} className="btn btn-primary">Save Changes</button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <h5 className="text-lg font-medium text-slate-800 mb-2">Subscription</h5>
                    <p className="text-sm text-slate-600 mb-4">Manage your plan, billing details, and invoices.</p>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-md">
                        <div>
                            <p className="font-semibold text-slate-800 capitalize">{organization.subscriptionPlan} Plan</p>
                            <p className="text-xs text-slate-500">Active since Jan 2024</p>
                        </div>
                        <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline">Manage Billing</button>
                    </div>
                </div>

                <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                    <h5 className="text-lg font-bold text-red-800 mb-2">Danger Zone</h5>
                    <p className="text-sm text-red-600 mb-4">Once you delete an organization, there is no going back. Please be certain.</p>
                    <div className="flex justify-end">
                        <button onClick={() => alert('This feature is disabled for this demo.')} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 text-sm">Delete Organization</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizationSettings;