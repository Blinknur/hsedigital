
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
// FIX: ChecklistItem is obsolete. Use FormDefinition to look up item labels.
import { ChecklistSubmission, ChecklistStatus, FormDefinition } from '../../types';

interface TopViolationsChartProps {
  submissions: ChecklistSubmission[];
  // FIX: Use formDefinitions to get item text, instead of the obsolete checklistItems.
  formDefinitions: FormDefinition[];
}

const TopViolationsChart: React.FC<TopViolationsChartProps> = ({ submissions, formDefinitions }) => {
    const violationCounts: { [key: string]: number } = {};
    const itemLabels: { [key: string]: string } = {};
    
    submissions.forEach(submission => {
        const formDef = formDefinitions.find(f => f.id === submission.formId);
        if (!formDef) return;

        // FIX: Property 'items' does not exist on type 'ChecklistSubmission'. Use 'data' instead.
        Object.entries(submission.data).forEach(([itemId, status]) => {
            if (status === ChecklistStatus.NonCompliant) {
                violationCounts[itemId] = (violationCounts[itemId] || 0) + 1;
                if (!itemLabels[itemId]) {
                    const component = formDef.schema.components.find((c: any) => c.key === itemId);
                    itemLabels[itemId] = component?.label || 'Unknown Item';
                }
            }
        });
    });

    const data = Object.entries(violationCounts)
        .map(([itemId, count]) => ({
            name: itemLabels[itemId] || 'Unknown Item',
            count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" name="Non-Compliant Reports" />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default TopViolationsChart;
