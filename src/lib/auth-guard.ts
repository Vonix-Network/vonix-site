/**
 * Authorization Guard System
 * 
 * Centralized authorization for API routes and pages.
 * Provides role-based access control (RBAC) with clear permission definitions.
 */

import { auth } from '../../auth';
import { NextResponse } from 'next/server';

// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY = ['user', 'moderator', 'admin', 'superadmin'] as const;
export type Role = (typeof ROLE_HIERARCHY)[number];

// Permission definitions
export const PERMISSIONS = {
  // User management
  'users:read': ['moderator', 'admin', 'superadmin'],
  'users:write': ['admin', 'superadmin'],
  'users:delete': ['superadmin'],
  'users:ban': ['moderator', 'admin', 'superadmin'],
  
  // Content moderation
  'content:moderate': ['moderator', 'admin', 'superadmin'],
  'content:delete': ['moderator', 'admin', 'superadmin'],
  
  // Admin dashboard
  'admin:access': ['admin', 'superadmin'],
  'admin:settings': ['admin', 'superadmin'],
  'admin:analytics': ['admin', 'superadmin'],
  
  // Server management
  'servers:read': ['user', 'moderator', 'admin', 'superadmin'],
  'servers:write': ['admin', 'superadmin'],
  'servers:delete': ['superadmin'],
  
  // Events
  'events:create': ['moderator', 'admin', 'superadmin'],
  'events:edit': ['moderator', 'admin', 'superadmin'],
  'events:delete': ['admin', 'superadmin'],
  
  // Donations/Payments
  'donations:read': ['admin', 'superadmin'],
  'donations:manage': ['superadmin'],
  'ranks:manage': ['admin', 'superadmin'],
  
  // API Keys
  'apikeys:read': ['admin', 'superadmin'],
  'apikeys:write': ['superadmin'],
  
  // Site settings
  'settings:read': ['admin', 'superadmin'],
  'settings:write': ['superadmin'],
  
  // Forum moderation
  'forum:pin': ['moderator', 'admin', 'superadmin'],
  'forum:lock': ['moderator', 'admin', 'superadmin'],
  'forum:delete': ['moderator', 'admin', 'superadmin'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  const allowedRoles = PERMISSIONS[permission] as readonly string[];
  return allowedRoles.includes(role);
}

/**
 * Check if a role meets minimum role requirement
 */
export function hasMinimumRole(role: string | undefined, minimumRole: Role): boolean {
  if (!role) return false;
  const roleIndex = ROLE_HIERARCHY.indexOf(role as Role);
  const minimumIndex = ROLE_HIERARCHY.indexOf(minimumRole);
  return roleIndex >= minimumIndex;
}

/**
 * Get current authenticated user with role
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) return null;
  
  return {
    id: session.user.id as string,
    email: session.user.email,
    name: session.user.name,
    role: (session.user as any).role as Role || 'user',
    username: (session.user as any).username as string,
  };
}

/**
 * API Route Guard - Returns error response if unauthorized
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  }
  return { error: null, user };
}

/**
 * API Route Guard - Requires specific permission
 */
export async function requirePermission(permission: Permission) {
  const { error, user } = await requireAuth();
  if (error) return { error, user: null };
  
  if (!hasPermission(user!.role, permission)) {
    return { 
      error: NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 }), 
      user: null 
    };
  }
  
  return { error: null, user };
}

/**
 * API Route Guard - Requires minimum role
 */
export async function requireRole(minimumRole: Role) {
  const { error, user } = await requireAuth();
  if (error) return { error, user: null };
  
  if (!hasMinimumRole(user!.role, minimumRole)) {
    return { 
      error: NextResponse.json({ error: 'Forbidden - Insufficient role' }, { status: 403 }), 
      user: null 
    };
  }
  
  return { error: null, user };
}

/**
 * Check if user can access admin panel
 */
export async function canAccessAdmin() {
  const user = await getCurrentUser();
  return user && hasPermission(user.role, 'admin:access');
}

/**
 * Utility for client-side permission checks
 */
export function createPermissionChecker(role: string | undefined) {
  return {
    can: (permission: Permission) => hasPermission(role, permission),
    hasRole: (minimumRole: Role) => hasMinimumRole(role, minimumRole),
    isAdmin: () => hasMinimumRole(role, 'admin'),
    isModerator: () => hasMinimumRole(role, 'moderator'),
    isSuperAdmin: () => role === 'superadmin',
  };
}
