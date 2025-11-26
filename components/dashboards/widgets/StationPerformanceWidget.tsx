import React, { useState } from 'react';

interface Station {
  id: string;
  name: string;
  region: string;
  brand: string;
  avgAuditScore: number;
  auditCount: number;
  incidentCount: number;
  criticalIncidents: number;
  performanceScore: number;
  riskCategory: string;
}

interface StationPerformanceWidgetProps {
  topPerformers: Station[];
  needsAttention: Station[];
  totalStations: number;
}

const StationPerformanceWidget: React.FC<StationPerformanceWidgetProps> = ({
  topPerformers,
  needsAttention,
  totalStations
}) => {
  const [view, setView] = useState<'top' | 'attention'>('top');

  const displayStations = view === 'top' ? topPerformers : needsAttention;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Station Performance Comparison</h3>
          <p className="text-sm text-gray-600 mt-1">{totalStations} active stations</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('top')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              view === 'top'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Top Performers
          </button>
          <button
            onClick={() => setView('attention')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              view === 'attention'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Needs Attention
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {displayStations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {view === 'top' ? 'No top performers yet' : 'No stations need attention'}
          </div>
        ) : (
          displayStations.map((station, index) => (
            <div
              key={station.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{station.name}</h4>
                    <p className="text-xs text-gray-500">
                      {station.region} • {station.brand}
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(station.performanceScore)}`}>
                  {station.performanceScore.toFixed(0)}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-600">Audit Score</p>
                  <p className="font-semibold text-gray-900">{station.avgAuditScore.toFixed(1)}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-600">Audits</p>
                  <p className="font-semibold text-gray-900">{station.auditCount}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-600">Incidents</p>
                  <p className="font-semibold text-gray-900">{station.incidentCount}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-600">Critical</p>
                  <p className="font-semibold text-red-600">{station.criticalIncidents}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StationPerformanceWidget;
