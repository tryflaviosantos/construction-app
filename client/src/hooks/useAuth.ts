import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export type UserRole = "superadmin" | "admin" | "manager" | "employee" | "client";

interface ImpersonationInfo {
  isImpersonating: boolean;
  impersonatedTenantId: string;
  impersonatedTenantName: string;
}

interface AuthUser extends User {
  tenant?: {
    id: string;
    name: string;
    subscriptionPlan: string;
  };
  impersonation?: ImpersonationInfo | null;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  superadmin: 100,
  admin: 80,
  manager: 60,
  employee: 40,
  client: 20,
};

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      window.location.href = "/api/login";
    },
  });

  const localLoginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/local-login", credentials);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await apiRequest("POST", "/api/auth/local-logout");
        if (response.ok) {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          window.location.href = "/";
          return;
        }
      } catch {
        // Local logout failed, try OIDC logout (GET redirect)
      }
      // For OIDC users, redirect to logout endpoint
      window.location.href = "/api/logout";
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await apiRequest("POST", `/api/superadmin/impersonate/${tenantId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const stopImpersonationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/superadmin/stop-impersonate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const userRole = (user?.role as UserRole) || "employee";

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.some((role) => userRole === role);
  };

  const canManageUsers = hasRole("manager");
  const canManageSites = hasRole("manager");
  const canManageTools = hasRole("manager");
  const canApproveLeave = hasRole("manager");
  const canViewPayroll = hasRole("manager");
  const canManageClients = hasRole("manager");
  const canConfigureCompany = hasRole("admin");
  const canManageSubscriptions = hasRole("superadmin");

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isSuperAdmin: userRole === "superadmin",
    isAdmin: userRole === "admin" || userRole === "superadmin",
    isManager: hasRole("manager"),
    isEmployee: userRole === "employee",
    isClient: userRole === "client",
    hasRole,
    hasAnyRole,
    canManageUsers,
    canManageSites,
    canManageTools,
    canApproveLeave,
    canViewPayroll,
    canManageClients,
    canConfigureCompany,
    canManageSubscriptions,
    login: loginMutation.mutate,
    localLogin: localLoginMutation.mutate,
    localLoginAsync: localLoginMutation.mutateAsync,
    isLocalLoginPending: localLoginMutation.isPending,
    logout: logoutMutation.mutate,
    isLogoutPending: logoutMutation.isPending,
    error,
    // Impersonation
    isImpersonating: user?.impersonation?.isImpersonating ?? false,
    impersonatedTenantId: user?.impersonation?.impersonatedTenantId ?? null,
    impersonatedTenantName: user?.impersonation?.impersonatedTenantName ?? null,
    impersonate: impersonateMutation.mutate,
    impersonateAsync: impersonateMutation.mutateAsync,
    isImpersonatePending: impersonateMutation.isPending,
    stopImpersonation: stopImpersonationMutation.mutate,
    stopImpersonationAsync: stopImpersonationMutation.mutateAsync,
    isStopImpersonationPending: stopImpersonationMutation.isPending,
  };
}
