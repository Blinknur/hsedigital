
import { useMemo } from 'react';
import { User, Permission } from '../types';
import { getUserPermissions } from '../auth/permissions';

/**
 * A custom hook to check if the current user has a specific permission.
 * @param currentUser The user object.
 * @param requiredPermissions A single permission or an array of permissions to check.
 * @returns `true` if the user has all the required permissions, otherwise `false`.
 */
export const usePermissions = (currentUser: User | null, requiredPermissions: Permission | Permission[]): boolean => {
    const userPermissions = useMemo(() => getUserPermissions(currentUser), [currentUser]);

    const hasPermission = useMemo(() => {
        if (!currentUser) return false;
        
        const permissionsToCheck = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
        
        return permissionsToCheck.every(p => userPermissions.includes(p));
    }, [currentUser, requiredPermissions, userPermissions]);

    return hasPermission;
};
