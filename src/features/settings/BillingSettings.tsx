import React, { useState, useEffect } from 'react';
import { Organization, SubscriptionPlan, User, Station } from '../../types';
import PlanCard from './PlanCard';
import UpgradeModal from './UpgradeModal';
import { client } from '../../api/client';

interface BillingSettingsProps {
    organization: Organization;
    onUpdateOrganization: (organization: Organization) => void;
    users: User[];
    stations: Station[];
    // FIX: Add onManageSubscription prop to handle button clicks.
    onManageSubscription: () => void;
}

export const plans = {
    free: {
        name: 'Starter',
        price: 'Free',
        priceNumeric: 0,
        features: ['1 Station', 'Up to 5 Users', 'Core Compliance Features', 'Incident Reporting'],
        limits: { users: 5, stations: 1 },
    },
    pro: {
        name: 'Professional',
        price: '$99',
        priceNumeric: 99,
        features: ['Up to 10 Stations', 'Up to 25 Users', 'AI-Powered Analytics', 'BI Dashboard', 'Priority Support'],
        limits: { users: 25, stations: 10 },
    },
    enterprise: {
        name: 'Enterprise',
        price: 'Custom',
        priceNumeric: -1, // Indicates custom pricing
        features: ['Unlimited Stations & Users', 'Single Sign-On (SSO)', 'Dedicated Account Manager', 'Custom Integrations'],
        limits: { users: Infinity, stations: Infinity },
    }
};

const BillingSettings: React.FC<BillingSettingsProps> = ({ organization, onUpdateOrganization, users, stations, onManageSubscription }) => {
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const [isLoadingPortal, setIsLoadingPortal] = useState(false);
    const [isProcessingUpgrade, setIsProcessingUpgrade] = useState(false);

    const currentPlan = organization.subscriptionPlan;
    const usage = {
        users: users.length,
        stations: stations.length,
    };

    // Check for Success/Cancel from Stripe Redirect
    useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes('?')) {
             const queryString = hash.split('?')[1];
             const params = new URLSearchParams(queryString);
             
             if (params.get('success') === 'true') {
                const plan = params.get('plan') as SubscriptionPlan;
                if (plan && plans[plan]) {
                    // Optimistic Update
                    onUpdateOrganization({ ...organization, subscriptionPlan: plan });
                    alert(`Payment successful! You have been upgraded to the ${plans[plan].name} plan.`);
                }
                // Clean URL
                window.history.replaceState(null, '', window.location.pathname + '#/settings');
             }
             
             if (params.get('canceled') === 'true') {
                 alert('Payment was canceled.');
                 window.history.replaceState(null, '', window.location.pathname + '#/settings');
             }
        }
    }, [organization, onUpdateOrganization]);

    const handleUpgradeClick = (plan: SubscriptionPlan) => {
        setSelectedPlan(plan);
        setIsUpgradeModalOpen(true);
    };

    const handleConfirmUpgrade = async () => {
        if (!selectedPlan) return;
        setIsProcessingUpgrade(true);

        try {
            // Call backend to create Stripe Checkout Session
            const response = await client.post<{ url: string }>('/billing/upgrade', { planId: selectedPlan });
            
            if (response.url) {
                 // If it's a mock URL (test environment), simulate the flow
                 if (response.url.includes('mock-pay')) {
                     setTimeout(() => {
                        onUpdateOrganization({ ...organization, subscriptionPlan: selectedPlan });
                        alert(`(Demo) Successfully subscribed to the ${plans[selectedPlan].name} plan!`);
                        setIsProcessingUpgrade(false);
                        setIsUpgradeModalOpen(false);
                        setSelectedPlan(null);
                     }, 1500);
                 } else {
                     // Real Stripe Redirect
                     window.location.href = response.url;
                 }
            }
        } catch (error) {
            console.error("Upgrade failed", error);
            alert("Failed to initiate upgrade session. Please try again.");
            setIsProcessingUpgrade(false);
            setIsUpgradeModalOpen(false);
        }
    };
    
    const handleOpenPortal = async () => {
        setIsLoadingPortal(true);
        try {
            // Try to get a real portal link from the backend
            const response = await client.post<{url: string}>('/billing/portal', {});
            if (response.url) {
                // Mock check for demo environment
                if (response.url.includes('test_123')) {
                    alert("Opening Customer Billing Portal (Simulated).");
                } else {
                    window.location.href = response.url;
                }
            } else {
                alert('Billing portal is not configured in this demo environment.');
            }
        } catch (e) {
            console.warn("Billing portal error:", e);
            // Fallback for demo
            onManageSubscription();
        } finally {
            setIsLoadingPortal(false);
        }
    };

    const UsageMeter = ({ label, used, limit }: { label: string, used: number, limit: number }) => {
        const percentage = limit === Infinity ? 0 : Math.min((used / limit) * 100, 100);
        const isOverLimit = used > limit;
        return (
            <div>
                <div className="flex justify-between items-baseline">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <span className={`text-sm font-semibold ${isOverLimit ? 'text-red-600' : 'text-slate-500'}`}>
                        {used} / {limit === Infinity ? 'Unlimited' : limit}
                    </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                    <div
                        className={`h-2 rounded-full ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
            </div>
        );
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-semibold">Billing &amp; Subscription</h4>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Current Plan & Usage */}
                <div className="lg:col-span-1 p-6 bg-slate-50 rounded-lg border">
                    <h5 className="font-semibold mb-1 text-slate-800">Current Plan</h5>
                    <p className="font-bold text-2xl text-emerald-600 capitalize mb-4">{plans[currentPlan].name}</p>
                    
                    <h5 className="font-semibold mb-2 text-slate-800 mt-6">Usage</h5>
                    <div className="space-y-4">
                        <UsageMeter label="Users" used={usage.users} limit={plans[currentPlan].limits.users} />
                        <UsageMeter label="Stations" used={usage.stations} limit={plans[currentPlan].limits.stations} />
                    </div>

                    <div className="mt-6 pt-6 border-t">
                        <p className="text-xs text-slate-500">
                            To manage payment methods or view invoices, please visit your billing portal.
                        </p>
                        <button onClick={handleOpenPortal} disabled={isLoadingPortal} className="btn btn-secondary w-full mt-2 text-sm">
                            {isLoadingPortal ? 'Loading...' : 'Manage Billing'}
                        </button>
                    </div>
                </div>

                {/* Plan Options */}
                <div className="lg:col-span-2">
                    <h5 className="font-semibold text-slate-800 mb-4">Available Plans</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <PlanCard 
                            planKey="pro"
                            currentPlan={currentPlan}
                            onSelect={handleUpgradeClick}
                        />
                         <PlanCard 
                            planKey="enterprise"
                            currentPlan={currentPlan}
                            onSelect={() => alert('Please contact sales to discuss enterprise options.')}
                        />
                    </div>
                </div>
            </div>

            {isUpgradeModalOpen && selectedPlan && (
                <UpgradeModal
                    fromPlan={currentPlan}
                    toPlan={selectedPlan}
                    onClose={() => setIsUpgradeModalOpen(false)}
                    onConfirm={handleConfirmUpgrade}
                />
            )}
            
            {isProcessingUpgrade && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                    <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-800 font-semibold">Processing Upgrade...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingSettings;