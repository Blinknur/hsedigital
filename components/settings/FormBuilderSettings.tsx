
import React, { useState, useEffect, useRef } from 'react';
import { FormDefinition, ChecklistFrequency, User, Permission } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';

declare const Formio: any;

interface FormBuilderSettingsProps {
    formDefinitions: FormDefinition[];
    onUpdate: (form: FormDefinition) => void;
    onAdd: (form: Omit<FormDefinition, 'id' | 'organizationId'>) => void;
    onDelete: (id: string) => void;
    currentUser: User;
}

const FormBuilderSettings: React.FC<FormBuilderSettingsProps> = ({ formDefinitions, onUpdate, onAdd, onDelete, currentUser }) => {
    const [selectedForm, setSelectedForm] = useState<FormDefinition | null>(null);
    const [formName, setFormName] = useState('');
    const [formFrequency, setFormFrequency] = useState<ChecklistFrequency>(ChecklistFrequency.Daily);
    
    const builderRef = useRef<any>(null);
    const builderElement = useRef<HTMLDivElement>(null);
    const canManage = usePermissions(currentUser, Permission.ManageForms);

    useEffect(() => {
        if (selectedForm && builderElement.current) {
            builderElement.current.innerHTML = ''; // Clear previous builder
            Formio.builder(builderElement.current, selectedForm.schema || { components: [] }, {
                readOnly: !canManage
            }).then((builder: any) => {
                builderRef.current = builder;
            });
        }
    }, [selectedForm, canManage]);

    const handleSelectForm = (form: FormDefinition) => {
        setSelectedForm(form);
        setFormName(form.name);
        setFormFrequency(form.frequency);
    };

    const handleNewForm = () => {
        const newForm: FormDefinition = {
            id: `new-${Date.now()}`,
            organizationId: '',
            name: 'New Checklist Form',
            frequency: ChecklistFrequency.Daily,
            schema: { components: [] }
        };
        setSelectedForm(newForm);
        setFormName(newForm.name);
        setFormFrequency(newForm.frequency);
    };

    const handleSave = () => {
        if (!selectedForm || !builderRef.current || !canManage) return;

        const newSchema = builderRef.current.schema;
        const formToSave = { ...selectedForm, name: formName, frequency: formFrequency, schema: newSchema };

        if (selectedForm.id.startsWith('new-')) {
            const { id, organizationId, ...newForm } = formToSave;
            onAdd(newForm);
        } else {
            onUpdate(formToSave);
        }
        setSelectedForm(null);
    };

    const confirmDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
            onDelete(id);
            if(selectedForm?.id === id) setSelectedForm(null);
        }
    }


    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                <h4 className="text-xl font-semibold mb-2">Form Templates</h4>
                <p className="text-sm text-slate-500 mb-4">Select a form to edit or create a new one.</p>
                {canManage && (
                    <button onClick={handleNewForm} className="w-full mb-4 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg">
                        Create New Form
                    </button>
                )}
                <div className="space-y-2">
                    {formDefinitions.map(form => (
                        <div key={form.id} className={`p-3 rounded-lg border flex justify-between items-center cursor-pointer ${selectedForm?.id === form.id ? 'bg-emerald-50 border-emerald-300' : 'hover:bg-slate-50'}`} onClick={() => handleSelectForm(form)}>
                            <div>
                                <p className="font-semibold">{form.name}</p>
                                <p className="text-xs text-slate-500">{form.frequency}</p>
                            </div>
                             {canManage && <button onClick={(e) => { e.stopPropagation(); confirmDelete(form.id);}} className="text-red-500 hover:text-red-700 p-1 text-xs">Delete</button>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="md:col-span-2">
                {selectedForm ? (
                    <div>
                        {canManage && (
                            <div className="bg-slate-50 p-4 rounded-lg border mb-4">
                                <h4 className="text-lg font-semibold mb-2">Form Properties</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Form Name</label>
                                        <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Frequency</label>
                                        <select value={formFrequency} onChange={e => setFormFrequency(e.target.value as ChecklistFrequency)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                            {Object.values(ChecklistFrequency).map(freq => <option key={freq} value={freq}>{freq}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={builderElement}></div>

                        {canManage && (
                            <div className="mt-6 flex justify-end space-x-3">
                                <button onClick={() => setSelectedForm(null)} className="px-4 py-2 bg-slate-200 rounded-lg">Cancel</button>
                                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold">Save Form</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full bg-slate-50 rounded-lg border-2 border-dashed">
                        <p className="text-slate-500">Select a form to edit or create a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormBuilderSettings;
