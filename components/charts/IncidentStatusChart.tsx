
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Incident, IncidentStatus } from '../../types';

interface IncidentStatusChartProps {
  incidents: Incident[];
}

const COLORS = {
  [IncidentStatus.Open]: '#ef4444',
  [IncidentStatus.UnderInvestigation]: '#f59e0b',
  [IncidentStatus.Closed]: '#10b981',
};

const IncidentStatusChart: React.FC<IncidentStatusChartProps> = ({ incidents }) => {
  const data = Object.values(IncidentStatus).map(status => ({
    name: status,
    value: incidents.filter(inc => inc.status === status).length,
  })).filter(d => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
          // FIX: Cast percent to a number to avoid arithmetic operation error.
          label={({ name, percent }) => `${name} ${(Number(percent) * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.name as IncidentStatus]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default IncidentStatusChart;
