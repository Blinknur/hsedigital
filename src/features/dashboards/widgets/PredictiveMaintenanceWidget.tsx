import React from 'react';

interface Alert {
  stationId: string;
  stationName: string;
  region: string;
  riskScore: number;
  confidence: number;
  predictedDate: string;
  priority: string;
  predictedIssues: string[];
  recommendation: string;
  recentIncidentCount: number;
  avgAuditScore: number;
}

interface PredictiveMaintenanceWidgetProps {
  alerts: Alert[];
  totalAlerts: number;
}

const PredictiveMaintenanceWidget: React.FC<PredictiveMaintenanceWidgetProps> = ({
  alerts,
  totalAlerts
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="mr-2">🔮</span>
            Predictive Maintenance Insights
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            ML-powered predictions • {totalAlerts} total alerts
          </p>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">✅</div>
            <p>No maintenance alerts</p>
            <p className="text-sm">All stations performing normally</p>
          </div>
        ) : (
          alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-4 border-2 rounded-lg ${getPriorityColor(alert.priority)}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">{alert.stationName}</h4>
                  <p className="text-xs text-gray-600">{alert.region}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-white rounded text-xs font-semibold">
                    {alert.priority}
                  </span>
                  <span className="text-xs text-gray-600">
                    {alert.confidence.toFixed(0)}% confidence
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {alert.recommendation}
                </p>
                <p className="text-xs text-gray-600">
                  Predicted date: {formatDate(alert.predictedDate)}
                </p>
              </div>

              {alert.predictedIssues.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Predicted Issues:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {alert.predictedIssues.map((issue, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-1">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-300">
                <div className="flex space-x-4 text-xs">
                  <span className="text-gray-600">
                    Risk Score: <span className="font-semibold">{alert.riskScore}</span>
                  </span>
                  <span className="text-gray-600">
                    Incidents: <span className="font-semibold">{alert.recentIncidentCount}</span>
                  </span>
                  <span className="text-gray-600">
                    Audit: <span className="font-semibold">{alert.avgAuditScore.toFixed(1)}</span>
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalAlerts > alerts.length && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Showing {alerts.length} of {totalAlerts} alerts
          </p>
        </div>
      )}
    </div>
  );
};

export default PredictiveMaintenanceWidget;
