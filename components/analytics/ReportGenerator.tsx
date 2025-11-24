
import React, { useState, useMemo } from 'react';
import { Audit, Incident, ChecklistSubmission, Station, User, FormDefinition, SavedReport, UserRole, AuditStatus, IncidentStatus, IncidentType, ChecklistFrequency } from '../../types';
import Card from '../shared/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import SavedReportsList from './SavedReportsList';

type DataSource = 'audits' | 'incidents' | 'submissions';

interface ReportGeneratorProps {
    audits: Audit[];
    incidents: Incident[];
    submissions: ChecklistSubmission[];
    stations: Station[];
    users: User[];
    formDefinitions: FormDefinition[];
    currentUser: User;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = (props) => {
    const { audits, incidents, submissions, stations, users, formDefinitions, currentUser } = props;

    const [dataSource, setDataSource] = useState<DataSource>('audits');
    const [filters, setFilters] = useState<any>({});
    const [columns, setColumns] = useState<string[]>([]);
    const [reportData, setReportData] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

    const DATA_CONFIG = {
        audits: {
            name: 'Audits',
            data: audits,
            columns: [
                { key: 'auditNumber', name: 'Audit #' },
                { key: 'stationName', name: 'Station' },
                { key: 'auditorName', name: 'Auditor' },
                { key: 'scheduledDate', name: 'Date' },
                { key: 'status', name: 'Status' },
                { key: 'overallScore', name: 'Score (%)' },
                { key: 'openCapas', name: '# Open CAPAs' },
            ],
            filters: [
                { key: 'status', name: 'Status', type: 'multiselect', options: Object.values(AuditStatus) },
                { key: 'auditorId', name: 'Auditor', type: 'multiselect', options: users.filter(u => u.role === UserRole.Auditor || u.role === UserRole.ComplianceManager).map(u => ({ label: u.name, value: u.id })) },
                { key: 'score', name: 'Score', type: 'range', min: 0, max: 100 }
            ]
        },
        incidents: {
            name: 'Incidents',
            data: incidents,
            columns: [
                { key: 'id', name: 'Incident ID' },
                { key: 'stationName', name: 'Station' },
                { key: 'type', name: 'Type' },
                { key: 'status', name: 'Status' },
                { key: 'timestamp', name: 'Date' },
                { key: 'reporterName', name: 'Reported By' },
            ],
            filters: [
                 { key: 'status', name: 'Status', type: 'multiselect', options: Object.values(IncidentStatus) },
                 { key: 'type', name: 'Type', type: 'multiselect', options: Object.values(IncidentType) },
            ]
        },
        submissions: {
            name: 'Checklist Submissions',
            data: submissions,
            columns: [
                { key: 'formName', name: 'Form' },
                { key: 'stationName', name: 'Station' },
                { key: 'submittedAt', name: 'Date' },
                { key: 'submitterName', name: 'Submitted By' },
                { key: 'compliance', name: 'Compliance (%)' },
            ],
            filters: [
                 { key: 'frequency', name: 'Frequency', type: 'multiselect', options: Object.values(ChecklistFrequency) },
                 { key: 'formId', name: 'Form', type: 'multiselect', options: formDefinitions.map(f=>({label: f.name, value: f.id}))},
            ]
        }
    };

    const currentConfig = DATA_CONFIG[dataSource];

    const handleGenerateReport = () => {
        setIsGenerating(true);
        setTimeout(() => {
            const processedData = processData(dataSource, filters);
            setReportData(processedData);
            setIsGenerating(false);
        }, 500);
    };

    const processData = (source: DataSource, activeFilters: any) => {
        let data = DATA_CONFIG[source].data;
        if(source === 'audits') {
            data = data.map(d => ({
                ...d,
                stationName: stations.find(s=>s.id===d.stationId)?.name,
                auditorName: users.find(u=>u.id===d.auditorId)?.name,
                // @ts-ignore
                openCapas: d.findings.filter((f: any) => f.correctiveAction && f.correctiveAction.status !== 'Approved').length
            }));
        }
        return data;
    };
    
    const handleExport = () => {
        if(reportData.length === 0) return;
        const headers = columns.map(c => currentConfig.columns.find(col => col.key === c)?.name).join(',');
        const rows = reportData.map(row => columns.map(c => row[c]).join(',')).join('\n');
        const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${dataSource}_report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleSaveReport = () => {
        const name = prompt("Enter a name for this report:");
        if(name) {
            const newReport: SavedReport = {
                id: `rep-${Date.now()}`,
                name,
                dataSource,
                filters,
                columns,
                createdAt: new Date(),
            };
            setSavedReports(prev => [...prev, newReport]);
        }
    };
    
    const handleLoadReport = (report: SavedReport) => {
        setDataSource(report.dataSource);
        setFilters(report.filters);
        setColumns(report.columns);
    };
    
    const handleDeleteReport = (id: string) => {
        setSavedReports(prev => prev.filter(r => r.id !== id));
    };

    return (
        <div className="p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Analytics Studio</h1>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <SavedReportsList savedReports={savedReports} onLoad={handleLoadReport} onDelete={handleDeleteReport} />
                    <Card title="1. Data Source">
                        <select value={dataSource} onChange={e => {setDataSource(e.target.value as DataSource); setReportData([]); setColumns([]); setFilters({})}} className="w-full form-input">
                            {Object.entries(DATA_CONFIG).map(([key, value]) => (
                                <option key={key} value={key}>{value.name}</option>
                            ))}
                        </select>
                    </Card>
                    <Card title="2. Columns">
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {currentConfig.columns.map(col => (
                                <label key={col.key} className="flex items-center space-x-2">
                                    <input type="checkbox" checked={columns.includes(col.key)} onChange={() => setColumns(prev => prev.includes(col.key) ? prev.filter(c => c !== col.key) : [...prev, col.key])} />
                                    <span>{col.name}</span>
                                </label>
                            ))}
                        </div>
                    </Card>
                    <Card title="3. Generate">
                        <div className="space-y-2">
                            <button onClick={handleGenerateReport} disabled={isGenerating} className="btn btn-primary w-full">
                                {isGenerating ? 'Generating...' : 'Run Report'}
                            </button>
                            <button onClick={handleSaveReport} disabled={reportData.length === 0} className="btn btn-secondary w-full">Save Report</button>
                            <button onClick={handleExport} disabled={reportData.length === 0} className="btn btn-secondary w-full">Export to CSV</button>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-3">
                    <Card>
                        {reportData.length > 0 ? (
                             <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            {columns.map(c => <th key={c} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{currentConfig.columns.find(col=>col.key===c)?.name}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {reportData.map((row, index) => (
                                            <tr key={index}>
                                                {columns.map(c => <td key={c} className="px-6 py-4 whitespace-nowrap text-sm">{String(row[c])}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-slate-500">Configure your report and click "Run Report" to see data here.</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ReportGenerator;
