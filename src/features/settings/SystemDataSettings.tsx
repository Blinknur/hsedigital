
import React from 'react';
import * as api from '../../api/dataService';

const SystemDataSettings: React.FC = () => {
    const handleReset = () => {
        if (window.confirm('DANGER: This will wipe all local data and reset the application to its initial state. Are you sure?')) {
            api.resetSystemData();
        }
    };

    const handleExport = () => {
        const data = api.exportSystemData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hse-digital-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-3xl">
            <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-semibold text-slate-800">System Data & Maintenance</h4>
            </div>

            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <h5 className="text-lg font-medium text-slate-800 mb-2">Export Data</h5>
                    <p className="text-sm text-slate-600 mb-4">
                        Download a JSON copy of all current system data (Users, Audits, Incidents, etc.). 
                        Use this for backup or debugging.
                    </p>
                    <button onClick={handleExport} className="btn btn-secondary text-sm">
                        Download System Data
                    </button>
                </div>

                <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                    <h5 className="text-lg font-bold text-red-800 mb-2">Danger Zone</h5>
                    <p className="text-sm text-red-700 mb-4">
                        These actions are destructive and cannot be undone.
                    </p>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-red-900">Factory Reset</p>
                            <p className="text-xs text-red-600">Clears all local storage and restores mock data defaults.</p>
                        </div>
                        <button onClick={handleReset} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 text-sm shadow-sm">
                            Reset All Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemDataSettings;
