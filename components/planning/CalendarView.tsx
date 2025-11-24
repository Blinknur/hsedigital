
import React, { useState, useMemo } from 'react';
import { Audit, Station, AuditStatus } from '../../types';

interface CalendarViewProps {
    audits: Audit[];
    stations: Station[];
    onOpenModal: (data: { date?: Date; audit?: Audit }) => void;
    canSchedule: boolean;
}

const getAuditIndicatorClass = (audit: Audit): string => {
    if (audit.status === AuditStatus.PendingApproval) return 'bg-amber-200 text-amber-800 border-amber-300';
    if (audit.status === AuditStatus.Approved) return 'bg-cyan-200 text-cyan-800 border-cyan-300';
    if (audit.status === AuditStatus.Declined) return 'bg-rose-200 text-rose-800 border-rose-300';
    if (audit.status !== AuditStatus.Completed && audit.status !== AuditStatus.Closed) {
        return 'bg-blue-200 text-blue-800 border-blue-300'; // Scheduled or In Progress
    }
    if (audit.overallScore < 80) return 'bg-red-200 text-red-800 border-red-300';
    if (audit.overallScore < 95) return 'bg-yellow-200 text-yellow-800 border-yellow-300';
    return 'bg-green-200 text-green-800 border-green-300';
};

const getStationInitials = (name: string): string => {
    const words = name.split(' ');
    if (words.length > 1) {
        return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}


const CalendarView: React.FC<CalendarViewProps> = ({ audits, stations, onOpenModal, canSchedule }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const { month, year, calendarGrid } = useMemo(() => {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const grid: (Date | null)[] = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            grid.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            grid.push(new Date(year, month, i));
        }
        return { month, year, calendarGrid: grid };
    }, [currentDate]);

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                    <button onClick={() => changeMonth(-1)} className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded-md text-slate-700">&lt;</button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-md text-sm text-slate-700 font-semibold">Today</button>
                    <button onClick={() => changeMonth(1)} className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded-md text-slate-700">&gt;</button>
                </div>
                <h3 className="text-lg font-semibold text-slate-800">{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate)}</h3>
                 {canSchedule && (
                    <button onClick={() => onOpenModal({ date: new Date() })} className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 text-sm">
                        Schedule Audit
                    </button>
                 )}
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-semibold text-xs py-2 bg-slate-50 text-slate-600">{day}</div>
                ))}
                {calendarGrid.map((day, index) => (
                    <div key={index} className={`p-1.5 bg-white min-h-[120px] flex flex-col group relative transition-colors duration-300 ${day && day < today ? 'bg-slate-50 text-slate-400' : 'bg-white hover:bg-emerald-50/50'}`}>
                        {day && (
                            <>
                                <time dateTime={day.toISOString()} className={`text-xs font-semibold ${day.getTime() === today.getTime() ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : 'w-6 h-6 flex items-center justify-center'}`}>
                                    {day.getDate()}
                                </time>
                                {day >= today && canSchedule && (
                                     <button onClick={() => onOpenModal({ date: day })} className="absolute top-1 right-1 w-6 h-6 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-500 hover:text-white">+</button>
                                )}
                                <div className="mt-1 space-y-1 overflow-y-auto">
                                    {audits.filter(a => new Date(a.scheduledDate).toDateString() === day.toDateString())
                                           .map(audit => {
                                                const station = stations.find(s => s.id === audit.stationId);
                                                return (
                                                    <button key={audit.id} onClick={() => onOpenModal({ audit })} className={`w-full text-left text-xs p-1 rounded-md border flex items-center group-scope ${getAuditIndicatorClass(audit)}`} title={`Click to edit/review: ${station?.name} - Status: ${audit.status}`}>
                                                        <span className="font-bold mr-1.5">{station ? getStationInitials(station.name) : '??'}</span>
                                                        <span className="truncate flex-1">{station?.name || 'Unknown'}</span>
                                                    </button>
                                                );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CalendarView;
