
import React, { useState, useEffect, useMemo } from 'react';
import { Audit, Station, User, ChecklistStatus, FindingSeverity, CorrectiveActionStatus, AuditFinding, CorrectiveAction, ChecklistFrequency, UserRole, GeolocationCoordinates, SubTask, RootCauseCategory, AuditStatus, FormDefinition } from '../../types';
import Card from '../../shared/Card';
import * as api from '../../api/dataService';

interface AuditExecutionProps {
    audit: Audit;
    formDefinitions: FormDefinition[];
    stations: Station[];
    users: User[];
    onCompleteAudit: (updatedAudit: Audit) => void;
    onCancel: () => void;
}

const AuditExecution: React.FC<AuditExecutionProps> = ({ audit, formDefinitions, stations, users, onCompleteAudit, onCancel }) => {
    const [findings, setFindings] = useState<AuditFinding[]>(audit.findings || []);
    const [stationReady, setStationReady] = useState<boolean>(audit.stationReady ?? false);
    const [interviewNotes, setInterviewNotes] = useState<string>(audit.interviewNotes || '');
    const [geolocation, setGeolocation] = useState<GeolocationCoordinates>();
    const [showCapaForm, setShowCapaForm] = useState<string | null>(null);
    const [newSubTaskInputs, setNewSubTaskInputs] = useState<Record<string, string>>({});
    const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

    const auditForm = useMemo(() => formDefinitions.find(f => f.id === audit.formId), [formDefinitions, audit.formId]);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => setGeolocation(position.coords),
            (error) => console.warn(`Error getting geolocation: ${error.message}`)
        );
    }, []);

    const station = stations.find(s => s.id === audit.stationId);
    const defaultAssigneeId = users.find(u => u.role === UserRole.StationManager && u.assignedStationIds?.includes(audit.stationId))?.id || '';
    
    const formComponents = useMemo(() => auditForm?.schema?.components || [], [auditForm]);

    const progress = useMemo(() => {
        if (formComponents.length === 0) return 0;
        const answerableItems = formComponents.filter((c: any) => c.type !== 'button' && c.type !== 'header');
        const answeredItems = findings.filter(f => f.status !== ChecklistStatus.NA).length;
        return (answeredItems / answerableItems.length) * 100;
    }, [findings, formComponents]);


    const handleFindingChange = (itemId: string, field: keyof AuditFinding, value: any) => {
        setFindings(prev => {
            const existingFindingIndex = prev.findIndex(f => f.itemId === itemId);
            if (existingFindingIndex > -1) {
                const updatedFindings = [...prev];
                updatedFindings[existingFindingIndex] = { ...updatedFindings[existingFindingIndex], [field]: value };
                if (field === 'status' && value !== ChecklistStatus.NonCompliant && showCapaForm === itemId) {
                    setShowCapaForm(null);
                }
                return updatedFindings;
            } else {
                return [...prev, { itemId, status: ChecklistStatus.NA, [field]: value }];
            }
        });
    };

    const handleFileUpload = async (itemId: string, file: File) => {
        setUploadingItemId(itemId);
        try {
            const url = await api.uploadFile(file);
            handleFindingChange(itemId, 'photoUrl', url);
        } catch (error) {
            console.error("Evidence upload failed", error);
            alert("Failed to upload evidence photo.");
        } finally {
            setUploadingItemId(null);
        }
    }

    const handleRootCauseChange = (itemId: string, cause: RootCauseCategory, isChecked: boolean) => {
        setFindings(prev => {
            return prev.map(f => {
                if (f.itemId === itemId) {
                    const existingCauses = f.rootCauses || [];
                    let newCauses: RootCauseCategory[];
                    if (isChecked) {
                        newCauses = [...new Set([...existingCauses, cause])];
                    } else {
                        newCauses = existingCauses.filter(c => c !== cause);
                    }
                    return { ...f, rootCauses: newCauses };
                }
                return f;
            });
        });
    };
    
    const handleToggleCapaForm = (item: any) => {
        const itemId = item.key;
        const finding = findings.find(f => f.itemId === itemId);
        if (finding?.status !== ChecklistStatus.NonCompliant) return;

        setShowCapaForm(prev => (prev === itemId ? null : itemId));
        
        if (!finding.correctiveAction) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 14);

            const newCapa: CorrectiveAction = {
                id: `capa-temp-${itemId}`,
                description: `Address non-compliance for: ${item.label || ''}`,
                assignedTo: defaultAssigneeId,
                dueDate: dueDate,
                status: CorrectiveActionStatus.Open,
                history: [],
                subTasks: [],
            };
            handleFindingChange(itemId, 'correctiveAction', newCapa);
        }
    }

    const handleCapaChange = (itemId: string, field: keyof Omit<CorrectiveAction, 'id' | 'status' | 'history' | 'subTasks'>, value: any) => {
        setFindings(prev => prev.map(f => {
            if (f.itemId === itemId && f.correctiveAction) {
                const updatedCapa = { ...f.correctiveAction, [field]: value };
                return { ...f, correctiveAction: updatedCapa };
            }
            return f;
        }));
    };

    const handleAddSubTaskLocal = (itemId: string) => {
        const description = newSubTaskInputs[itemId];
        if (!description || !description.trim()) return;

        setFindings(prev => prev.map(f => {
            if (f.itemId === itemId && f.correctiveAction) {
                const newSubTask: SubTask = { id: `sub-temp-${Date.now()}`, description: description.trim(), completed: false };
                const updatedCapa = { ...f.correctiveAction, subTasks: [...(f.correctiveAction.subTasks || []), newSubTask]};
                return { ...f, correctiveAction: updatedCapa };
            }
            return f;
        }));

        setNewSubTaskInputs(prev => ({ ...prev, [itemId]: '' }));
    };

    const handleRemoveSubTaskLocal = (itemId: string, subTaskId: string) => {
        setFindings(prev => prev.map(f => {
            if (f.itemId === itemId && f.correctiveAction && f.correctiveAction.subTasks) {
                const updatedSubTasks = f.correctiveAction.subTasks.filter(st => st.id !== subTaskId);
                const updatedCapa = { ...f.correctiveAction, subTasks: updatedSubTasks };
                return { ...f, correctiveAction: updatedCapa };
            }
            return f;
        }));
    };

    const handleSubmit = () => {
        const answerableItems = formComponents.filter((c: any) => c.type !== 'button' && c.type !== 'header');
        const compliantItems = findings.filter(f => f.status === ChecklistStatus.Compliant).length;
        const relevantItems = findings.filter(f => f.status !== ChecklistStatus.NA).length;
        const overallScore = relevantItems > 0 ? (compliantItems / relevantItems) * 100 : 100;

        const finalizedFindings = findings.map(finding => {
            if (finding.correctiveAction && finding.correctiveAction.id.startsWith('capa-temp-')) {
                return { ...finding, correctiveAction: { ...finding.correctiveAction, id: `capa-${finding.itemId}-${Date.now()}`, history: [{ status: CorrectiveActionStatus.Open, userId: audit.auditorId, timestamp: new Date(), notes: 'CAPA created during audit.' }]}};
            }
            if (finding.status !== ChecklistStatus.NonCompliant && finding.correctiveAction) {
                const { correctiveAction, ...rest } = finding;
                return rest;
            }
            return finding;
        });

        const updatedAudit: Audit = { ...audit, status: AuditStatus.Completed, completionDate: new Date(), findings: finalizedFindings, overallScore: parseFloat(overallScore.toFixed(1)), stationReady, interviewNotes, geolocation };
        onCompleteAudit(updatedAudit);
    };
    
    const renderFormComponent = (item: any) => {
        const itemId = item.key;
        const finding = findings.find(f => f.itemId === itemId) || { itemId, status: ChecklistStatus.NA };
        const isNonCompliant = finding?.status === ChecklistStatus.NonCompliant;
        const isCapaFormOpen = showCapaForm === itemId;
        const isUploading = uploadingItemId === itemId;

        return (
            <Card key={item.key} className="bg-slate-50/80 !shadow-none">
                <div className="flex justify-between items-start">
                    <p className="font-semibold text-slate-800 pr-4">{item.label}</p>
                    {isNonCompliant && (
                        <button onClick={() => handleToggleCapaForm(item)} className={`flex-shrink-0 px-3 py-1 text-sm font-semibold rounded-md transition-colors ${isCapaFormOpen ? 'bg-amber-200 text-amber-800' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
                            {isCapaFormOpen ? '[-] Hide CAPA' : '[+] Create CAPA'}
                        </button>
                    )}
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3">
                    <div>
                        <label className="text-sm font-medium text-slate-600">Status</label>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                            {Object.values(ChecklistStatus).map(status => (
                                <label key={status} className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" name={`status-${itemId}`} value={status} checked={finding?.status === status} onChange={() => handleFindingChange(itemId, 'status', status)} className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300" />
                                    <span className="text-sm">{status}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {isNonCompliant && (
                        <div>
                            <label htmlFor={`severity-${itemId}`} className="text-sm font-medium text-slate-600">Severity</label>
                            <select id={`severity-${itemId}`} value={finding?.severity || ''} onChange={e => handleFindingChange(itemId, 'severity', e.target.value)} className="mt-1 block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500">
                                <option value="">Select Severity</option>
                                {Object.values(FindingSeverity).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                {isNonCompliant && (
                    <>
                        <div className="mt-4">
                            <label htmlFor={`obs-${itemId}`} className="text-sm font-medium text-slate-600">Observations</label>
                            <textarea id={`obs-${itemId}`} value={finding?.observations || ''} onChange={e => handleFindingChange(itemId, 'observations', e.target.value)} rows={2} className="mt-1 block w-full text-sm rounded-md border-gray-300 shadow-sm"></textarea>
                        </div>
                         <div className="mt-4">
                            <label className="text-sm font-medium text-slate-600">Evidence Photo</label>
                            <div className="mt-1 flex items-center gap-4">
                                <input type="file" accept="image/*" onChange={(e) => e.target.files && handleFileUpload(itemId, e.target.files[0])} className="text-sm text-slate-500" />
                                {isUploading && <span className="text-xs text-blue-600 animate-pulse">Uploading...</span>}
                                {finding?.photoUrl && (
                                    <a href={finding.photoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View Photo</a>
                                )}
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="text-sm font-medium text-slate-600">Root Cause(s)</label>
                            <div className="mt-1 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                                {Object.values(RootCauseCategory).map(cause => (
                                    <label key={cause} className="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" checked={finding?.rootCauses?.includes(cause) || false} onChange={(e) => handleRootCauseChange(itemId, cause, e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                                        <span className="text-sm">{cause}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </>
                )}
                {isCapaFormOpen && 'correctiveAction' in finding && finding.correctiveAction && (
                     <div className="mt-4 p-4 border-l-4 border-amber-400 bg-amber-50/50 rounded-r-lg">
                        <h4 className="font-semibold text-amber-800">Corrective Action Plan (CAPA)</h4>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label htmlFor={`capa-desc-${itemId}`} className="text-xs font-medium text-slate-600">Action Required</label>
                                <input id={`capa-desc-${itemId}`} type="text" value={finding.correctiveAction.description || ''} onChange={e => handleCapaChange(itemId, 'description', e.target.value)} className="mt-1 block w-full text-sm rounded-md border-gray-300 shadow-sm"/>
                            </div>
                            <div>
                                <label htmlFor={`capa-assign-${itemId}`} className="text-xs font-medium text-slate-600">Assign To</label>
                                <select id={`capa-assign-${itemId}`} value={finding.correctiveAction.assignedTo || ''} onChange={e => handleCapaChange(itemId, 'assignedTo', e.target.value)} className="mt-1 block w-full text-sm rounded-md border-gray-300 shadow-sm">
                                    <option value="">Select User...</option>
                                    {users.filter(u => u.role === UserRole.StationManager).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                             <div>
                                <label htmlFor={`capa-due-${itemId}`} className="text-xs font-medium text-slate-600">Due Date</label>
                                <input id={`capa-due-${itemId}`} type="date" value={finding.correctiveAction.dueDate ? new Date(finding.correctiveAction.dueDate).toISOString().split('T')[0] : ''} onChange={e => handleCapaChange(itemId, 'dueDate', new Date(e.target.value))} className="mt-1 block w-full text-sm rounded-md border-gray-300 shadow-sm"/>
                            </div>
                        </div>
                         <div className="mt-4 pt-3 border-t border-amber-200">
                            <h5 className="text-xs font-bold text-slate-700 mb-2">Subtasks (Optional)</h5>
                            {finding.correctiveAction.subTasks && finding.correctiveAction.subTasks.length > 0 && (
                                <ul className="space-y-1 mb-2">
                                    {finding.correctiveAction.subTasks.map(subtask => (
                                        <li key={subtask.id} className="flex items-center justify-between text-sm bg-white p-1 rounded">
                                            <span>{subtask.description}</span>
                                            <button type="button" onClick={() => handleRemoveSubTaskLocal(itemId, subtask.id)} className="text-red-500 hover:text-red-700 p-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="flex gap-2">
                                <input type="text" placeholder="Define a subtask..." value={newSubTaskInputs[itemId] || ''} onChange={e => setNewSubTaskInputs(prev => ({...prev, [itemId]: e.target.value}))} className="flex-grow block w-full text-sm rounded-md border-gray-300 shadow-sm" />
                                <button type="button" onClick={() => handleAddSubTaskLocal(itemId)} className="px-3 py-1 text-xs bg-slate-600 text-white font-semibold rounded-md hover:bg-slate-700">Add</button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        );
    }
    
    if (!auditForm) {
        return <div className="p-8 text-center">Error: Audit form definition not found.</div>;
    }

    return (
        <div className="pb-24">
            <div className="sticky top-[73px] bg-white/80 backdrop-blur-sm border-b border-slate-200/80 z-10 p-4 sm:p-6">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Executing Audit #{audit.auditNumber}</h2>
                    <p className="text-slate-600">For Station: <strong>{station?.name}</strong> | Using Form: <strong>{auditForm.name}</strong></p>
                    <div className="flex items-center gap-x-4 mt-4">
                         <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{width: `${progress.toFixed(0)}%`}}></div>
                        </div>
                        <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">{progress.toFixed(0)}% Complete</span>
                    </div>
                     <div className="mt-4 flex justify-end items-center space-x-4">
                        <button onClick={onCancel} className="px-5 py-2 bg-white border border-slate-300 text-slate-800 font-semibold rounded-lg hover:bg-slate-50">Cancel</button>
                        <button onClick={handleSubmit} className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700">Complete Audit</button>
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
                <Card className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Overall Assessment</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="flex items-center">
                                <input type="checkbox" checked={stationReady} onChange={e => setStationReady(e.target.checked)} className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300" />
                                <span className="ml-2 text-sm font-medium text-slate-700">Station was prepared and ready for the audit.</span>
                            </label>
                        </div>
                        <div>
                            <label htmlFor="interview-notes" className="block text-sm font-medium text-slate-700">On-site Interview Notes</label>
                            <textarea id="interview-notes" value={interviewNotes} onChange={e => setInterviewNotes(e.target.value)} rows={4} placeholder="Summarize discussions with station staff..." className="mt-1 block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"></textarea>
                        </div>
                    </div>
                </Card>

                <div className="space-y-4">
                    {formComponents.map((component: any) => {
                        if (component.type === 'header') {
                            return <h3 key={component.key || component.label} className="text-xl font-bold text-slate-700 pt-4 border-b pb-2">{component.label}</h3>;
                        }
                        if (component.type === 'button') {
                            return null; // Don't render submit button from schema
                        }
                        return renderFormComponent(component);
                    })}
                </div>
            </div>
        </div>
    );
};

export default AuditExecution;
