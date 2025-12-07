import { storage } from "./storage";

/**
 * Authorization Middleware and Utilities
 * Implements role-based access control (RBAC) for Vivid-Build
 */

export interface AuthContext {
  userId: string;
  userRole: string;
  tenantId: string | null;
  isImpersonating: boolean;
}

/**
 * Extract auth context from request
 */
export async function getAuthContext(req: any): Promise<AuthContext | null> {
  if (!req.user?.claims?.sub) return null;
  
  const user = await storage.getUser(req.user.claims.sub);
  if (!user) return null;
  
  return {
    userId: user.id,
    userRole: user.role,
    tenantId: user.tenantId || null,
    isImpersonating: !!req.session?.impersonatedTenantId,
  };
}

/**
 * Get effective tenant ID (considering impersonation)
 */
export function getEffectiveTenantId(req: any, user: any): string | null {
  if (user.role === "superadmin" && req.session?.impersonatedTenantId) {
    return req.session.impersonatedTenantId;
  }
  return user.tenantId || null;
}

/**
 * Permission Matrix
 * Defines which roles can perform which actions
 */
export const PERMISSIONS = {
  // Superadmin permissions
  MANAGE_TENANTS: ["superadmin"],
  MANAGE_SUBSCRIPTIONS: ["superadmin"],
  IMPERSONATE_TENANT: ["superadmin"],
  VIEW_PLATFORM_STATS: ["superadmin"],
  
  // Tenant Admin permissions
  MANAGE_EMPLOYEES: ["admin", "manager"],
  MANAGE_CLIENTS: ["admin"],
  MANAGE_SITES: ["admin"],
  MANAGE_TOOLS: ["admin"],
  MANAGE_SERVICE_ORDERS: ["admin"],
  APPROVE_TIMESHEETS: ["admin", "manager"],
  APPROVE_LEAVE: ["admin", "manager"],
  VIEW_COMPANY_SETTINGS: ["admin"],
  EDIT_COMPANY_SETTINGS: ["admin"],
  
  // Manager permissions
  VIEW_TEAM_TIMESHEETS: ["admin", "manager"],
  VIEW_TEAM_LEAVE: ["admin", "manager"],
  
  // Employee permissions
  RECORD_TIME: ["employee"],
  REQUEST_LEAVE: ["employee"],
  CHECKOUT_TOOLS: ["employee"],
  CHECKIN_TOOLS: ["employee"],
  
  // Client permissions
  VIEW_SERVICE_ORDERS: ["client"],
  VIEW_SITE_HOURS: ["client"],
};

/**
 * Check if user has permission
 */
export function hasPermission(userRole: string, permission: string): boolean {
  const allowedRoles = PERMISSIONS[permission as keyof typeof PERMISSIONS] || [];
  return allowedRoles.includes(userRole);
}

/**
 * Authorization check helpers
 */
export const AuthChecks = {
  /**
   * Check if user is superadmin
   */
  isSuperAdmin: async (req: any): Promise<boolean> => {
    const context = await getAuthContext(req);
    return context?.userRole === "superadmin" || false;
  },

  /**
   * Check if user is tenant admin
   */
  isTenantAdmin: async (req: any): Promise<boolean> => {
    const context = await getAuthContext(req);
    return context?.userRole === "admin" || false;
  },

  /**
   * Check if user is manager
   */
  isManager: async (req: any): Promise<boolean> => {
    const context = await getAuthContext(req);
    return context?.userRole === "manager" || false;
  },

  /**
   * Check if user is employee
   */
  isEmployee: async (req: any): Promise<boolean> => {
    const context = await getAuthContext(req);
    return context?.userRole === "employee" || false;
  },

  /**
   * Check if user is client
   */
  isClient: async (req: any): Promise<boolean> => {
    const context = await getAuthContext(req);
    return context?.userRole === "client" || false;
  },

  /**
   * Check if user can manage employees (admin or manager)
   */
  canManageEmployees: async (req: any): Promise<boolean> => {
    const context = await getAuthContext(req);
    if (!context) return false;
    return hasPermission(context.userRole, "MANAGE_EMPLOYEES");
  },

  /**
   * Check if user can manage clients (admin only)
   */
  canManageClients: async (req: any): Promise<boolean> => {
    const context = await getAuthContext(req);
    if (!context) return false;
    return hasPermission(context.userRole, "MANAGE_CLIENTS");
  },

  /**
   * Check if user can manage sites (admin only)
   */
  canManageSites: async (req: any): Promise<boolean> => {
    const context = await getAuthContext(req);
    if (!context) return false;
    return hasPermission(context.userRole, "MANAGE_SITES");
  },

  /**
   * Check if user can manage tools (admin only)
   */
  canManageTools: async (req: any): Promise<boolean> => {
    const context = await getAuthContext(req);
    if (!context) return false;
    return hasPermission(context.userRole, "MANAGE_TOOLS");
  },

  /**
   * Check if user can approve timesheets (admin or manager)
   */
  canApproveTimesheets: async (req: any): Promise<boolean> => {
    const context = await getAuthContext(req);
    if (!context) return false;
    return hasPermission(context.userRole, "APPROVE_TIMESHEETS");
  },

  /**
   * Check if user can approve leave (admin or manager)
   */
  canApproveLeave: async (req: any): Promise<boolean> => {
    const context = await getAuthContext(req);
    if (!context) return false;
    return hasPermission(context.userRole, "APPROVE_LEAVE");
  },

  /**
   * Check if user can record time (employee)
   */
  canRecordTime: async (req: any): Promise<boolean> => {
    const context = await getAuthContext(req);
    if (!context) return false;
    return hasPermission(context.userRole, "RECORD_TIME");
  },

  /**
   * Check if user can request leave (employee)
   */
  canRequestLeave: async (req: any): Promise<boolean> => {
    const context = await getAuthContext(req);
    if (!context) return false;
    return hasPermission(context.userRole, "REQUEST_LEAVE");
  },

  /**
   * Check if user can checkout tools (employee)
   */
  canCheckoutTools: async (req: any): Promise<boolean> => {
    const context = await getAuthContext(req);
    if (!context) return false;
    return hasPermission(context.userRole, "CHECKOUT_TOOLS");
  },

  /**
   * Check if user can view service orders (client)
   */
  canViewServiceOrders: async (req: any): Promise<boolean> => {
    const context = await getAuthContext(req);
    if (!context) return false;
    return hasPermission(context.userRole, "VIEW_SERVICE_ORDERS");
  },

  /**
   * Check if user can view site hours (client)
   */
  canViewSiteHours: async (req: any): Promise<boolean> => {
    const context = await getAuthContext(req);
    if (!context) return false;
    return hasPermission(context.userRole, "VIEW_SITE_HOURS");
  },

  /**
   * Check if user belongs to same tenant as resource
   */
  belongsToSameTenant: async (req: any, resourceTenantId: string | null): Promise<boolean> => {
    const context = await getAuthContext(req);
    if (!context) return false;
    
    // Superadmin can access any tenant (when impersonating)
    if (context.userRole === "superadmin") {
      return true;
    }
    
    // Regular users must belong to the same tenant
    return context.tenantId === resourceTenantId;
  },
};

/**
 * Middleware factory for role-based access control
 */
export function requireRole(...roles: string[]) {
  return async (req: any, res: any, next: any) => {
    try {
      const context = await getAuthContext(req);
      if (!context || !roles.includes(context.userRole)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      req.authContext = context;
      next();
    } catch (error) {
      console.error("Authorization error:", error);
      res.status(500).json({ message: "Authorization check failed" });
    }
  };
}

/**
 * Middleware factory for permission-based access control
 */
export function requirePermission(permission: string) {
  return async (req: any, res: any, next: any) => {
    try {
      const context = await getAuthContext(req);
      if (!context || !hasPermission(context.userRole, permission)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      req.authContext = context;
      next();
    } catch (error) {
      console.error("Authorization error:", error);
      res.status(500).json({ message: "Authorization check failed" });
    }
  };
}

/**
 * Middleware to ensure tenant isolation
 */
export function ensureTenantIsolation(tenantIdParam: string = "tenantId") {
  return async (req: any, res: any, next: any) => {
    try {
      const context = await getAuthContext(req);
      if (!context) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const resourceTenantId = req.params[tenantIdParam] || req.body.tenantId;
      
      // Superadmin can access any tenant
      if (context.userRole === "superadmin") {
        req.authContext = context;
        return next();
      }

      // Regular users must belong to the same tenant
      if (context.tenantId !== resourceTenantId) {
        return res.status(403).json({ message: "Cannot access resource from another tenant" });
      }

      req.authContext = context;
      next();
    } catch (error) {
      console.error("Tenant isolation error:", error);
      res.status(500).json({ message: "Tenant isolation check failed" });
    }
  };
}
