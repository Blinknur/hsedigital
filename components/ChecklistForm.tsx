import React, { useState, useEffect, useRef } from 'react';
import { ChecklistFrequency, Station, User, ChecklistSubmission, FormDefinition, GeolocationCoordinates } from '../types';
import Card from './shared/Card';

declare const Formio: any;

interface ChecklistFormProps {
  formDefinitions: FormDefinition[];
  stations: Station[];
  currentUser: User;
  onSubmit: (submission: Omit<ChecklistSubmission, 'id' | 'organizationId' | 'submittedAt' | 'submittedBy'>) => void;
}

const ChecklistForm: React.FC<ChecklistFormProps> = ({ formDefinitions, stations, currentUser, onSubmit }) => {
  const [frequency, setFrequency] = useState<ChecklistFrequency>(ChecklistFrequency.Daily);
  const [stationId, setStationId] = useState<string>(stations[0]?.id || '');
  const [selectedForm, setSelectedForm] = useState<FormDefinition | null>(null);
  const [geolocation, setGeolocation] = useState<GeolocationCoordinates>();
  const [submissionMessage, setSubmissionMessage] = useState('');

  const formRef = useRef<any>(null);
  const formElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => setGeolocation(position.coords),
      (error) => console.warn(`Error getting geolocation: ${error.message}`)
    );
  }, []);

  const filteredForms = formDefinitions.filter(form => form.frequency === frequency);

  useEffect(() => {
    // Auto-select the first available form for the chosen frequency
    if (filteredForms.length > 0) {
      setSelectedForm(filteredForms[0]);
    } else {
      setSelectedForm(null);
    }
  }, [frequency, formDefinitions]);


  useEffect(() => {
    if (selectedForm && formElement.current) {
        formElement.current.innerHTML = '';
        Formio.createForm(formElement.current, selectedForm.schema).then((form: any) => {
            formRef.current = form;
            form.on('submit', (submission: any) => {
                handleSubmit(submission.data);
            });
        });
    }
  }, [selectedForm]);


  const handleSubmit = (data: any) => {
    if (!selectedForm) return;

    onSubmit({
      stationId,
      formId: selectedForm.id,
      frequency: selectedForm.frequency,
      data,
      geolocation
    });
    
    setSubmissionMessage('Checklist submitted successfully!');
    setTimeout(() => {
      formRef.current?.submit(); // This will trigger the submit event again if not handled
    }, 100);
    setTimeout(() => setSubmissionMessage(''), 3000);
  };
  
  return (
    <div className="p-6 lg:p-8">
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="station" className="block text-sm font-medium text-slate-700">Station</label>
              <select id="station" value={stationId} onChange={e => setStationId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md">
                {stations.map(s => <option key={s.id} value={s.id}>{s.name} - {s.region}</option>)}
              </select>
            </div>
            <div>
              <span className="block text-sm font-medium text-slate-700">Frequency</span>
              <div className="mt-2 flex space-x-2">
                {Object.values(ChecklistFrequency).map(freq => (
                  <button key={freq} type="button" onClick={() => setFrequency(freq)} className={`px-4 py-2 text-sm font-semibold rounded-lg ${frequency === freq ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                    {freq}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4">
            {selectedForm ? (
                <div>
                    <h3 className="text-lg font-semibold mb-4 text-slate-700">{selectedForm.name}</h3>
                    <div ref={formElement}></div>
                </div>
            ) : (
                <div className="text-center p-8 bg-slate-50 rounded-lg">
                    <p className="text-slate-500">No checklists available for the selected frequency.</p>
                </div>
            )}
          </div>
          {submissionMessage && <p className="text-green-600 mt-4 text-center font-semibold">{submissionMessage}</p>}
      </Card>
    </div>
  );
};

export default ChecklistForm;