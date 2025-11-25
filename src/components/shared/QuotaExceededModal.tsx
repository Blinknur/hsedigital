import React from 'react';

interface QuotaExceededModalProps {
    isOpen: boolean;
    onClose: () => void;
    resource: string;
    limit: number;
    current: number;
    plan: string;
}

const QuotaExceededModal: React.FC<QuotaExceededModalProps> = ({
    isOpen,
    onClose,
    resource,
    limit,
    current,
    plan
}) => {
    if (!isOpen) return null;

    const handleUpgrade = () => {
        window.location.href = '/#/settings?tab=billing';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                    Quota Limit Reached
                </h2>

                <p className="text-gray-600 text-center mb-6">
                    You've reached the limit for <strong>{resource.replace(/_/g, ' ')}</strong> on your <strong>{plan}</strong> plan.
                </p>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Current usage:</span>
                        <span className="text-lg font-semibold text-gray-900">{current} / {limit}</span>
                    </div>
                </div>

                <p className="text-sm text-gray-600 mb-6 text-center">
                    Upgrade your plan to increase limits and unlock more features.
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpgrade}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        Upgrade Plan
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuotaExceededModal;
