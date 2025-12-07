import { useAuth, type UserRole } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredRole?: UserRole;
  fallback?: React.ReactNode;
}

function AccessDenied() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>{t("access.denied", "Acesso Negado")}</CardTitle>
          <CardDescription>
            {t("access.noPermission", "Não tem permissão para aceder a esta página.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-go-dashboard"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("access.goToDashboard", "Voltar ao Painel")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function RoleGuard({
  children,
  allowedRoles,
  requiredRole,
  fallback,
}: RoleGuardProps) {
  const { user, isLoading, hasRole, hasAnyRole } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return fallback || <AccessDenied />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return fallback || <AccessDenied />;
  }

  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    return fallback || <AccessDenied />;
  }

  return <>{children}</>;
}

export function ManagerGuard({ children }: { children: React.ReactNode }) {
  return <RoleGuard requiredRole="manager">{children}</RoleGuard>;
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  return <RoleGuard requiredRole="admin">{children}</RoleGuard>;
}

export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  return <RoleGuard requiredRole="superadmin">{children}</RoleGuard>;
}
