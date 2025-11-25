import React, { useEffect, useState } from 'react';

interface UsageLimitData {
    current: number;
    limit: number;
}

interface UsageStats {
    plan: {
        name: string;
        subscriptionPlan: string;
    };
    limits: {
        [key: string]: number;
    };
    features: {
        [key: string]: boolean;
    };
    usage: {
        stations: UsageLimitData;
        users: UsageLimitData;
        contractors: UsageLimitData;
        form_definitions: UsageLimitData;
        audits_this_month: UsageLimitData;
        incidents_this_month: UsageLimitData;
        work_permits_this_month: UsageLimitData;
    };
}

const UsageDisplay: React.FC = () => {
    const [stats, setStats] = useState<UsageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUsageStats();
    }, []);

    const fetchUsageStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/usage/current', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch usage stats');
            }

            const data = await response.json();
            setStats(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const getUsagePercentage = (current: number, limit: number): number => {
        if (limit === -1) return 0;
        return Math.min((current / limit) * 100, 100);
    };

    const getUsageColor = (percentage: number): string => {
        if (percentage >= 90) return 'text-red-600';
        if (percentage >= 75) return 'text-yellow-600';
        return 'text-green-600';
    };

    const renderUsageBar = (label: string, data: UsageLimitData) => {
        const percentage = getUsagePercentage(data.current, data.limit);
        const colorClass = getUsageColor(percentage);
        const isUnlimited = data.limit === -1;

        return (
            <div key={label} className="mb-4">
                <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    <span className={`text-sm font-semibold ${colorClass}`}>
                        {isUnlimited ? `${data.current} / Unlimited` : `${data.current} / ${data.limit}`}
                    </span>
                </div>
                {!isUnlimited && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className={`h-2.5 rounded-full ${
                                percentage >= 90 ? 'bg-red-600' :
                                percentage >= 75 ? 'bg-yellow-500' :
                                'bg-green-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                        ></div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return <div className="p-4 text-center">Loading usage data...</div>;
    }

    if (error) {
        return <div className="p-4 text-red-600">Error: {error}</div>;
    }

    if (!stats) {
        return <div className="p-4 text-gray-600">No usage data available</div>;
    }

    const showUpgradePrompt = Object.values(stats.usage).some(
        (data) => data.limit !== -1 && getUsagePercentage(data.current, data.limit) >= 90
    );

    return (
        <div className="bg-white shadow-lg rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Usage & Quotas</h2>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                    {stats.plan.name} Plan
                </span>
            </div>

            {showUpgradePrompt && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Approaching Limits</h3>
                    <p className="text-sm text-yellow-700 mb-3">
                        You're nearing your plan limits. Upgrade to continue using all features without interruption.
                    </p>
                    <button className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition">
                        Upgrade Plan
                    </button>
                </div>
            )}

            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Resources</h3>
                {renderUsageBar('Stations', stats.usage.stations)}
                {renderUsageBar('Users', stats.usage.users)}
                {renderUsageBar('Contractors', stats.usage.contractors)}
                {renderUsageBar('Form Definitions', stats.usage.form_definitions)}
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Monthly Activity</h3>
                {renderUsageBar('Audits This Month', stats.usage.audits_this_month)}
                {renderUsageBar('Incidents This Month', stats.usage.incidents_this_month)}
                {renderUsageBar('Work Permits This Month', stats.usage.work_permits_this_month)}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Features</h3>
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(stats.features).map(([feature, enabled]) => (
                        <div key={feature} className="flex items-center">
                            <span className={`mr-2 ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
                                {enabled ? '✓' : '✗'}
                            </span>
                            <span className="text-sm text-gray-700 capitalize">
                                {feature.replace(/_/g, ' ')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UsageDisplay;
