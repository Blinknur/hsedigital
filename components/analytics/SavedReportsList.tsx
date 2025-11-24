
import React, { useState } from 'react';
import { SavedReport } from '../../types';
import Card from '../shared/Card';

interface SavedReportsListProps {
    savedReports: SavedReport[];
    onLoad: (report: SavedReport) => void;
    onDelete: (id: string) => void;
}

const SavedReportsList: React.FC<SavedReportsListProps> = ({ savedReports, onLoad, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (savedReports.length === 0) {
        return (
            <Card title="Saved Reports">
                <p className="text-sm text-slate-500 text-center py-4">You have no saved reports. Save a report configuration for quick access later.</p>
            </Card>
        );
    }
    
    return (
        <Card>
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <h3 className="text-lg font-semibold text-slate-800">Saved Reports</h3>
                <svg className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            {isExpanded && (
                <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2 -mr-2">
                    {savedReports.map(report => (
                        <div key={report.id} className="p-2 rounded-md bg-slate-50 hover:bg-slate-100 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-sm">{report.name}</p>
                                <p className="text-xs text-slate-500">Type: {report.dataSource} | Created: {new Date(report.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex space-x-1">
                                <button onClick={() => onLoad(report)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md" title="Load Report">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12A8 8 0 1013 5.4M20 4v5h-5" /></svg>
                                </button>
                                <button onClick={() => onDelete(report.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-md" title="Delete Report">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};

export default SavedReportsList;
