
import React, { useState } from 'react';
import { Comment, User } from '../types';

interface CommentThreadProps {
    comments: Comment[];
    users: User[];
    currentUser: User;
    onAddComment: (text: string) => void;
}

const CommentThread: React.FC<CommentThreadProps> = ({ comments, users, currentUser, onAddComment }) => {
    const [newComment, setNewComment] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        onAddComment(newComment.trim());
        setNewComment('');
    };
    
    return (
        <div className="mt-4 pt-4 border-t">
            <h4 className="font-semibold text-slate-800 mb-2">Collaboration Thread</h4>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 bg-slate-50 p-3 rounded-md">
                {comments.length > 0 ? (
                    comments.map(comment => {
                        const user = users.find(u => u.id === comment.userId);
                        const isCurrentUser = user?.id === currentUser.id;
                        return (
                            <div key={comment.id} className={`flex items-start gap-2 ${isCurrentUser ? 'justify-end' : ''}`}>
                                {!isCurrentUser && (
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 flex-shrink-0 text-sm">
                                        {user?.name.charAt(0)}
                                    </div>
                                )}
                                <div className={`max-w-xs p-2 rounded-lg ${isCurrentUser ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                                    <div className="flex items-baseline space-x-2">
                                        <p className="font-semibold text-sm">{isCurrentUser ? 'You' : user?.name}</p>
                                        <p className="text-xs opacity-70">{new Date(comment.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                    <p className="text-sm mt-1">{comment.text}</p>
                                </div>
                                 {isCurrentUser && (
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 flex-shrink-0 text-sm">
                                        {user?.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <p className="text-sm text-slate-500 text-center py-2">No comments yet.</p>
                )}
            </div>
            <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
                <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-grow p-2 border rounded-md text-sm shadow-sm w-full"
                />
                <button type="submit" className="px-4 py-2 text-sm bg-slate-700 text-white rounded-md hover:bg-slate-800 font-semibold">
                    Send
                </button>
            </form>
        </div>
    );
};

export default CommentThread;
