
import {
    User, UserRole, Station, ChecklistFrequency,
    ChecklistSubmission, Incident, Audit, ChecklistStatus, IncidentType,
    IncidentStatus, AuditStatus, FindingSeverity, CorrectiveActionStatus,
    RootCauseCategory,
    RiskCategory,
    AuditFrequency,
    Organization,
    PermitToWork,
    PermitType,
    PermitStatus,
    FormDefinition,
    ActivityLogEntry, // NEW
    Contractor
} from '../types';

// --- ORGANIZATIONS (TENANTS) ---
export const MOCK_ORGANIZATIONS: Organization[] = [
    { id: 'org-1', name: 'Total Parco Pakistan', ownerId: 'user-cm-1', subscriptionPlan: 'enterprise', ssoConfig: { enabled: true, domain: 'totalparco.com' } },
    { id: 'org-2', name: 'Shell Pakistan Ltd', ownerId: 'user-cm-2', subscriptionPlan: 'pro' },
    { id: 'org-3', name: 'PSO Franchise Group', ownerId: 'user-cm-3', subscriptionPlan: 'free' }
];

// --- USERS ---
export const MOCK_USERS: User[] = [
    // Super Admin (no organization)
    { id: 'user-admin-1', name: 'Aamir Khan', email: 'aamir.khan@saas-admin.com', role: UserRole.Admin },

    // Org 1: Total Parco
    { id: 'user-cm-1', name: 'Bilal Ahmed', email: 'bilal.ahmed@totalparco.com', role: UserRole.ComplianceManager, organizationId: 'org-1', region: 'South', assignedStationIds: ['station-tp-1', 'station-tp-2'] },
    { id: 'user-sm-7', name: 'Imad Wasim', email: 'imad.wasim@totalparco-s1.com', role: UserRole.StationManager, organizationId: 'org-1', assignedStationIds: ['station-tp-1']},
    { id: 'user-sm-4', name: 'Maryam Choudhry', email: 'maryam.c@totalparco-s2.com', role: UserRole.StationManager, organizationId: 'org-1', assignedStationIds: ['station-tp-2'] },
    // Contractor User
    { id: 'user-cont-1', name: 'Rashid Minhas', email: 'rashid@volttech.pk', role: UserRole.Contractor, organizationId: 'org-1', contractorId: 'cont-1' },
    
    // Org 2: Shell
    { id: 'user-cm-2', name: 'Usman Malik', email: 'usman.malik@shell.com.pk', role: UserRole.ComplianceManager, organizationId: 'org-2', region: 'Punjab', assignedStationIds: ['station-sh-1', 'station-sh-2'] },
    { id: 'user-sm-2', name: 'Zainab Hasan', email: 'zainab.hasan@shell-dha.com', role: UserRole.StationManager, organizationId: 'org-2', assignedStationIds: ['station-sh-1'] },
    { id: 'user-sm-9', name: 'Shaheen Afridi', email: 'shaheen.afridi@shell-hyd.com', role: UserRole.StationManager, organizationId: 'org-2', assignedStationIds: ['station-sh-2']},
    { id: 'user-auditor-2', name: 'Nida Dar', email: 'nida.dar@shell.com.pk', role: UserRole.Auditor, organizationId: 'org-2', assignedStationIds: ['station-sh-1', 'station-sh-2']},

    // Org 3: PSO
    { id: 'user-cm-3', name: 'Iqbal Qasim', email: 'iqbal.qasim@psogroup.com', role: UserRole.ComplianceManager, organizationId: 'org-3', region: 'North', assignedStationIds: ['station-pso-1', 'station-pso-2']},
    { id: 'user-sm-3', name: 'Ali Raza', email: 'ali.raza@pso-gulberg.com', role: UserRole.StationManager, organizationId: 'org-3', assignedStationIds: ['station-pso-1'] },
    { id: 'user-sm-10', name: 'Naseem Shah', email: 'naseem.shah@pso-quetta.com', role: UserRole.StationManager, organizationId: 'org-3', assignedStationIds: ['station-pso-2']},
    { id: 'user-auditor-1', name: 'Saad Javed', email: 'saad.javed@external-auditors.com', role: UserRole.Auditor, organizationId: 'org-3', assignedStationIds: ['station-pso-1', 'station-pso-2']},
];

// --- STATIONS ---
export const MOCK_STATIONS: Station[] = [
    // Org 1: Total Parco
    { id: 'station-tp-1', organizationId: 'org-1', name: 'Total Parco F-8 Markaz', brand: 'Total Parco', region: 'Islamabad', address: 'F-8 Markaz, Islamabad', location: {lat: 33.710, lon: 73.036}, riskCategory: RiskCategory.Low, auditFrequency: AuditFrequency.Annually, isActive: true },
    { id: 'station-tp-2', organizationId: 'org-1', name: 'Total Parco Model Town', brand: 'Total Parco', region: 'Lahore', address: 'Model Town Link Rd, Lahore', location: { lat: 31.4725, lon: 74.3245 }, riskCategory: RiskCategory.Low, auditFrequency: AuditFrequency.Annually, isActive: true },

    // Org 2: Shell
    { id: 'station-sh-1', organizationId: 'org-2', name: 'Shell DHA Service Station', brand: 'Shell', region: 'Karachi', address: 'Phase 5, DHA, Karachi', location: { lat: 24.8146, lon: 67.0628 }, riskCategory: RiskCategory.Medium, auditFrequency: AuditFrequency.SemiAnnually, isActive: true },
    { id: 'station-sh-2', organizationId: 'org-2', name: 'Shell Hayatabad', brand: 'Shell', region: 'Peshawar', address: 'Phase 3, Hayatabad, Peshawar', location: {lat: 33.987, lon: 71.439}, riskCategory: RiskCategory.Medium, auditFrequency: AuditFrequency.SemiAnnually, isActive: true },

    // Org 3: PSO
    { id: 'station-pso-1', organizationId: 'org-3', name: 'PSO Gulberg Fuel Point', brand: 'PSO', region: 'Lahore', address: 'Main Boulevard, Gulberg, Lahore', location: { lat: 31.5204, lon: 74.3587 }, riskCategory: RiskCategory.Medium, auditFrequency: AuditFrequency.SemiAnnually, isActive: true },
    { id: 'station-pso-2', organizationId: 'org-3', name: 'PSO Jinnah Road', brand: 'PSO', region: 'Quetta', address: 'Jinnah Road, Quetta', location: {lat: 30.191, lon: 67.008}, riskCategory: RiskCategory.High, auditFrequency: AuditFrequency.Quarterly, isActive: true },
];

// --- CONTRACTORS (NEW) ---
export const MOCK_CONTRACTORS: Contractor[] = [
    // Org 1 Contractors
    { id: 'cont-1', organizationId: 'org-1', name: 'VoltTech Solutions', licenseNumber: 'EL-9921', specialization: 'Electrical', contactPerson: 'Rashid Minhas', email: 'info@volttech.pk', status: 'Active' },
    { id: 'cont-2', organizationId: 'org-1', name: 'CivilStruct Builders', licenseNumber: 'CV-4432', specialization: 'Civil', contactPerson: 'Tariq Jamil', email: 'contact@civilstruct.com', status: 'Active' },
    
    // Org 2 Contractors
    { id: 'cont-3', organizationId: 'org-2', name: 'SecureWeld Engineering', licenseNumber: 'ME-1122', specialization: 'Mechanical/Welding', contactPerson: 'Kamran Akmal', email: 'kamran@secureweld.com', status: 'Active' },
    
    // Org 3 Contractors
    { id: 'cont-4', organizationId: 'org-3', name: 'Quetta Power Services', licenseNumber: 'EL-7788', specialization: 'Electrical', contactPerson: 'Sarfaraz Ahmed', email: 'info@quettapower.com', status: 'Active' }
];


// --- FORM DEFINITIONS (for Form.io) ---
export const MOCK_FORM_DEFINITIONS: FormDefinition[] = [
    {
        id: 'form-daily-1',
        organizationId: 'org-1',
        name: 'Daily Forecourt Checklist',
        frequency: ChecklistFrequency.Daily,
        schema: {
            components: [
                { type: 'header', label: 'Fuel Operations' },
                { label: 'Check for fuel spills/leaks around pumps and islands', type: 'radio', key: 'fuelSpills', values: [{label: 'Compliant', value: 'Compliant'}, {label: 'Non-Compliant', value: 'NonCompliant'}, {label: 'N/A', value: 'NA'}]},
                { label: 'Verify dispenser nozzles, hoses, and breakaways are in good condition', type: 'radio', key: 'dispenserCondition', values: [{label: 'Compliant', value: 'Compliant'}, {label: 'Non-Compliant', value: 'NonCompliant'}, {label: 'N/A', value: 'NA'}]},
                { type: 'header', label: 'General Safety & Compliance' },
                { label: 'Inspect fire extinguisher pressure gauges and accessibility', type: 'radio', key: 'fireExtinguisher', values: [{label: 'Compliant', value: 'Compliant'}, {label: 'Non-Compliant', value: 'NonCompliant'}, {label: 'N/A', value: 'NA'}]},
                { label: 'Public restrooms are clean, stocked, and functional', type: 'radio', key: 'restroomsClean', values: [{label: 'Compliant', value: 'Compliant'}, {label: 'Non-Compliant', value: 'NonCompliant'}, {label: 'N/A', value: 'NA'}]},
                { type: 'button', label: 'Submit', action: 'submit' }
            ]
        }
    },
    {
        id: 'form-weekly-1',
        organizationId: 'org-1',
        name: 'Weekly Safety Checklist',
        frequency: ChecklistFrequency.Weekly,
        schema: {
            components: [
                { type: 'header', label: 'Weekly Safety Checks' },
                { label: 'Test emergency pump shut-off button functionality', type: 'radio', key: 'emergencyShutOff', values: [{label: 'Compliant', value: 'Compliant'}, {label: 'Non-Compliant', value: 'NonCompliant'}]},
                { label: 'Verify spill kit is fully stocked and accessible', type: 'radio', key: 'spillKitStocked', values: [{label: 'Compliant', value: 'Compliant'}, {label: 'Non-Compliant', value: 'NonCompliant'}]},
                { type: 'button', label: 'Submit', action: 'submit' }
            ]
        }
    }
];


// --- SUBMISSIONS ---
export const MOCK_SUBMISSIONS: ChecklistSubmission[] = [
    { id: 'sub-1', organizationId: 'org-2', stationId: 'station-sh-1', formId: 'form-daily-1', frequency: ChecklistFrequency.Daily, submittedAt: new Date(new Date().setDate(new Date().getDate() - 1)), submittedBy: 'user-sm-2', data: { fuelSpills: 'Compliant', fireExtinguisher: 'NonCompliant'}},
    { id: 'sub-2', organizationId: 'org-3', stationId: 'station-pso-1', formId: 'form-daily-1', frequency: ChecklistFrequency.Daily, submittedAt: new Date(new Date().setDate(new Date().getDate() - 1)), submittedBy: 'user-sm-3', data: { fuelSpills: 'Compliant', fireExtinguisher: 'Compliant'}},
    { id: 'sub-3', organizationId: 'org-1', stationId: 'station-tp-2', formId: 'form-daily-1', frequency: ChecklistFrequency.Daily, submittedAt: new Date(new Date().setDate(new Date().getDate() - 2)), submittedBy: 'user-sm-4', data: { fuelSpills: 'Compliant', fireExtinguisher: 'Compliant'}},
];

// --- INCIDENTS ---
export const MOCK_INCIDENTS: Incident[] = [
    { id: 'inc-1', organizationId: 'org-2', stationId: 'station-sh-1', type: IncidentType.Spill, description: 'Small diesel spill at pump 3. Cleaned up immediately.', photoUrls: ['https://picsum.photos/seed/inc1/300'], timestamp: new Date(new Date().setDate(new Date().getDate() - 5)), reportedBy: 'user-sm-2', status: IncidentStatus.Closed },
    { id: 'inc-2', organizationId: 'org-3', stationId: 'station-pso-1', type: IncidentType.NearMiss, description: 'Customer slipped on wet floor near entrance, did not fall.', photoUrls: [], timestamp: new Date(new Date().setDate(new Date().getDate() - 2)), reportedBy: 'user-sm-3', status: IncidentStatus.Open, assignedTo: 'user-cm-3', comments: [
        { id: 'c1', userId: 'user-cm-3', timestamp: new Date(new Date().setDate(new Date().getDate() - 1)), text: 'Ali, please check the CCTV footage for the exact time.'},
        { id: 'c2', userId: 'user-sm-3', timestamp: new Date(new Date().setDate(new Date().getDate() - 0)), text: 'Will do. Checking it now.'}
    ]},
    { id: 'inc-3', organizationId: 'org-1', stationId: 'station-tp-1', type: IncidentType.SafetyObservation, description: 'Staff member observed using phone while supervising tanker offloading.', photoUrls: [], timestamp: new Date(new Date().setDate(new Date().getDate() - 10)), reportedBy: 'user-cm-1', status: IncidentStatus.UnderInvestigation, assignedTo: 'user-cm-1'},
];

// --- AUDITS ---
export const MOCK_AUDITS: Audit[] = [
    {
        id: 'audit-1',
        organizationId: 'org-3',
        auditNumber: 'AUD-PSO-001',
        stationId: 'station-pso-2',
        formId: 'form-daily-1',
        auditorId: 'user-auditor-1',
        scheduledDate: new Date(new Date().setDate(new Date().getDate() - 30)),
        completionDate: new Date(new Date().setDate(new Date().getDate() - 29)),
        status: AuditStatus.Closed,
        overallScore: 75,
        findings: [
            {
                itemId: 'fireExtinguisher', status: ChecklistStatus.NonCompliant, observations: 'Fire extinguisher in back room was low on pressure.', severity: FindingSeverity.Critical, rootCauses: [RootCauseCategory.Negligence],
                correctiveAction: {
                    id: 'capa-1', description: 'Replace or recharge fire extinguisher.', assignedTo: 'user-sm-10', dueDate: new Date(new Date().setDate(new Date().getDate() - 15)), status: CorrectiveActionStatus.Approved, completionNotes: 'Extinguisher has been replaced.',
                    history: [{ status: CorrectiveActionStatus.Open, userId: 'user-auditor-1', timestamp: new Date(new Date().setDate(new Date().getDate() - 29)) }]
                },
            }
        ],
    },
    {
        id: 'audit-2',
        organizationId: 'org-2',
        auditNumber: 'AUD-SHL-001',
        stationId: 'station-sh-1',
        formId: 'form-weekly-1',
        auditorId: 'user-auditor-2',
        scheduledDate: new Date(new Date().setDate(new Date().getDate() - 45)),
        completionDate: new Date(new Date().setDate(new Date().getDate() - 44)),
        status: AuditStatus.Completed,
        overallScore: 92,
        findings: [
             {
                itemId: 'spillKitStocked', status: ChecklistStatus.NonCompliant, observations: 'Spill kit missing absorbent pads.', severity: FindingSeverity.Minor,
                correctiveAction: {
                    id: 'capa-2', description: 'Restock spill kit.', assignedTo: 'user-sm-2', dueDate: new Date(new Date().setDate(new Date().getDate() + 5)), status: CorrectiveActionStatus.Open,
                    history: [{ status: CorrectiveActionStatus.Open, userId: 'user-auditor-2', timestamp: new Date(new Date().setDate(new Date().getDate() - 44)) }],
                    comments: [
                        {id: 'c3', userId: 'user-cm-2', timestamp: new Date(), text: '@Zainab Hasan any update on this?'},
                    ]
                },
            }
        ],
    },
    {
        id: 'audit-3',
        organizationId: 'org-1',
        auditNumber: 'AUD-TP-001',
        stationId: 'station-tp-1',
        formId: 'form-daily-1',
        auditorId: 'user-cm-1',
        scheduledDate: new Date(new Date().setDate(new Date().getDate() + 15)),
        status: AuditStatus.Scheduled,
        findings: [],
        overallScore: 0,
    },
    {
        id: 'audit-4',
        organizationId: 'org-3',
        auditNumber: 'AUD-PSO-002',
        stationId: 'station-pso-1',
        formId: 'form-daily-1',
        auditorId: 'user-auditor-1',
        scheduledDate: new Date(new Date().setDate(new Date().getDate() + 20)),
        status: AuditStatus.PendingApproval,
        findings: [],
        overallScore: 0,
    },
];

// --- PERMIT TO WORK ---
export const MOCK_PERMITS: PermitToWork[] = [
    {
        id: 'ptw-1',
        organizationId: 'org-2',
        permitNumber: 'PTW-2024-001',
        stationId: 'station-sh-1',
        contractorId: 'cont-3', // SecureWeld
        type: PermitType.HotWork,
        status: PermitStatus.Closed,
        description: 'Welding repair on canopy support beam.',
        locationOfWork: 'Forecourt Canopy, Column C4',
        validFrom: new Date(new Date().setDate(new Date().getDate() - 10)),
        validTo: new Date(new Date().setDate(new Date().getDate() - 10)),
        requestedBy: 'user-sm-2',
        approvedBy: 'user-cm-2',
        closedBy: 'user-sm-2',
        safetyPrecautions: { 'fireExtinguisher': true, 'barricadeArea': true, 'hotWorkWatch': true },
        history: [],
        closeOutNotes: 'Work completed without incident. Area cleared and inspected.'
    },
    {
        id: 'ptw-2',
        organizationId: 'org-1',
        permitNumber: 'PTW-2024-002',
        stationId: 'station-tp-1',
        contractorId: 'cont-1', // VoltTech
        type: PermitType.ElectricalWork,
        status: PermitStatus.Active,
        description: 'Replacement of main distribution panel for the Quick Mart.',
        locationOfWork: 'Main Electrical Room',
        validFrom: new Date(),
        validTo: new Date(new Date().setDate(new Date().getDate() + 1)),
        requestedBy: 'user-sm-7',
        approvedBy: 'user-cm-1',
        safetyPrecautions: { 'lockoutTagout': true, 'insulatedTools': true, 'arcFlashPPE': true },
        history: [],
    },
    {
        id: 'ptw-3',
        organizationId: 'org-3',
        permitNumber: 'PTW-2024-003',
        stationId: 'station-pso-2',
        contractorId: 'cont-4', // Quetta Power
        type: PermitType.ConfinedSpaceEntry,
        status: PermitStatus.PendingApproval,
        description: 'Internal inspection of Underground Storage Tank 3 (Diesel).',
        locationOfWork: 'UST-03 Manhole',
        validFrom: new Date(new Date().setDate(new Date().getDate() + 5)),
        validTo: new Date(new Date().setDate(new Date().getDate() + 5)),
        requestedBy: 'user-sm-10',
        safetyPrecautions: { 'gasMonitoring': true, 'rescuePlan': true, 'ventilation': true },
        history: [],
    }
];

// NEW: Activity Log
export const MOCK_ACTIVITY_LOGS: ActivityLogEntry[] = [];
