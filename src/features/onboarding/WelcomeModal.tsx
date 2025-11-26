import React from 'react';

interface WelcomeModalProps {
    onClose: () => void;
    onGetStarted: () => void;
    userName: string;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose, onGetStarted, userName }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
                <h2 className="text-2xl font-bold text-slate-800">Welcome, {userName}!</h2>
                <p className="mt-4 text-slate-600">
                    Your HSE.Digital dashboard is ready. You're just a few steps away from streamlining your compliance.
                </p>
                <div className="mt-6">
                    <p className="font-semibold mb-2">Here's a quick win to get you started:</p>
                    <div className="p-4 bg-slate-100 rounded-lg text-left">
                        <p className="font-bold">1. Schedule Your First Audit</p>
                        <p className="text-sm text-slate-600">Go to the 'Planning' view to put your first audit on the calendar.</p>
                    </div>
                </div>
                <div className="mt-8 flex justify-center space-x-4">
                    <button onClick={onClose} className="btn btn-secondary">Explore on My Own</button>
                    <button onClick={onGetStarted} className="btn btn-primary">Go to Planning</button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;
