
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChecklistSubmission, ChecklistStatus } from '../../types';

interface ComplianceTrendChartProps {
  submissions: ChecklistSubmission[];
}

const ComplianceTrendChart: React.FC<ComplianceTrendChartProps> = ({ submissions }) => {
  const processData = () => {
    if (submissions.length === 0) return [];
    
    // Determine the time span of the data
    const dates = submissions.map(s => s.submittedAt.getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const timeSpanDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);

    // If timespan is long, group by month
    const shouldGroupByMonth = timeSpanDays > 60;

    const dataByPeriod: { [key: string]: { compliant: number; total: number } } = {};

    submissions.forEach(sub => {
      const date = sub.submittedAt;
      const periodKey = shouldGroupByMonth
        ? date.toLocaleString('default', { month: 'short', year: 'numeric' })
        : date.toLocaleDateString();

      if (!dataByPeriod[periodKey]) {
        dataByPeriod[periodKey] = { compliant: 0, total: 0 };
      }
      // FIX: Property 'items' does not exist on type 'ChecklistSubmission'. Use 'data' instead.
      Object.entries(sub.data).forEach(([key, status]) => {
        if (key === 'submit') return; // Ignore form.io submit button data
        if (status !== ChecklistStatus.NA) {
          dataByPeriod[periodKey].total++;
          if (status === ChecklistStatus.Compliant) {
            dataByPeriod[periodKey].compliant++;
          }
        }
      });
    });

    const sortedPeriods = Object.keys(dataByPeriod)
        .sort((a, b) => {
            // Correctly sort month-year strings or date strings
            const dateA = shouldGroupByMonth ? new Date(`1 ${a}`) : new Date(a);
            const dateB = shouldGroupByMonth ? new Date(`1 ${b}`) : new Date(b);
            return dateA.getTime() - dateB.getTime();
        });


    return sortedPeriods.map(period => ({
        period,
        compliance: (dataByPeriod[period].compliant / dataByPeriod[period].total) * 100,
    }));
  };

  const data = processData();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis unit="%" domain={[0, 100]}/>
        <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
        <Legend />
        <Line type="monotone" dataKey="compliance" stroke="#10b981" strokeWidth={2} activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ComplianceTrendChart;
