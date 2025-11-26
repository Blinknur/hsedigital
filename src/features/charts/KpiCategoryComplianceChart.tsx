
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
// FIX: ChecklistItem and ChecklistItemCategory are obsolete. Use FormDefinition.
import { ChecklistSubmission, FormDefinition, ChecklistStatus } from '../../types';

interface KpiCategoryComplianceChartProps {
  submissions: ChecklistSubmission[];
  // FIX: Use formDefinitions to get item categories from form headers.
  formDefinitions: FormDefinition[];
}

const KpiCategoryComplianceChart: React.FC<KpiCategoryComplianceChartProps> = ({ submissions, formDefinitions }) => {
    const processData = () => {
        const categoryStats: { [key: string]: { compliant: number; total: number } } = {};

        submissions.forEach(submission => {
            const formDef = formDefinitions.find(f => f.id === submission.formId);
            if (!formDef?.schema?.components) return;

            let currentCategory = 'General';
            // FIX: Iterate over form definition components to determine category from headers
            // and then check for corresponding data in the submission.
            formDef.schema.components.forEach((component: any) => {
                if (component.type === 'header') {
                    currentCategory = component.label;
                }
                
                const status = submission.data[component.key];
                if (status && status !== ChecklistStatus.NA) {
                    if (!categoryStats[currentCategory]) {
                        categoryStats[currentCategory] = { compliant: 0, total: 0 };
                    }
                    
                    categoryStats[currentCategory]!.total++;
                    if (status === ChecklistStatus.Compliant) {
                        categoryStats[currentCategory]!.compliant++;
                    }
                }
            });
        });

        return Object.entries(categoryStats)
            .map(([name, stats]) => ({
                name,
                compliance: stats.total > 0 ? (stats.compliant / stats.total) * 100 : 0,
            }))
            .sort((a, b) => b.compliance - a.compliance);
    };

    const data = processData();

    if (data.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-500">No data available for KPI categories.</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
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

export default KpiCategoryComplianceChart;
