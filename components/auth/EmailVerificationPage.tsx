import React, { useState, useEffect } from 'react';
import { client } from '../../api/client';

interface EmailVerificationPageProps {
    token?: string;
}

const EmailVerificationPage: React.FC<EmailVerificationPageProps> = ({ token: propToken }) => {
    const [verifying, setVerifying] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const verifyEmail = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const tokenFromUrl = propToken || urlParams.get('token');

            if (!tokenFromUrl) {
                setError('Verification token is missing');
                setVerifying(false);
                return;
            }

            try {
                await client.post('/auth/verify-email', { token: tokenFromUrl });
                setSuccess(true);
                setVerifying(false);
                
                setTimeout(() => {
                    window.location.hash = '#/login';
                }, 2000);
            } catch (err: any) {
                setError(err.message || 'Verification failed. The link may be expired or invalid.');
                setVerifying(false);
            }
        };

        verifyEmail();
    }, [propToken]);

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <a href="/#/" className="text-3xl font-bold text-slate-800">
                        HSE<span className="text-emerald-500">.Digital</span>
                    </a>
                </div>
                
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    {verifying && (
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4 animate-pulse">
                                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Verifying your email...</h2>
                            <p className="text-slate-600">Please wait while we verify your account.</p>
                        </div>
                    )}

                    {success && (
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
                                <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Email verified!</h2>
                            <p className="text-slate-600 mb-4">Your account has been successfully verified.</p>
                            <p className="text-sm text-slate-500">Redirecting to login...</p>
                        </div>
                    )}

                    {error && (
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Verification failed</h2>
                            <p className="text-red-600 mb-4">{error}</p>
                            <div className="space-y-2">
                                <a
                                    href="/#/login"
                                    className="block w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                                >
                                    Go to Login
                                </a>
                                <a
                                    href="/#/resend-verification"
                                    className="block text-sm font-medium text-emerald-600 hover:text-emerald-500"
                                >
                                    Resend verification email
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationPage;