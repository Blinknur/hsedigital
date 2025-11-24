
import React from 'react';
import { ICONS } from '../../constants';
import { View } from '../../types';
import Card from './Card';

interface UpgradePromptProps {
    featureName: string;
    setCurrentView: (view: View) => void;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ featureName, setCurrentView }) => {
    return (
        <div className="p-6 lg:p-8 flex items-center justify-center h-full">
            <Card className="max-w-lg text-center">
                <div className="mx-auto w-12 h-12 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-full">
                    {React.cloneElement(ICONS.ai, { className: 'w-7 h-7' })}
                </div>
                <h2 className="mt-4 text-2xl font-bold text-slate-800">Upgrade to Access {featureName}</h2>
                <p className="mt-2 text-slate-600">
                    The {featureName} is a premium feature available on our Professional and Enterprise plans. Unlock powerful insights and advanced capabilities by upgrading your subscription.
                </p>
                <div className="mt-6">
                    <button
                        onClick={() => setCurrentView('settings')}
                        className="btn btn-primary"
                    >
                        View Upgrade Options
                    </button>
                    <p className="text-xs text-slate-500 mt-3">You can manage your subscription in the "Billing" tab of your settings.</p>
                </div>
            </Card>
        </div>
    );
};

export default UpgradePrompt;
