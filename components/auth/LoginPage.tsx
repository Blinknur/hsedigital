
import React, { useState } from 'react';
import { Organization } from '../../types';

interface LoginPageProps {
    onLogin: (email: string) => void;
    isLoading: boolean;
    organizations: Organization[];
    onSsoLogin: (email: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isLoading, organizations, onSsoLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [step, setStep] = useState<'initial' | 'sso' | 'password'>('initial');
    const [ssoOrgName, setSsoOrgName] = useState('');

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const domain = email.split('@')[1];
        if (!domain) return;

        const ssoOrg = organizations.find(org => org.ssoConfig?.enabled && org.ssoConfig.domain.toLowerCase() === domain.toLowerCase());

        if (ssoOrg) {
            setSsoOrgName(ssoOrg.name);
            setStep('sso');
        } else {
            setStep('password');
        }
    };
    
    const handleSsoLogin = () => {
        onSsoLogin(email);
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(email);
    };
    
    const resetFlow = () => {
        setStep('initial');
        setPassword('');
        setSsoOrgName('');
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                     <h1 className="text-3xl font-bold text-slate-800">
                        HSE<span className="text-emerald-500">.Digital</span>
                    </h1>
                    <p className="text-slate-500 mt-2">Sign in to your compliance dashboard</p>
                </div>
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    {step === 'initial' && (
                        <form onSubmit={handleEmailSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                                    Email address
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                        placeholder="you@company.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading || !email}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-slate-400"
                                >
                                    Continue
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 'sso' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <p className="text-sm text-slate-500">Your organization</p>
                                <p className="font-semibold text-slate-800">{ssoOrgName}</p>
                                <p className="text-sm text-slate-500">uses Single Sign-On.</p>
                            </div>
                            <div>
                                <button onClick={handleSsoLogin} className="w-full flex justify-center items-center py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
                                    Sign in with SSO
                                </button>
                            </div>
                             <div className="text-center">
                                <button onClick={resetFlow} className="text-sm font-medium text-emerald-600 hover:text-emerald-500">
                                    Back
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {step === 'password' && (
                         <form onSubmit={handlePasswordSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="email-display" className="block text-sm font-medium text-slate-700">
                                    Email address
                                </label>
                                <div className="mt-1 relative">
                                    <input
                                        id="email-display"
                                        type="email"
                                        value={email}
                                        disabled
                                        className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm bg-slate-50 sm:text-sm"
                                    />
                                     <button type="button" onClick={resetFlow} className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-500">
                                        Change
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="password"  className="block text-sm font-medium text-slate-700">
                                    Password
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                             <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-slate-400"
                                >
                                    {isLoading ? 'Signing in...' : 'Sign in'}
                                </button>
                            </div>
                         </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
