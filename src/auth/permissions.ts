
import { User, UserRole, Permission } from '../types';

/**
 * Defines the permissions for each user role.
 * This is the single source of truth for the RBAC system.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    [UserRole.Admin]: Object.values(Permission), // Admin gets all permissions

    [UserRole.ComplianceManager]: [
        Permission.ViewUsers, Permission.ManageUsers,
        Permission.ViewStations, Permission.ManageStations,
        Permission.ViewForms, Permission.ManageForms,
        Permission.ViewBilling, Permission.ManageSubscription,
        Permission.ManageSecurity,
        Permission.ScheduleAudits, Permission.ApproveAudits, Permission.ViewAllAudits,
        Permission.RequestPermits, Permission.ApprovePermits, Permission.ViewAllPermits,
        Permission.ReportIncidents, Permission.ManageIncidents, Permission.ViewAllIncidents,
        Permission.ApproveCapas,
        Permission.SubmitChecklists,
        Permission.ViewDashboard, Permission.ViewActionCenter, Permission.ViewPlanning, Permission.ViewAnalytics, Permission.ViewBIDashboard, Permission.ViewActivityLog, Permission.ViewSettings,
    ],

    [UserRole.Auditor]: [
        Permission.ExecuteAudits, Permission.ViewAllAudits,
        Permission.ViewAllIncidents, Permission.ViewAllPermits,
        Permission.SubmitChecklists,
        Permission.ViewDashboard, Permission.ViewActionCenter, Permission.ViewPlanning,
    ],

    [UserRole.StationManager]: [
        Permission.ReportIncidents,
        Permission.RequestPermits,
        Permission.ResolveCapas,
        Permission.SubmitChecklists,
        Permission.ViewDashboard, Permission.ViewActionCenter,
    ],

    [UserRole.Contractor]: [
        Permission.ViewDashboard, // Added for Dashboard access
        Permission.RequestPermits,
        Permission.SubmitChecklists,
        Permission.ViewActionCenter,
    ]
};

/**
 * Gets the full list of permissions for a given user.
 * This is a pure function and not a hook, so it can be called anywhere.
 * @param user The user object.
 * @returns An array of Permission enums.
 */
export const getUserPermissions = (user: User | null): Permission[] => {
    if (!user) return [];
    // Super Admins (no orgId) have all permissions.
    if (user.role === UserRole.Admin && !user.organizationId) {
        return Object.values(Permission);
    }
    return ROLE_PERMISSIONS[user.role] || [];
};
