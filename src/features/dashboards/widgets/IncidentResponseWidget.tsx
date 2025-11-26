import React from 'react';

interface ResponseTimes {
  average: number;
  bySeverity: Record<string, number>;
  total: number;
}

interface IncidentResponseWidgetProps {
  responseTimes: ResponseTimes;
}

const IncidentResponseWidget: React.FC<IncidentResponseWidgetProps> = ({ responseTimes }) => {
  const severityOrder = ['Critical', 'High', 'Medium', 'Low'];
  const severityColors: Record<string, string> = {
    Critical: 'bg-red-500',
    High: 'bg-orange-500',
    Medium: 'bg-yellow-500',
    Low: 'bg-blue-500'
  };

  const getTargetTime = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 4;
      case 'High':
        return 12;
      case 'Medium':
        return 24;
      case 'Low':
        return 48;
      default:
        return 24;
    }
  };

  const getPerformanceStatus = (actual: number, target: number) => {
    if (actual <= target) return 'good';
    if (actual <= target * 1.5) return 'warning';
    return 'poor';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Incident Response Times</h3>
          <p className="text-sm text-gray-600 mt-1">
            Average: <span className="font-semibold">{responseTimes.average.toFixed(1)} hours</span> • {responseTimes.total} resolved
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {severityOrder.map((severity) => {
          const time = responseTimes.bySeverity[severity] || 0;
          const target = getTargetTime(severity);
          const status = getPerformanceStatus(time, target);
          const percentage = Math.min((time / (target * 2)) * 100, 100);

          return (
            <div key={severity} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded ${severityColors[severity]}`}></div>
                  <span className="text-sm font-medium text-gray-700">{severity}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    {time > 0 ? `${time.toFixed(1)}h` : 'N/A'}
                  </span>
                  {time > 0 && (
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        status === 'good'
                          ? 'bg-green-100 text-green-700'
                          : status === 'warning'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      Target: {target}h
                    </span>
                  )}
                </div>
              </div>
              {time > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      status === 'good'
                        ? 'bg-green-500'
                        : status === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600">On Target</p>
            <p className="text-lg font-bold text-green-600">
              {severityOrder.filter(
                s => responseTimes.bySeverity[s] > 0 && 
                getPerformanceStatus(responseTimes.bySeverity[s], getTargetTime(s)) === 'good'
              ).length}
            </p>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600">Delayed</p>
            <p className="text-lg font-bold text-yellow-600">
              {severityOrder.filter(
                s => responseTimes.bySeverity[s] > 0 && 
                getPerformanceStatus(responseTimes.bySeverity[s], getTargetTime(s)) === 'warning'
              ).length}
            </p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600">Critical</p>
            <p className="text-lg font-bold text-red-600">
              {severityOrder.filter(
                s => responseTimes.bySeverity[s] > 0 && 
                getPerformanceStatus(responseTimes.bySeverity[s], getTargetTime(s)) === 'poor'
              ).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentResponseWidget;
