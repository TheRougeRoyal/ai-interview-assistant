/**
 * Role-Based Access Control (RBAC)
 * Provides utilities for fine-grained permission checking
 */

import type { UserRole } from './server';

/**
 * Define permissions for each role
 */
export enum Permission {
  // Candidate permissions
  VIEW_OWN_PROFILE = 'view:own_profile',
  EDIT_OWN_PROFILE = 'edit:own_profile',
  UPLOAD_RESUME = 'upload:resume',
  START_INTERVIEW = 'start:interview',
  SUBMIT_ANSWERS = 'submit:answers',
  VIEW_OWN_RESULTS = 'view:own_results',
  
  // Interviewer permissions
  VIEW_ALL_CANDIDATES = 'view:all_candidates',
  VIEW_CANDIDATE_DETAILS = 'view:candidate_details',
  SCORE_ANSWERS = 'score:answers',
  GENERATE_QUESTIONS = 'generate:questions',
  EXPORT_REPORTS = 'export:reports',
  VIEW_ANALYTICS = 'view:analytics',
  
  // Admin permissions (future)
  MANAGE_USERS = 'manage:users',
  MANAGE_SETTINGS = 'manage:settings',
  VIEW_AUDIT_LOGS = 'view:audit_logs',
}

/**
 * Map roles to their permissions
 */
const rolePermissions: Record<UserRole, Permission[]> = {
  interviewee: [
    Permission.VIEW_OWN_PROFILE,
    Permission.EDIT_OWN_PROFILE,
    Permission.UPLOAD_RESUME,
    Permission.START_INTERVIEW,
    Permission.SUBMIT_ANSWERS,
    Permission.VIEW_OWN_RESULTS,
  ],
  interviewer: [
    Permission.VIEW_ALL_CANDIDATES,
    Permission.VIEW_CANDIDATE_DETAILS,
    Permission.SCORE_ANSWERS,
    Permission.GENERATE_QUESTIONS,
    Permission.EXPORT_REPORTS,
    Permission.VIEW_ANALYTICS,
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = rolePermissions[role];
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return rolePermissions[role] || [];
}

/**
 * Resource ownership check
 */
export interface ResourceOwnership {
  userId: string;
  candidateId?: string;
  sessionId?: string;
}

/**
 * Check if user can access a resource
 */
export function canAccessResource(
  userRole: UserRole,
  userId: string,
  resource: ResourceOwnership
): boolean {
  // Interviewers can access all resources
  if (userRole === 'interviewer') {
    return true;
  }
  
  // Interviewees can only access their own resources
  if (userRole === 'interviewee') {
    return resource.userId === userId;
  }
  
  return false;
}

/**
 * Permission error class
 */
export class PermissionError extends Error {
  constructor(
    public permission: Permission,
    public userRole: UserRole
  ) {
    super(`Permission denied: ${permission} for role ${userRole}`);
    this.name = 'PermissionError';
  }
}

/**
 * Require permission decorator/wrapper
 */
export function requirePermission(permission: Permission) {
  return (role: UserRole): void => {
    if (!hasPermission(role, permission)) {
      throw new PermissionError(permission, role);
    }
  };
}

/**
 * Require any permission
 */
export function requireAnyPermission(permissions: Permission[]) {
  return (role: UserRole): void => {
    if (!hasAnyPermission(role, permissions)) {
      throw new PermissionError(permissions[0], role);
    }
  };
}

/**
 * Require all permissions
 */
export function requireAllPermissions(permissions: Permission[]) {
  return (role: UserRole): void => {
    if (!hasAllPermissions(role, permissions)) {
      throw new PermissionError(permissions[0], role);
    }
  };
}
