
import React from 'react';
import { SubscriptionPlan } from '../../types';
import { plans } from './BillingSettings';

interface UpgradeModalProps {
    fromPlan: SubscriptionPlan;
    toPlan: SubscriptionPlan;
    onClose: () => void;
    onConfirm: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ fromPlan, toPlan, onClose, onConfirm }) => {
    const from = plans[fromPlan];
    const to = plans[toPlan];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-2 text-slate-800">Confirm Your Upgrade</h3>
                <p className="text-slate-600 mb-4">You are about to upgrade your subscription. Please review the changes below.</p>
                
                <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-600">Current Plan:</span>
                        <span className="font-semibold">{from.name}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-600">New Plan:</span>
                        <span className="font-semibold text-emerald-600">{to.name}</span>
                    </div>
                     <div className="flex justify-between items-center border-t pt-3 mt-3">
                        <span className="font-medium text-slate-600">New Monthly Rate:</span>
                        <span className="font-bold text-xl text-emerald-700">{to.price}</span>
                    </div>
                </div>

                <div className="mt-4">
                    <p className="text-xs text-slate-500">
                        By confirming, your new plan will be activated immediately. A prorated charge will be applied to your next invoice.
                    </p>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={onConfirm} className="btn btn-primary">Confirm Upgrade</button>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
