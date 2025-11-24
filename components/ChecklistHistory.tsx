import React, { useState, useMemo } from 'react';
import { ChecklistSubmission, Station, User, FormDefinition, ChecklistStatus } from '../types';
import Card from './shared/Card';
import EmptyState from './shared/EmptyState';
import { ICONS } from '../constants';

interface ChecklistHistoryProps {
  submissions: ChecklistSubmission[];
  stations: Station[];
  users: User[];
  formDefinitions: FormDefinition[];
  isEmbedded?: boolean;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Compliant':
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">{status}</span>;
    case 'NonCompliant':
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">{status}</span>;
    default:
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
  }
};

const ChecklistHistory: React.FC<ChecklistHistoryProps> = ({ submissions, stations, users, formDefinitions, isEmbedded = false }) => {
  const [selectedSubmission, setSelectedSubmission] = useState<ChecklistSubmission | null>(null);

  const enrichedSubmissions = useMemo(() => {
    return submissions.map(sub => {
      const station = stations.find(s => s.id === sub.stationId);
      const user = users.find(u => u.id === sub.submittedBy);
      const form = formDefinitions.find(f => f.id === sub.formId);
      
      let compliantCount = 0;
      let totalCount = 0;
      
      Object.values(sub.data).forEach(status => {
          if (status !== 'NA') {
              totalCount++;
              if (status === 'Compliant') {
                  compliantCount++;
              }
          }
      });
      const compliance = totalCount > 0 ? (compliantCount / totalCount) * 100 : 100;

      return {
        ...sub,
        stationName: station?.name || 'Unknown Station',
        userName: user?.name || 'Unknown User',
        formName: form?.name || 'Unknown Form',
        compliance,
      };
    }).sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }, [submissions, stations, users, formDefinitions]);

  const DetailsModal = () => {
    if (!selectedSubmission) return null;

    const submissionDetails = enrichedSubmissions.find(s => s.id === selectedSubmission.id);
    const formDef = formDefinitions.find(f => f.id === selectedSubmission.formId);

    const getQuestionLabel = (key: string) => {
        return formDef?.schema.components.find((c: any) => c.key === key)?.label || key;
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
        <Card title={`Submission: ${submissionDetails?.formName}`} className="w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between text-sm text-slate-600 mb-4">
            <span><strong>Station:</strong> {submissionDetails?.stationName}</span>
            <span><strong>Submitted by:</strong> {submissionDetails?.userName}</span>
            <span><strong>Date:</strong> {selectedSubmission.submittedAt.toLocaleString()}</span>
          </div>
          <div className="flex-1 overflow-y-auto pr-2">
            <ul className="space-y-3">
              {Object.entries(selectedSubmission.data).map(([key, value]) => {
                if(key === 'submit') return null; // Don't show submit button data
                return (
                  <li key={key} className="p-3 bg-slate-50 rounded-md flex justify-between items-center">
                    <p className="font-medium text-slate-800">{getQuestionLabel(key)}</p>
                    {getStatusBadge(String(value))}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="mt-6 text-right">
            <button onClick={() => setSelectedSubmission(null)} className="px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700">
              Close
            </button>
          </div>
        </Card>
      </div>
    );
  };

  const content = (
      <Card>
        {enrichedSubmissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Station</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Form Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Compliance</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Submitted</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Submitted By</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {enrichedSubmissions.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{sub.stationName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{sub.formName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                       <span className={`font-semibold ${sub.compliance < 80 ? 'text-red-600' : sub.compliance < 100 ? 'text-amber-600' : 'text-green-600'}`}>
                          {sub.compliance.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{sub.submittedAt.toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{sub.userName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => setSelectedSubmission(sub)} className="text-emerald-600 hover:text-emerald-900">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
            <EmptyState
                icon={ICONS.checklist}
                title="No Checklists Found"
                message="There are no checklist submissions matching the current filters."
            />
        )}
      </Card>
  );

  if (isEmbedded) {
    return (
      <>
        {content}
        <DetailsModal />
      </>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Checklist History</h1>
      {content}
      <DetailsModal />
    </div>
  );
};

export default ChecklistHistory;