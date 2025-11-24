import React, { useState } from 'react';

interface OnboardingWizardProps {
    email: string;
    onComplete: (data: { name: string; company: string }) => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ email, onComplete }) => {
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !company) return;
        setIsSubmitting(true);
        // Simulate a small delay for better UX
        setTimeout(() => {
            onComplete({ name, company });
        }, 500);
    };

    const handleSkip = () => {
        onComplete({ name: email.split('@')[0], company: `${email.split('@')[0]}'s Company` });
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                     <a href="/#/" className="text-3xl font-bold text-slate-800">
                        HSE<span className="text-emerald-500">.Digital</span>
                    </a>
                    <p className="text-slate-500 mt-2">Tell us a bit about yourself</p>
                </div>
                 {/* Progress Indicator */}
                 <div className="mb-4">
                    <p className="text-center text-sm font-semibold text-slate-600">Step 2 of 2</p>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                                Email
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    disabled
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm bg-slate-100 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="name"  className="block text-sm font-medium text-slate-700">
                                Full Name
                            </label>
                            <div className="mt-1">
                                <input
                                    id="name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                    placeholder="e.g. Aamir Khan"
                                />
                            </div>
                        </div>
                        
                         <div>
                            <label htmlFor="company"  className="block text-sm font-medium text-slate-700">
                                Company Name
                            </label>
                            <div className="mt-1">
                                <input
                                    id="company"
                                    type="text"
                                    autoComplete="organization"
                                    required
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                    placeholder="e.g. Total Parco Pakistan"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting || !name || !company}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Setting up...' : 'Complete Setup'}
                            </button>
                        </div>
                    </form>
                    <div className="mt-4 text-center">
                        <button onClick={handleSkip} className="text-sm font-medium text-slate-500 hover:text-slate-700">Skip for now</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingWizard;
