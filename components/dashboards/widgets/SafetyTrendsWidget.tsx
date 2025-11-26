import React from 'react';

interface Trend {
  period: string;
  incidentCount: number;
  criticalIncidents: number;
  avgAuditScore: number;
  auditCount: number;
}

interface SafetyTrendsWidgetProps {
  trends: {
    trends: Trend[];
    direction: string;
    changePercent: string;
  };
}

const SafetyTrendsWidget: React.FC<SafetyTrendsWidgetProps> = ({ trends }) => {
  const maxIncidents = Math.max(...trends.trends.map(t => t.incidentCount), 1);
  const maxScore = 100;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Safety Trends Analysis</h3>
          <p className="text-sm text-gray-600 mt-1">
            Trend: <span className={`font-semibold ${
              trends.direction === 'improving' ? 'text-green-600' : 
              trends.direction === 'declining' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {trends.direction} ({trends.changePercent}%)
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Incident Count</span>
            <span>Audit Score</span>
          </div>
          <div className="relative h-64">
            <div className="absolute inset-0 flex items-end justify-between space-x-2">
              {trends.trends.map((trend, index) => {
                const incidentHeight = (trend.incidentCount / maxIncidents) * 100;
                const scoreHeight = (trend.avgAuditScore / maxScore) * 100;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex items-end justify-center space-x-1" style={{ height: '100%' }}>
                      <div
                        className="w-1/3 bg-red-500 rounded-t hover:bg-red-600 transition-colors cursor-pointer relative group"
                        style={{ height: `${incidentHeight}%` }}
                        title={`${trend.incidentCount} incidents`}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {trend.incidentCount} incidents
                        </div>
                      </div>
                      <div
                        className="w-1/3 bg-green-500 rounded-t hover:bg-green-600 transition-colors cursor-pointer relative group"
                        style={{ height: `${scoreHeight}%` }}
                        title={`Score: ${trend.avgAuditScore.toFixed(1)}`}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          Score: {trend.avgAuditScore.toFixed(1)}
                        </div>
                      </div>
                      {trend.criticalIncidents > 0 && (
                        <div
                          className="w-1/3 bg-orange-500 rounded-t hover:bg-orange-600 transition-colors cursor-pointer relative group"
                          style={{ height: `${(trend.criticalIncidents / maxIncidents) * 100}%` }}
                          title={`${trend.criticalIncidents} critical`}
                        >
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {trend.criticalIncidents} critical
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mt-2 text-center">
                      {trend.period}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            <span className="text-gray-600">Total Incidents</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
            <span className="text-gray-600">Critical Incidents</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span className="text-gray-600">Audit Score</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyTrendsWidget;
