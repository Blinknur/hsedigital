import React, { useState } from 'react';

interface SignupPageProps {
    onSignup: (email: string) => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onSignup }) => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage('Sending magic link...');
        setTimeout(() => {
            setMessage('Link sent! Check your inbox to continue.');
            setTimeout(() => {
                onSignup(email);
            }, 1000); // Wait a bit before redirecting
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <a href="/#/" className="text-3xl font-bold text-slate-800">
                        HSE<span className="text-emerald-500">.Digital</span>
                    </a>
                    <p className="text-slate-500 mt-2">Create your account</p>
                </div>
                {/* Progress Indicator */}
                <div className="mb-4">
                    <p className="text-center text-sm font-semibold text-slate-600">Step 1 of 2</p>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '50%' }}></div>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    <form onSubmit={handleSubmit} className="space-y-6">
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
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting || !email}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Sending...' : 'Sign Up with Email'}
                            </button>
                        </div>
                    </form>
                    {message && <p className="mt-4 text-center text-sm font-medium text-emerald-700">{message}</p>}
                    <p className="mt-6 text-center text-sm text-slate-500">
                        Already have an account?{' '}
                        <a href="/#/login" className="font-medium text-emerald-600 hover:text-emerald-500">
                            Log in
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
