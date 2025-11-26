import React, { useState, useEffect } from 'react';
import KPIWidget from './KPIWidget';

interface Widget {
  id: string;
  widgetType: string;
  title: string;
  config: any;
  position: { x: number; y: number; w: number; h: number };
  isVisible: boolean;
}

interface CustomWidgetGridProps {
  period: string;
}

const CustomWidgetGrid: React.FC<CustomWidgetGridProps> = ({ period }) => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddWidget, setShowAddWidget] = useState(false);

  const availableWidgetTypes = [
    { type: 'kpi', name: 'KPI Card', icon: '📊' },
    { type: 'safety-trends', name: 'Safety Trends', icon: '📈' },
    { type: 'station-performance', name: 'Station Performance', icon: '🏢' },
    { type: 'predictive-maintenance', name: 'Predictive Maintenance', icon: '🔮' },
    { type: 'incident-response', name: 'Incident Response', icon: '⏱️' },
    { type: 'audit-completion', name: 'Audit Completion', icon: '✅' }
  ];

  useEffect(() => {
    fetchWidgets();
  }, []);

  const fetchWidgets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/analytics/widgets', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWidgets(data.widgets);
      }
    } catch (error) {
      console.error('Error fetching widgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const addWidget = async (widgetType: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/analytics/widgets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          widgetType,
          title: availableWidgetTypes.find(w => w.type === widgetType)?.name || widgetType,
          config: {},
          position: { x: 0, y: widgets.length * 3, w: 6, h: 3 }
        })
      });

      if (response.ok) {
        const newWidget = await response.json();
        setWidgets([...widgets, newWidget]);
        setShowAddWidget(false);
      }
    } catch (error) {
      console.error('Error adding widget:', error);
    }
  };

  const removeWidget = async (widgetId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/analytics/widgets/${widgetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setWidgets(widgets.filter(w => w.id !== widgetId));
      }
    } catch (error) {
      console.error('Error removing widget:', error);
    }
  };

  const toggleWidgetVisibility = async (widget: Widget) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/analytics/widgets/${widget.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isVisible: !widget.isVisible
        })
      });

      if (response.ok) {
        setWidgets(widgets.map(w => 
          w.id === widget.id ? { ...w, isVisible: !w.isVisible } : w
        ));
      }
    } catch (error) {
      console.error('Error updating widget:', error);
    }
  };

  const renderWidget = (widget: Widget) => {
    if (!widget.isVisible) return null;

    return (
      <div key={widget.id} className="relative">
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <button
            onClick={() => toggleWidgetVisibility(widget)}
            className="p-1 bg-white rounded shadow hover:bg-gray-100 transition-colors text-xs"
            title="Hide widget"
          >
            👁️
          </button>
          <button
            onClick={() => removeWidget(widget.id)}
            className="p-1 bg-white rounded shadow hover:bg-red-100 transition-colors text-xs"
            title="Remove widget"
          >
            ❌
          </button>
        </div>
        <div className="h-full">
          <KPIWidget
            title={widget.title}
            value="--"
            trend="neutral"
            trendValue="--"
            icon={availableWidgetTypes.find(t => t.type === widget.widgetType)?.icon || '📊'}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Custom Dashboard Layout</h2>
          <p className="text-sm text-gray-600 mt-1">Add and arrange widgets to customize your view</p>
        </div>
        <button
          onClick={() => setShowAddWidget(!showAddWidget)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Widget
        </button>
      </div>

      {showAddWidget && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Widget Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {availableWidgetTypes.map((widgetType) => (
              <button
                key={widgetType.type}
                onClick={() => addWidget(widgetType.type)}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <div className="text-3xl mb-2">{widgetType.icon}</div>
                <div className="text-sm font-medium text-gray-900">{widgetType.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {widgets.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Widgets Added</h3>
          <p className="text-gray-600 mb-4">Start by adding widgets to customize your dashboard</p>
          <button
            onClick={() => setShowAddWidget(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Widget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {widgets.map(renderWidget)}
        </div>
      )}

      {widgets.some(w => !w.isVisible) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            {widgets.filter(w => !w.isVisible).length} hidden widget(s). Click the eye icon to show them.
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomWidgetGrid;
