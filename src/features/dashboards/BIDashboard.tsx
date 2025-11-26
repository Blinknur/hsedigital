import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/Card';
import KPIWidget from './widgets/KPIWidget';
import SafetyTrendsWidget from './widgets/SafetyTrendsWidget';
import StationPerformanceWidget from './widgets/StationPerformanceWidget';
import PredictiveMaintenanceWidget from './widgets/PredictiveMaintenanceWidget';
import IncidentResponseWidget from './widgets/IncidentResponseWidget';
import AuditCompletionWidget from './widgets/AuditCompletionWidget';
import CustomWidgetGrid from './widgets/CustomWidgetGrid';

interface DashboardData {
  period: { start: string; end: string };
  kpis: {
    auditCompletionRate: number;
    incidentResponseTimes: {
      average: number;
      bySeverity: Record<string, number>;
      total: number;
    };
    safetyScore: number;
    totalIncidents: number;
    openIncidents: number;
    criticalIncidents: number;
    topPerformingStations: number;
    stationsNeedingAttention: number;
  };
  safetyTrends: {
    trends: Array<{
      period: string;
      incidentCount: number;
      criticalIncidents: number;
      avgAuditScore: number;
      auditCount: number;
    }>;
    direction: string;
    changePercent: string;
  };
  stationPerformance: {
    topPerformers: Array<any>;
    needsAttention: Array<any>;
    totalStations: number;
  };
  predictiveMaintenance: {
    alerts: Array<any>;
    totalAlerts: number;
  };
}

const BIDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'custom'>('overview');

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/analytics/dashboard-data?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/analytics/export?format=${format}&period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting data:', err);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          <p className="font-semibold">Error loading dashboard</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Intelligence Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive analytics and predictive insights</p>
        </div>
        <div className="flex gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-4 py-2 rounded-lg ${
                viewMode === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('custom')}
              className={`px-4 py-2 rounded-lg ${
                viewMode === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              Custom Layout
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Export CSV
            </button>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {viewMode === 'overview' && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPIWidget
              title="Audit Completion Rate"
              value={`${data.kpis.auditCompletionRate.toFixed(1)}%`}
              trend={data.kpis.auditCompletionRate >= 80 ? 'up' : 'down'}
              trendValue={`${data.kpis.auditCompletionRate >= 80 ? '+' : ''}${(data.kpis.auditCompletionRate - 80).toFixed(1)}%`}
              icon="📋"
            />
            <KPIWidget
              title="Safety Score"
              value={data.kpis.safetyScore.toFixed(1)}
              trend={data.safetyTrends.direction === 'improving' ? 'up' : data.safetyTrends.direction === 'declining' ? 'down' : 'neutral'}
              trendValue={`${data.safetyTrends.changePercent}% ${data.safetyTrends.direction}`}
              icon="🛡️"
            />
            <KPIWidget
              title="Avg Response Time"
              value={`${data.kpis.incidentResponseTimes.average.toFixed(1)}h`}
              trend={data.kpis.incidentResponseTimes.average < 24 ? 'up' : 'down'}
              trendValue={`${data.kpis.incidentResponseTimes.total} incidents`}
              icon="⏱️"
            />
            <KPIWidget
              title="Critical Incidents"
              value={data.kpis.criticalIncidents.toString()}
              trend={data.kpis.criticalIncidents === 0 ? 'up' : 'down'}
              trendValue={`${data.kpis.openIncidents} open`}
              icon="🚨"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AuditCompletionWidget 
              completionRate={data.kpis.auditCompletionRate}
              period={period}
            />
            <IncidentResponseWidget 
              responseTimes={data.kpis.incidentResponseTimes}
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <SafetyTrendsWidget trends={data.safetyTrends} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StationPerformanceWidget
              topPerformers={data.stationPerformance.topPerformers}
              needsAttention={data.stationPerformance.needsAttention}
              totalStations={data.stationPerformance.totalStations}
            />
            <PredictiveMaintenanceWidget
              alerts={data.predictiveMaintenance.alerts}
              totalAlerts={data.predictiveMaintenance.totalAlerts}
            />
          </div>
        </>
      )}

      {viewMode === 'custom' && (
        <CustomWidgetGrid period={period} />
      )}
    </div>
  );
};

export default BIDashboard;
