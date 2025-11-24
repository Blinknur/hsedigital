

// --- Fix: Added all missing type definitions ---

export enum UserRole {
  Admin = 'Admin',
  ComplianceManager = 'Compliance Manager',
  Auditor = 'Auditor',
  StationManager = 'Station Manager',
  Contractor = 'Contractor', // NEW: Added Contractor Role
}

export enum ChecklistFrequency {
    Daily = 'Daily',
    Weekly = 'Weekly',
    Monthly = 'Monthly',
}

export enum ChecklistStatus {
    Compliant = 'Compliant',
    NonCompliant = 'Non-Compliant',
    NA = 'N/A',
}

export enum IncidentType {
    Spill = 'Spill',
    NearMiss = 'Near Miss',
    SafetyObservation = 'Safety Observation',
    Injury = 'Injury',
    Other = 'Other',
}

export enum IncidentStatus {
    Open = 'Open',
    UnderInvestigation = 'Under Investigation',
    Closed = 'Closed',
}

export enum AuditStatus {
    PendingApproval = 'Pending Approval',
    Approved = 'Approved',
    Declined = 'Declined',
    Scheduled = 'Scheduled',
    InProgress = 'In Progress',
    Completed = 'Completed',
    Closed = 'Closed',
}

export enum FindingSeverity {
    Critical = 'Critical',
    Major = 'Major',
    Minor = 'Minor',
}

export enum CorrectiveActionStatus {
    Open = 'Open',
    InProgress = 'In Progress',
    Completed = 'Completed',
    Reviewed = 'Reviewed',
    Approved = 'Approved',
}

export enum RootCauseCategory {
    Negligence = 'Negligence',
    LackOfTraining = 'Lack of Training',
    LackOfResources = 'Lack of Resources/Tools',
    NonAuthorization = 'Non-Authorization',
    InternalDelay = 'Delay due to Internal Processes/Approvals',
    Other = 'Other',
}

// NEW: Added enums for station metadata
export enum RiskCategory {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
}

export enum AuditFrequency {
    Monthly = 'Monthly',
    Quarterly = 'Quarterly',
    SemiAnnually = 'Semi-Annually',
    Annually = 'Annually',
}

// --- NEW: Permit to Work System Enums ---
export enum PermitType {
    HotWork = 'Hot Work (Welding, Grinding)',
    ConfinedSpaceEntry = 'Confined Space Entry',
    ElectricalWork = 'High Voltage Electrical Work',
    Excavation = 'Excavation / Ground Work',
    WorkAtHeight = 'Work at Height',
}

export enum PermitStatus {
    Draft = 'Draft',
    PendingApproval = 'Pending Approval',
    Approved = 'Approved',
    Active = 'Active',
    Closed = 'Closed',
    Rejected = 'Rejected',
}
// -----------------------------------------

// NEW: Added for SaaS model
export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';

export interface Organization {
    id: string;
    name: string;
    ownerId: string; // User ID
    subscriptionPlan: SubscriptionPlan;
    ssoConfig?: {
        enabled: boolean;
        domain: string;
    };
    logoUrl?: string;
}


export interface GeolocationCoordinates {
    readonly accuracy: number;
    readonly altitude: number | null;
    readonly altitudeAccuracy: number | null;
    readonly heading: number | null;
    readonly latitude: number;
    readonly longitude: number;
    readonly speed: number | null;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    organizationId?: string | null; // Users belong to an organization, except super-admins
    assignedStationIds?: string[]; // For Station/Compliance Managers, Auditors
    region?: string;    // For Compliance Managers
    contractorId?: string; // For Contractor Users
}

export interface Station {
    id: string;
    organizationId: string;
    name:string;
    brand: string;
    region: string;
    address: string;
    location: { lat: number; lon: number };
    riskCategory: RiskCategory;
    auditFrequency: AuditFrequency;
    isActive: boolean;
}

// NEW: Contractor Interface for Safety Management Module
export interface Contractor {
    id: string;
    organizationId: string;
    name: string;
    licenseNumber: string;
    specialization: string; // e.g., "Electrical", "Civil", "HVAC"
    contactPerson: string;
    email: string;
    status: 'Active' | 'Suspended';
}

// NEW: For Form.io integration
export interface FormDefinition {
    id: string;
    organizationId: string;
    name: string;
    schema: any; // Form.io JSON Schema
    frequency: ChecklistFrequency;
}


export interface ChecklistSubmission {
    id: string;
    organizationId: string;
    stationId: string;
    formId: string; // Link to the FormDefinition
    frequency: ChecklistFrequency;
    submittedAt: Date;
    submittedBy: string; // User ID
    data: any; // JSON data from the form submission
    geolocation?: GeolocationCoordinates;
}

// NEW: Add Comment interface
export interface Comment {
    id: string;
    userId: string;
    timestamp: Date;
    text: string;
}

export interface Incident {
    id: string;
    organizationId: string;
    stationId: string;
    type: IncidentType;
    description: string;
    photoUrls: string[];
    timestamp: Date;
    reportedBy: string; // User ID
    status: IncidentStatus;
    assignedTo?: string; // User ID
    geolocation?: GeolocationCoordinates;
    investigationNotes?: string; // To store follow-up notes
    comments?: Comment[]; // NEW: Add comments to incidents
}

export interface AuditTrailEntry {
    status: CorrectiveActionStatus | PermitStatus; // Updated to support both
    userId: string;
    timestamp: Date;
    notes?: string;
}

export interface SubTask {
    id: string;
    description: string;
    completed: boolean;
}

export interface CorrectiveAction {
    id:string;
    description: string;
    assignedTo: string; // User ID
    dueDate: Date;
    status: CorrectiveActionStatus;
    completionNotes?: string;
    completionPhotoUrl?: string;
    history: AuditTrailEntry[];
    subTasks?: SubTask[];
    isEscalated?: boolean; // To flag overdue actions
    comments?: Comment[]; // NEW: Add comments to CAPAs
}

export interface AuditFinding {
    itemId: string; // This is now the component key from the Form.io schema
    status: ChecklistStatus;
    observations?: string;
    severity?: FindingSeverity;
    photoUrl?: string;
    correctiveAction?: CorrectiveAction;
    rootCauses?: RootCauseCategory[];
}


// --- Existing interface declarations ---

export interface Audit {
    id: string;
    organizationId: string;
    auditNumber: string;
    stationId: string;
    formId: string; // The form used for this audit
    auditorId: string; // User ID of the auditor
    scheduledDate: Date;
    completionDate?: Date;
    status: AuditStatus;
    findings: AuditFinding[];
    overallScore: number; // Percentage
    stationReady?: boolean;
    interviewNotes?: string; // For on-site interview notes
    geolocation?: GeolocationCoordinates; // To geotag the final submission
    declineReason?: string;
}

// --- NEW: Permit to Work Interface ---
export interface PermitToWork {
    id: string;
    organizationId: string;
    permitNumber: string;
    stationId: string;
    contractorId?: string; // NEW: Link to Contractor
    type: PermitType;
    status: PermitStatus;
    description: string;
    locationOfWork: string;
    validFrom: Date;
    validTo: Date;
    requestedBy: string; // User ID
    approvedBy?: string; // User ID
    closedBy?: string; // User ID
    safetyPrecautions: { [key: string]: boolean };
    history: AuditTrailEntry[];
    rejectionReason?: string;
    closeOutNotes?: string;
}
// -----------------------------------

// NEW: Notification types
export enum NotificationType {
    CapaAssigned = 'CAPA Assigned',
    CapaOverdue = 'CAPA Overdue',
    CapaReview = 'CAPA for Review',
    IncidentAlert = 'New Incident',
    PermitApproval = 'Permit Requires Approval',
    Mention = 'You were mentioned',
}

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    description: string;
    timestamp: Date;
    isRead: boolean;
    link: string; // e.g., /#/incident/inc-1
    userId: string; // The user this notification is for
}

// NEW: Activity Log types
export enum ActivityType {
    UserLogin = 'User Login',
    UserLogout = 'User Logout',
    AuditScheduled = 'Audit Scheduled',
    AuditStatusChanged = 'Audit Status Changed',
    IncidentCreated = 'Incident Created',
    IncidentStatusChanged = 'Incident Status Changed',
    PermitStatusChanged = 'Permit Status Changed',
    CapaStatusChanged = 'CAPA Status Changed',
    UserCreated = 'User Created',
    UserUpdated = 'User Updated',
    StationCreated = 'Station Created',
    StationUpdated = 'Station Updated',
    SubscriptionChanged = 'Subscription Changed',
    SecuritySettingsChanged = 'Security Settings Changed',
}

export interface ActivityLogEntry {
    id: string;
    organizationId: string;
    timestamp: Date;
    userId: string;
    actionType: ActivityType;
    entityType: 'audit' | 'incident' | 'permit' | 'capa' | 'user' | 'station' | 'system' | 'organization';
    entityId?: string;
    details: string;
}


// FIX: Moved OverdueCapa type here from App.tsx for global availability.
export type OverdueCapa = {
    audit: Audit;
    finding: AuditFinding;
    stationName: string;
};

// Fix: Add View type for navigation to avoid duplication in components.
// NEW: Add 'billing', 'permit', 'biDashboard', 'analyticsStudio', and 'actionCenter' views
export type View = 'dashboard' | 'checklist' | 'incident' | 'settings' | 'planning' | 'auditExecution' | 'reports' | 'preAuditBriefing' | 'billing' | 'permit' | 'biDashboard' | 'analyticsStudio' | 'actionCenter';

// NEW: Add Vector type for knowledge base
export type Vector = {
    content: string;
    embedding: number[];
};

// NEW: Add SavedReport type for Analytics Studio
export type SavedReport = {
    id: string;
    name: string;
    dataSource: 'audits' | 'incidents' | 'submissions';
    filters: any;
    columns: string[];
    createdAt: Date;
};

// NEW: Advanced Role-Based Access Control (RBAC)
export enum Permission {
    // User Management
    ViewUsers = 'ViewUsers',
    ManageUsers = 'ManageUsers', // Create, Edit, Delete

    // Station Management
    ViewStations = 'ViewStations',
    ManageStations = 'ManageStations', // Create, Edit, Delete

    // Form Management
    ViewForms = 'ViewForms',
    ManageForms = 'ManageForms', // Create, Edit, Delete

    // Billing & Organization
    ViewBilling = 'ViewBilling',
    ManageSubscription = 'ManageSubscription',
    
    // Security
    ManageSecurity = 'ManageSecurity',

    // Audits
    ScheduleAudits = 'ScheduleAudits',
    ApproveAudits = 'ApproveAudits',
    ExecuteAudits = 'ExecuteAudits',
    ViewAllAudits = 'ViewAllAudits',

    // Permits
    RequestPermits = 'RequestPermits',
    ApprovePermits = 'ApprovePermits',
    ViewAllPermits = 'ViewAllPermits',

    // Incidents
    ReportIncidents = 'ReportIncidents',
    ManageIncidents = 'ManageIncidents', // Assign, change status
    ViewAllIncidents = 'ViewAllIncidents',

    // CAPAs
    ResolveCapas = 'ResolveCapas', // For assignees to complete/update
    ApproveCapas = 'ApproveCapas', // For managers to approve completion

    // Checklists
    SubmitChecklists = 'SubmitChecklists',

    // High-level Views
    ViewDashboard = 'ViewDashboard',
    ViewActionCenter = 'ViewActionCenter',
    ViewPlanning = 'ViewPlanning',
    ViewAnalytics = 'ViewAnalytics',
    ViewBIDashboard = 'ViewBIDashboard',
    ViewActivityLog = 'ViewActivityLog',
    ViewSettings = 'ViewSettings',
}