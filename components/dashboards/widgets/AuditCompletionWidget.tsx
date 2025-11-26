import React from 'react';

interface AuditCompletionWidgetProps {
  completionRate: number;
  period: string;
}

const AuditCompletionWidget: React.FC<AuditCompletionWidgetProps> = ({ completionRate, period }) => {
  const getStatusColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBgColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Audit Completion Rate</h3>
          <p className="text-sm text-gray-600 mt-1">Performance over {period}</p>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="relative">
          <svg className="transform -rotate-90" width="200" height="200">
            <circle
              cx="100"
              cy="100"
              r="70"
              stroke="#e5e7eb"
              strokeWidth="12"
              fill="none"
            />
            <circle
              cx="100"
              cy="100"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={getStatusColor(completionRate)}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${getStatusColor(completionRate)}`}>
              {completionRate.toFixed(1)}%
            </span>
            <span className="text-sm text-gray-600 mt-1">Complete</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Excellent</p>
          <p className="text-sm font-semibold text-green-600">≥90%</p>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Good</p>
          <p className="text-sm font-semibold text-yellow-600">75-89%</p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Needs Improvement</p>
          <p className="text-sm font-semibold text-red-600">&lt;75%</p>
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Current Status:</span>
          <span className={`text-sm font-semibold ${getStatusColor(completionRate)}`}>
            {completionRate >= 90 ? 'Excellent Performance' : completionRate >= 75 ? 'Good Performance' : 'Needs Improvement'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuditCompletionWidget;
