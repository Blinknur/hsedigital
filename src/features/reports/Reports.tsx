import React from 'react';

const Reports: React.FC = () => {
    return (
        <div className="p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-800">This view has been upgraded!</h1>
            <p className="mt-4 text-slate-600">
                Our reporting capabilities have been moved to the new and improved{' '}
                <a href="/#/analyticsStudio" className="font-semibold text-emerald-600 hover:underline">
                    Analytics Studio
                </a>.
            </p>
            <p className="mt-2 text-slate-500">
                Please use the Analytics Studio to build, save, and export your custom reports.
            </p>
        </div>
    );
};

export default Reports;
