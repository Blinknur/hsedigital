
import React, { useState } from 'react';
import { AuditFinding, User, CorrectiveActionStatus, UserRole, AuditTrailEntry, SubTask, Permission } from '../../types';
import CommentThread from './CommentThread'; // NEW: Import comment thread
import { usePermissions } from '../../hooks/usePermissions';

interface CapaItemProps {
    finding: AuditFinding;
    auditId: string;
    currentUser: User;
    users: User[];
    onUpdateCapa: (auditId: string, findingItemId: string, newStatus: CorrectiveActionStatus, notes?: string) => void;
    checklistText: string;
    onAddSubTask: (auditId: string, findingItemId: string, description: string) => void;
    onToggleSubTask: (auditId: string, findingItemId: string, subTaskId: string) => void;
    // NEW: Add comment handler
    onAddComment: (auditId: string, findingItemId: string, text: string) => void;
}

const getCapaStatusBadge = (status: CorrectiveActionStatus) => {
    const styles = {
        [CorrectiveActionStatus.Open]: 'bg-red-100 text-red-800',
        [CorrectiveActionStatus.InProgress]: 'bg-amber-100 text-amber-800',
        [CorrectiveActionStatus.Completed]: 'bg-blue-100 text-blue-800',
        [CorrectiveActionStatus.Reviewed]: 'bg-purple-100 text-purple-800',
        [CorrectiveActionStatus.Approved]: 'bg-emerald-100 text-emerald-800',
    };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};

const CapaItem: React.FC<CapaItemProps> = ({ finding, auditId, currentUser, users, onUpdateCapa, checklistText, onAddSubTask, onToggleSubTask, onAddComment }) => {
    const [notes, setNotes] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [newSubTask, setNewSubTask] = useState('');

    const canResolve = usePermissions(currentUser, Permission.ResolveCapas);
    const canApprove = usePermissions(currentUser, Permission.ApproveCapas);

    if (!finding.correctiveAction) return null;
    const capa = finding.correctiveAction;
    const allSubTasksCompleted = capa.subTasks ? capa.subTasks.every(st => st.completed) : true;
    
    const ESCALATION_THRESHOLD_DAYS = 7;
    const isOverdue = new Date() > new Date(capa.dueDate);
    const daysOverdue = isOverdue ? Math.floor((new Date().getTime() - new Date(capa.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const isEscalated = isOverdue && daysOverdue > ESCALATION_THRESHOLD_DAYS && (capa.status === CorrectiveActionStatus.Open || capa.status === CorrectiveActionStatus.InProgress);


    const handleComplete = () => {
        if (!notes) {
            alert('Completion notes are required.');
            return;
        }
        if (!allSubTasksCompleted) {
            alert('Please complete all subtasks before marking the action as completed.');
            return;
        }
        onUpdateCapa(auditId, finding.itemId, CorrectiveActionStatus.Completed, notes);
        setIsEditing(false);
    };

    const handleReview = () => {
         onUpdateCapa(auditId, finding.itemId, CorrectiveActionStatus.Reviewed, 'Reviewed by manager.');
    };
    
    const handleApproveAction = () => {
         onUpdateCapa(auditId, finding.itemId, CorrectiveActionStatus.Approved, 'Approved and closed.');
    };

    const handleAddNewSubTask = () => {
        if (!newSubTask.trim()) return;
        onAddSubTask(auditId, finding.itemId, newSubTask.trim());
        setNewSubTask('');
    };
    
    const handleAddCommentLocal = (text: string) => {
        onAddComment(auditId, finding.itemId, text);
    }
    
    const canComplete = canResolve && currentUser.id === capa.assignedTo && (capa.status === CorrectiveActionStatus.Open || capa.status === CorrectiveActionStatus.InProgress);
    const canReview = canApprove && capa.status === CorrectiveActionStatus.Completed;
    const canFinallyApprove = canApprove && capa.status === CorrectiveActionStatus.Reviewed;
    const canModifySubtasks = canResolve && (currentUser.id === capa.assignedTo || canApprove);

    return (
        <div className={`p-4 bg-white rounded-lg border shadow-sm transition-all ${isEscalated ? 'border-red-300 ring-2 ring-red-200' : 'border-slate-200 hover:border-slate-300'}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-semibold text-slate-800">{capa.description}</p>
                    <p className="text-xs text-slate-500 mt-1">From item: "{checklistText}"</p>
                </div>
                {getCapaStatusBadge(capa.status)}
            </div>
             {capa.completionNotes && <p className="text-sm mt-2 text-slate-600 bg-slate-50 p-2 rounded-md border"><strong>Completion Notes:</strong> {capa.completionNotes}</p>}

            <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 mt-3 border-t pt-3">
                <div >
                    <span className="font-medium text-slate-500 block">ASSIGNED TO</span>
                    <span className="font-semibold">{users.find(u => u.id === capa.assignedTo)?.name || 'Unassigned'}</span>
                </div>
                <div>
                    <span className="font-medium text-slate-500 block">DUE DATE</span>
                    <span className={isOverdue && capa.status !== CorrectiveActionStatus.Approved ? 'text-red-600 font-bold' : 'font-semibold'}>
                        {new Date(capa.dueDate).toLocaleDateString()}
                        {isOverdue && capa.status !== CorrectiveActionStatus.Approved && ` (${daysOverdue} days overdue)`}
                    </span>
                </div>
            </div>
            
            {(capa.subTasks && capa.subTasks.length > 0 || canModifySubtasks) && (
                <div className="mt-4 pt-3 border-t">
                    <h5 className="text-sm font-semibold text-slate-700 mb-2">Subtasks</h5>
                    {capa.subTasks && capa.subTasks.length > 0 ? (
                        <ul className="space-y-2">
                            {capa.subTasks.map(subtask => (
                                <li key={subtask.id} className="flex items-center">
                                    <input 
                                        type="checkbox"
                                        id={`subtask-${subtask.id}`}
                                        checked={subtask.completed}
                                        onChange={() => onToggleSubTask(auditId, finding.itemId, subtask.id)}
                                        disabled={!canModifySubtasks}
                                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 transition"
                                    />
                                    <label htmlFor={`subtask-${subtask.id}`} className={`ml-2 text-sm ${subtask.completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                                        {subtask.description}
                                    </label>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-xs text-slate-500">No subtasks defined.</p>}
                    
                    {canModifySubtasks && (
                        <div className="mt-3 flex gap-2">
                            <input
                                type="text"
                                value={newSubTask}
                                onChange={e => setNewSubTask(e.target.value)}
                                placeholder="Add a new subtask..."
                                className="flex-grow p-1.5 border rounded-md text-sm shadow-sm"
                            />
                            <button onClick={handleAddNewSubTask} className="px-3 py-1 text-sm bg-slate-700 text-white rounded-md hover:bg-slate-800 font-semibold">Add</button>
                        </div>
                    )}
                </div>
            )}


            {isEditing && (
                <div className="mt-4 pt-3 border-t">
                    <label className="text-sm font-semibold text-slate-700 mb-1 block">Completion Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add completion notes..." className="w-full p-2 border rounded-md text-sm shadow-sm" required></textarea>
                </div>
            )}
            
            <div className="flex flex-wrap gap-2 items-center justify-between mt-4 pt-3 border-t">
                 <div className="flex items-center space-x-4">
                    <button onClick={() => setShowHistory(!showHistory)} className="text-xs font-medium text-slate-500 hover:underline">
                        {showHistory ? 'Hide' : 'Show'} History ({capa.history.length})
                    </button>
                     <button onClick={() => setShowComments(!showComments)} className="text-xs font-medium text-slate-500 hover:underline">
                        {showComments ? 'Hide' : 'Show'} Comments ({capa.comments?.length || 0})
                    </button>
                </div>

                <div className="flex justify-end space-x-2">
                     {isEditing ? (
                        <>
                            <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-sm bg-slate-200 text-slate-800 font-semibold rounded-md hover:bg-slate-300">Cancel</button>
                            <button onClick={handleComplete} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700">Submit</button>
                        </>
                     ) : (
                        <>
                            {canComplete && 
                                <button 
                                    onClick={() => setIsEditing(true)} 
                                    disabled={!allSubTasksCompleted}
                                    title={!allSubTasksCompleted ? 'Complete all subtasks first' : ''}
                                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md font-semibold disabled:bg-slate-400 disabled:cursor-not-allowed hover:bg-green-700"
                                >
                                    Update Action
                                </button>
                            }
                            {canReview && <button onClick={handleReview} className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md font-semibold hover:bg-purple-700">Mark as Reviewed</button>}
                            {canFinallyApprove && <button onClick={handleApproveAction} className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700">Approve & Close</button>}
                        </>
                     )}
                </div>
            </div>

            {showHistory && (
                <div className="mt-3">
                    <ul className="space-y-2 text-xs text-slate-600">
                        {[...capa.history].reverse().map((entry, index) => (
                            <li key={index} className="p-2 bg-slate-50 rounded-md border">
                               <div className="flex justify-between items-start">
                                    <div>
                                        <span className="font-semibold">{entry.status}</span> by {users.find(u => u.id === entry.userId)?.name || 'System'}
                                        {entry.notes && <p className="text-slate-700 italic mt-0.5">"{entry.notes}"</p>}
                                   </div>
                                   <span className="flex-shrink-0 ml-4 text-slate-500">{entry.timestamp.toLocaleString()}</span>
                               </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            {showComments && (
                <CommentThread 
                    comments={capa.comments || []}
                    users={users}
                    currentUser={currentUser}
                    onAddComment={handleAddCommentLocal}
                />
            )}
        </div>
    )
};

export default CapaItem;
