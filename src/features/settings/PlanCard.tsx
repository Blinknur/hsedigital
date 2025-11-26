
import React from 'react';
import { SubscriptionPlan } from '../../types';
import { plans } from './BillingSettings';

interface PlanCardProps {
    planKey: 'pro' | 'enterprise';
    currentPlan: SubscriptionPlan;
    onSelect: (plan: SubscriptionPlan) => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ planKey, currentPlan, onSelect }) => {
    const plan = plans[planKey];
    const isCurrent = currentPlan === planKey;
    const isUpgrade = !isCurrent && (plan.priceNumeric > plans[currentPlan].priceNumeric || plan.priceNumeric === -1);

    const getButton = () => {
        if (isCurrent) {
            return <button className="btn btn-secondary w-full" disabled>Current Plan</button>;
        }
        if (isUpgrade) {
            return <button onClick={() => onSelect(planKey)} className="btn btn-primary w-full">Upgrade to {plan.name}</button>;
        }
        return <button onClick={() => onSelect(planKey)} className="btn btn-secondary w-full">Downgrade</button>;
    };

    return (
        <div className={`p-6 rounded-lg border-2 flex flex-col ${isCurrent ? 'bg-emerald-50 border-emerald-300' : 'bg-white hover:border-slate-300'}`}>
            <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
            <p className="text-3xl font-extrabold my-3">
                {plan.price}
                {plan.priceNumeric > 0 && <span className="text-base font-medium text-slate-500"> / mo</span>}
            </p>
            <ul className="space-y-2 text-sm text-slate-600 flex-grow mb-6">
                {plan.features.map(feature => (
                    <li key={feature} className="flex items-start">
                        <svg className="w-4 h-4 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>
            {getButton()}
        </div>
    );
};

export default PlanCard;
