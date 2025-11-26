
import React, { useState } from 'react';
import { User } from '../../types';

interface ProfileSettingsProps {
    user: User;
    onUpdateUser: (user: User) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, onUpdateUser }) => {
    const [formData, setFormData] = useState({
        name: user.name,
        email: user.email,
        phone: '0300-1234567', // Mock default
        title: 'Manager', // Mock default
    });
    const [notificationPrefs, setNotificationPrefs] = useState({
        emailDigest: true,
        realTimeAlerts: true,
        marketing: false,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleToggle = (key: keyof typeof notificationPrefs) => {
        setNotificationPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        // Simulate API call
        setTimeout(() => {
            onUpdateUser({ ...user, name: formData.name, email: formData.email });
            setIsSaving(false);
            setMessage('Profile updated successfully.');
            setTimeout(() => setMessage(''), 3000);
        }, 800);
    };

    return (
        <div className="max-w-4xl">
            <h4 className="text-xl font-semibold mb-6">My Profile</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Avatar */}
                <div className="md:col-span-1 flex flex-col items-center">
                    <div className="relative group cursor-pointer">
                        <div className="w-32 h-32 rounded-full bg-slate-200 flex items-center justify-center text-4xl font-bold text-slate-500 overflow-hidden border-4 border-white shadow-md">
                            {/* Placeholder for actual image */}
                            {formData.name.charAt(0)}
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-3">Allowed: JPG, PNG. Max 1MB.</p>
                </div>

                {/* Right Column: Form */}
                <div className="md:col-span-2 space-y-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <h5 className="text-lg font-medium text-slate-800 border-b pb-2">Personal Information</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full form-input" required />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700">Job Title</label>
                                <input type="text" name="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full form-input" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Email Address</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full form-input bg-slate-100 text-slate-500 cursor-not-allowed" disabled />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Phone Number</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full form-input" />
                            </div>
                        </div>
                         <div className="flex justify-end pt-2">
                             {message && <span className="text-green-600 text-sm font-medium mr-3 self-center animate-pulse">{message}</span>}
                            <button type="submit" disabled={isSaving} className="btn btn-primary disabled:bg-slate-400">
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>

                    <div className="space-y-4">
                        <h5 className="text-lg font-medium text-slate-800 border-b pb-2">Notifications</h5>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Email Digest</p>
                                    <p className="text-xs text-slate-500">Receive a daily summary of compliance activities.</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => handleToggle('emailDigest')}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${notificationPrefs.emailDigest ? 'bg-emerald-600' : 'bg-slate-200'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notificationPrefs.emailDigest ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Real-time Alerts</p>
                                    <p className="text-xs text-slate-500">Get immediate notifications for incidents and critical findings.</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => handleToggle('realTimeAlerts')}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${notificationPrefs.realTimeAlerts ? 'bg-emerald-600' : 'bg-slate-200'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notificationPrefs.realTimeAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <h5 className="text-lg font-medium text-slate-800 border-b pb-2">Security</h5>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                            <div>
                                <p className="text-sm font-medium text-slate-700">Password</p>
                                <p className="text-xs text-slate-500">Last changed 3 months ago</p>
                            </div>
                            <button className="btn btn-secondary text-sm">Change Password</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
