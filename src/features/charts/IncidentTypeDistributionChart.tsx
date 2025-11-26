
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Incident, IncidentType } from '../../types';

interface IncidentTypeDistributionChartProps {
    incidents: Incident[];
}

const COLORS = ['#ef4444', '#f59e0b', '#84cc16', '#3b82f6', '#8b5cf6'];

const IncidentTypeDistributionChart: React.FC<IncidentTypeDistributionChartProps> = ({ incidents }) => {
    const data = Object.values(IncidentType).map(type => ({
        name: type,
        value: incidents.filter(inc => inc.type === type).length,
    })).filter(d => d.value > 0);

    if (data.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-500">No incident data available.</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="value" name="Incidents">
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default IncidentTypeDistributionChart;
