
import React, { useState } from 'react';
import { Audit, Station, User, FormDefinition, Permission } from '../types';
import Card from './shared/Card';
import CalendarView from './planning/CalendarView';
import StationAuditList from './planning/StationAuditList';
import AuditModal from './planning/ScheduleAuditModal';
import SkeletonLoader from './shared/SkeletonLoader';
import { usePermissions } from '../hooks/usePermissions';

interface PlanningProps {
    audits: Audit[];
    stations: Station[];
    users: User[];
    formDefinitions: FormDefinition[];
    currentUser: User;
    onScheduleAudit: (data: { stationId: string; auditorId: string; scheduledDate: Date; formId: string }) => void;
    onUpdateAudit: (audit: Audit) => void;
    onDeleteAudit: (auditId: string) => void;
    onStartAudit: (auditId: string) => void;
    onApproveAudit: (auditId: string) => void;
    onRejectAudit: (auditId: string, reason: string) => void;
    isLoading: boolean;
}

const Planning: React.FC<PlanningProps> = ({ 
    audits, 
    stations, 
    users, 
    formDefinitions,
    currentUser, 
    onScheduleAudit, 
    onUpdateAudit, 
    onDeleteAudit, 
    onApproveAudit, 
    onRejectAudit,
    isLoading 
}) => {
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [modalData, setModalData] = useState<{ date?: Date; audit?: Audit } | null>(null);

    const canSchedule = usePermissions(currentUser, Permission.ScheduleAudits);

    const handleOpenModal = (data: { date?: Date; audit?: Audit }) => {
        setModalData(data);
    };

    const handleCloseModal = () => {
        setModalData(null);
    };

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Audit Planning</h1>
                <div className="flex space-x-2 mt-4 sm:mt-0">
                    <button 
                        onClick={() => setViewMode('calendar')} 
                        className={`px-4 py-2 rounded-lg text-sm font-semibold ${viewMode === 'calendar' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                    >
                        Calendar
                    </button>
                    <button 
                        onClick={() => setViewMode('list')} 
                        className={`px-4 py-2 rounded-lg text-sm font-semibold ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                    >
                        List View
                    </button>
                </div>
            </div>

            {isLoading ? (
                <Card>
                    <SkeletonLoader className="h-96" />
                </Card>
            ) : (
                <Card>
                    {viewMode === 'calendar' ? (
                        <CalendarView 
                            audits={audits} 
                            stations={stations} 
                            onOpenModal={handleOpenModal}
                            canSchedule={canSchedule}
                        />
                    ) : (
                        <StationAuditList 
                            stations={stations} 
                            audits={audits} 
                            users={users}
                        />
                    )}
                </Card>
            )}

            {modalData && (
                <AuditModal
                    modalData={modalData}
                    stations={stations}
                    users={users}
                    audits={audits}
                    formDefinitions={formDefinitions}
                    currentUser={currentUser}
                    onClose={handleCloseModal}
                    onSchedule={(data) => {
                        onScheduleAudit(data);
                        handleCloseModal();
                    }}
                    onUpdate={(audit) => {
                        onUpdateAudit(audit);
                        handleCloseModal();
                    }}
                    onDelete={(id) => {
                        onDeleteAudit(id);
                        handleCloseModal();
                    }}
                    onApprove={onApproveAudit}
                    onReject={onRejectAudit}
                />
            )}
        </div>
    );
};

export default Planning;
