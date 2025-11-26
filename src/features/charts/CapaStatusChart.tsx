
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Audit, CorrectiveActionStatus } from '../../types';

interface CapaStatusChartProps {
  audits: Audit[];
}

const COLORS = {
  [CorrectiveActionStatus.Open]: '#ef4444',
  [CorrectiveActionStatus.InProgress]: '#f59e0b',
  [CorrectiveActionStatus.Completed]: '#3b82f6',
  [CorrectiveActionStatus.Reviewed]: '#8b5cf6',
  [CorrectiveActionStatus.Approved]: '#10b981',
};

const CapaStatusChart: React.FC<CapaStatusChartProps> = ({ audits }) => {
  const processData = () => {
    const statusCounts: { [key in CorrectiveActionStatus]?: number } = {};

    audits.forEach(audit => {
      audit.findings.forEach(finding => {
        if (finding.correctiveAction) {
          statusCounts[finding.correctiveAction.status] = (statusCounts[finding.correctiveAction.status] || 0) + 1;
        }
      });
    });

    return Object.entries(statusCounts)
      .map(([name, value]) => ({ name: name as CorrectiveActionStatus, value }))
      .filter(d => d.value > 0);
  };
  
  const data = processData();

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500">No CAPAs to display.</div>;
  }

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
            <Cell key={`cell-${index}`} fill={COLORS[entry.name as CorrectiveActionStatus]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CapaStatusChart;
