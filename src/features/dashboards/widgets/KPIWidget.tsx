import React from 'react';

interface KPIWidgetProps {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  icon: string;
}

const KPIWidget: React.FC<KPIWidgetProps> = ({ title, value, trend, trendValue, icon }) => {
  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50'
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="space-y-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${trendColors[trend]}`}>
          <span className="mr-1">{trendIcons[trend]}</span>
          {trendValue}
        </div>
      </div>
    </div>
  );
};

export default KPIWidget;
