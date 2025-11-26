
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Station, ChecklistSubmission, ChecklistStatus } from '../../types';

interface RegionalComplianceComparisonChartProps {
    submissions: ChecklistSubmission[];
    stations: Station[];
}

const RegionalComplianceComparisonChart: React.FC<RegionalComplianceComparisonChartProps> = ({ submissions, stations }) => {
    const processData = () => {
        const regionalStats: { [key: string]: { compliant: number; total: number } } = {};

        submissions.forEach(submission => {
            const station = stations.find(s => s.id === submission.stationId);
            if (!station) return;

            const region = station.region;
            if (!regionalStats[region]) {
                regionalStats[region] = { compliant: 0, total: 0 };
            }

            // FIX: Property 'items' does not exist on type 'ChecklistSubmission'. Use 'data' instead.
            Object.values(submission.data).forEach(status => {
                if (typeof status === 'string' && status !== ChecklistStatus.NA) {
                    regionalStats[region].total++;
                    if (status === ChecklistStatus.Compliant) {
                        regionalStats[region].compliant++;
                    }
                }
            });
        });

        return Object.entries(regionalStats)
            .map(([name, stats]) => ({
                name,
                compliance: stats.total > 0 ? (stats.compliant / stats.total) * 100 : 0,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    };

    const data = processData();

    if (data.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-500">No regional data to compare.</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="compliance" name="Compliance">
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.compliance < 80 ? '#ef4444' : entry.compliance < 95 ? '#f59e0b' : '#10b981'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default RegionalComplianceComparisonChart;
