import React from 'react';

interface EmptyStateProps {
  icon: React.ReactElement<any>;
  title: string;
  message: string;
  action?: {
    text: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => {
  return (
    <div className="text-center p-8 rounded-lg bg-white border-2 border-dashed border-slate-200">
      <div className="mx-auto w-12 h-12 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full">
        {/* FIX: Changed icon prop type to React.ReactElement<any> to allow adding className. */}
        {React.cloneElement(icon, { className: 'w-6 h-6' })}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-800">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">{message}</p>
      {action && (
        <div className="mt-6">
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            {action.text}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;