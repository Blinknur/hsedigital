import React, { useState } from 'react';
import { SubscriptionPlan } from '../../types';

interface OnboardingWizardProps {
    email: string;
    onComplete: (data: { name: string; company: string; plan?: SubscriptionPlan }) => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ email, onComplete }) => {
    const [step, setStep] = useState<'plan' | 'details'>(('plan');
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('free');
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const plans = [
        {
            id: 'free' as SubscriptionPlan,
            name: 'Free',
            price: '$0',
            period: 'forever',
            description: 'Perfect for getting started',
            features: [
                '1 station',
                'Basic checklists',
                'Incident reporting',
                'Email support',
                '30-day data retention'
            ],
            limitations: [
                'No audit scheduling',
                'No advanced analytics',
                'No SSO'
            ]
        },
        {
            id: 'pro' as SubscriptionPlan,
            name: 'Professional',
            price: '$49',
            period: '/month',
            description: 'For growing operations',
            features: [
                'Up to 10 stations',
                'Advanced form builder',
                'Audit scheduling & execution',
                'CAPA management',
                'Priority support',
                '1-year data retention',
                'Analytics & reporting'
            ],
            popular: true
        },
        {
            id: 'enterprise' as SubscriptionPlan,
            name: 'Enterprise',
            price: 'Custom',
            period: '',
            description: 'For large organizations',
            features: [
                'Unlimited stations',
                'Custom forms & workflows',
                'SSO & advanced security',
                'Dedicated account manager',
                'Unlimited data retention',
                'API access',
                'Custom integrations',
                'On-premise deployment option'
            ]
        }
    ];

    const handlePlanContinue = () => {
        setStep('details');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !company) return;
        setIsSubmitting(true);
        setTimeout(() => {
            onComplete({ name, company, plan: selectedPlan });
        }, 500);
    };

    const handleSkip = () => {
        onComplete({ name: email.split('@')[0], company: `${email.split('@')[0]}'s Company`, plan: selectedPlan });
    }

    if (step === 'plan') {
        return (
            <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
                <div className="w-full max-w-6xl">
                    <div className="text-center mb-8">
                        <a href="/#/" className="text-3xl font-bold text-slate-800">
                            HSE<span className="text-emerald-500">.Digital</span>
                        </a>
                        <p className="text-slate-500 mt-2">Choose your plan</p>
                    </div>
                    <div className="mb-4">
                        <p className="text-center text-sm font-semibold text-slate-600">Step 1 of 2</p>
                        <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '50%' }}></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`relative bg-white rounded-xl shadow-lg border-2 cursor-pointer transition-all ${
                                    selectedPlan === plan.id
                                        ? 'border-emerald-500 ring-2 ring-emerald-200'
                                        : 'border-slate-200 hover:border-emerald-300'
                                } ${plan.popular ? 'md:scale-105' : ''}`}
                                onClick={() => setSelectedPlan(plan.id)}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                            MOST POPULAR
                                        </span>
                                    </div>
                                )}
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">{plan.name}</h3>
                                    <div className="mb-4">
                                        <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                                        {plan.period && <span className="text-slate-600">{plan.period}</span>}
                                    </div>
                                    <p className="text-sm text-slate-600 mb-4">{plan.description}</p>
                                    <ul className="space-y-3 mb-6">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start text-sm">
                                                <svg className="w-5 h-5 text-emerald-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                        {plan.limitations?.map((limitation, idx) => (
                                            <li key={`lim-${idx}`} className="flex items-start text-sm text-slate-400">
                                                <svg className="w-5 h-5 text-slate-300 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                                <span>{limitation}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {selectedPlan === plan.id && (
                                        <div className="flex items-center justify-center text-emerald-600 font-semibold">
                                            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            Selected
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center">
                        <button
                            onClick={handlePlanContinue}
                            className="px-8 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        );
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
