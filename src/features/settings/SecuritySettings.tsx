
import React, { useState, useEffect } from 'react';
import { Organization } from '../../types';
import { checkBackendHealth } from '../../services/geminiService';

interface SecuritySettingsProps {
    organization: Organization;
    onUpdateOrganization: (organization: Organization) => void;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ organization, onUpdateOrganization }) => {
    const [ssoEnabled, setSsoEnabled] = useState(false);
    const [ssoDomain, setSsoDomain] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

    useEffect(() => {
        setSsoEnabled(organization.ssoConfig?.enabled || false);
        setSsoDomain(organization.ssoConfig?.domain || '');
        setHasChanges(false);

        // Check Backend Health
        checkBackendHealth().then(isHealthy => {
            setBackendStatus(isHealthy ? 'connected' : 'disconnected');
        });
    }, [organization]);

    const handleSave = () => {
        const updatedOrg = {
            ...organization,
            ssoConfig: {
                enabled: ssoEnabled,
                domain: ssoDomain.trim(),
            }
        };
        onUpdateOrganization(updatedOrg);
        setHasChanges(false);
    };

    const handleCancel = () => {
        setSsoEnabled(organization.ssoConfig?.enabled || false);
        setSsoDomain(organization.ssoConfig?.domain || '');
        setHasChanges(false);
    }

    const handleSsoEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSsoEnabled(e.target.checked);
        setHasChanges(true);
    };

    const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSsoDomain(e.target.value);
        setHasChanges(true);
    };

    const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
    const ServerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>;
    const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

    return (
        <div className="max-w-3xl space-y-8">
            
            {/* System Health Section */}
            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center space-x-3 mb-4 border-b pb-4">
                    <ShieldCheckIcon />
                    <h4 className="text-xl font-semibold text-slate-800">System Architecture Health</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-slate-50 rounded-lg border">
                        <p className="text-sm font-medium text-slate-500 mb-1">Backend Connection</p>
                        <div className="flex items-center space-x-2">
                            {backendStatus === 'checking' && <span className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></span>}
                            {backendStatus === 'connected' && <span className="w-3 h-3 bg-green-500 rounded-full"></span>}
                            {backendStatus === 'disconnected' && <span className="w-3 h-3 bg-red-500 rounded-full"></span>}
                            <span className={`font-bold text-lg ${backendStatus === 'connected' ? 'text-slate-800' : 'text-slate-600'}`}>
                                {backendStatus === 'checking' ? 'Checking...' : backendStatus === 'connected' ? 'Secure Backend Active' : 'Backend Unreachable'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            {backendStatus === 'connected' 
                                ? 'API calls are being securely proxied through the Node.js backend.' 
                                : 'Running in detached mode. Data persistence and AI are handled client-side (less secure).'}
                        </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border">
                        <p className="text-sm font-medium text-slate-500 mb-1">AI Security Mode</p>
                        <div className="flex items-center space-x-2">
                            <span className="font-bold text-lg text-slate-800">
                                {backendStatus === 'connected' ? 'Server-Side (Secure)' : 'Client-Side (Development)'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            {backendStatus === 'connected' 
                                ? 'API Keys are hidden from the browser.' 
                                : 'WARNING: API Keys may be exposed in browser network traffic.'}
                        </p>
                    </div>
                </div>
            </div>


            {/* SSO Section */}
            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                    <LockIcon />
                    <h4 className="text-xl font-semibold text-slate-800">Authentication (SSO)</h4>
                </div>
                <p className="text-sm text-slate-500 mb-6">
                    Configure Single Sign-On to allow users to sign in using your corporate Identity Provider (IdP).
                </p>

                <label className="flex items-center space-x-3 cursor-pointer mb-4">
                    <input
                        type="checkbox"
                        checked={ssoEnabled}
                        onChange={handleSsoEnabledChange}
                        className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                    />
                    <span className="font-semibold text-slate-700">Enable Single Sign-On</span>
                </label>

                {ssoEnabled && (
                    <div className="pl-8 space-y-4 border-l-2 border-slate-200">
                        <div>
                            <label htmlFor="ssoDomain" className="block text-sm font-medium text-slate-700">
                                Verified Domain
                            </label>
                            <input
                                type="text"
                                id="ssoDomain"
                                value={ssoDomain}
                                onChange={handleDomainChange}
                                className="mt-1 block w-full md:w-1/2 border-gray-300 rounded-md shadow-sm sm:text-sm p-2"
                                placeholder="e.g., yourcompany.com"
                            />
                            <p className="text-xs text-slate-500 mt-1">Users with emails from this domain will be redirected to your IdP.</p>
                        </div>
                         <div className="bg-slate-100 p-3 rounded text-xs font-mono text-slate-600 space-y-1">
                            <p><strong>Entity ID:</strong> urn:hsix:digital:sso:{organization.id}</p>
                            <p><strong>ACS URL:</strong> https://api.hse.digital/saml/acs</p>
                        </div>
                    </div>
                )}
                
                {hasChanges && (
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={handleCancel} className="btn btn-secondary">Cancel</button>
                        <button onClick={handleSave} className="btn btn-primary">Save Configuration</button>
                    </div>
                )}
            </div>


            {/* Data Encryption Section */}
            <div>
                <div className="flex items-center space-x-3 mb-4">
                    <ServerIcon />
                    <h4 className="text-xl font-semibold text-slate-800">Data Governance</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg border">
                        <h5 className="font-semibold text-slate-800 text-sm">Encryption Standards</h5>
                        <p className="text-xs text-slate-600 mt-1">
                            TLS 1.3 for data in transit.<br/>
                            AES-256 for data at rest in PostgreSQL RDS.
                        </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border">
                         <h5 className="font-semibold text-slate-800 text-sm">Disaster Recovery</h5>
                        <p className="text-xs text-slate-600 mt-1">
                            Automated daily snapshots.<br/>
                            Point-in-time recovery (RPO &lt; 5 min).
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecuritySettings;
