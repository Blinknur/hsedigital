import React from 'react';

// FIX: This component is obsolete as checklist items are now managed inside 
// Form Definitions via the Form Builder. Its content is replaced with a helpful message.
const ChecklistSettings: React.FC = () => {
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xl font-semibold">Manage Checklist Items (Deprecated)</h4>
            </div>
             <div className="p-6 mt-4 bg-slate-50 rounded-lg border">
                <p className="text-slate-700 font-medium">This feature has been replaced by the <strong>Form Builder</strong>.</p>
                <p className="text-slate-600 mt-2 text-sm">To manage checklist questions, please go to the "Form Builder" tab and edit the questions within their respective form templates. This new approach provides greater flexibility and control over your audit and checklist forms.</p>
            </div>
        </div>
    );
};

export default ChecklistSettings;
