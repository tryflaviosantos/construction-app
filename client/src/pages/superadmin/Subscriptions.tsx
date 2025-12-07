import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { SuperAdminGuard } from "@/components/RoleGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Building2,
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
} from "lucide-react";

interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  usersByRole: {
    superadmin: number;
    admin: number;
    manager: number;
    employee: number;
    client: number;
  };
  subscriptionsByPlan: {
    basic: number;
    professional: number;
    enterprise: number;
  };
}

function SubscriptionsContent() {
  const { t } = useTranslation();

  const { data: stats, isLoading } = useQuery<PlatformStats>({
    queryKey: ["/api/superadmin/stats"],
  });

  const statCards = [
    {
      title: "Total Tenants",
      value: stats?.totalTenants || 0,
      icon: Building2,
      description: "Registered companies",
      color: "text-blue-600",
    },
    {
      title: "Active Subscriptions",
      value: stats?.activeTenants || 0,
      icon: CheckCircle,
      description: "Paying customers",
      color: "text-green-600",
    },
    {
      title: "Trial Accounts",
      value: stats?.trialTenants || 0,
      icon: Clock,
      description: "In trial period",
      color: "text-amber-600",
    },
    {
      title: "Suspended",
      value: stats?.suspendedTenants || 0,
      icon: XCircle,
      description: "Suspended or cancelled",
      color: "text-red-600",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          {t("admin.subscriptions")}
        </h1>
        <p className="text-muted-foreground">
          Platform-wide subscription analytics and management
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading statistics...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.title} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s/g, "-")}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Subscriptions by Plan
                </CardTitle>
                <CardDescription>Distribution of subscription tiers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Basic</Badge>
                      <span className="text-sm text-muted-foreground">Essential features</span>
                    </div>
                    <span className="font-bold">{stats?.subscriptionsByPlan.basic || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Professional</Badge>
                      <span className="text-sm text-muted-foreground">Advanced features</span>
                    </div>
                    <span className="font-bold">{stats?.subscriptionsByPlan.professional || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Enterprise</Badge>
                      <span className="text-sm text-muted-foreground">Full platform access</span>
                    </div>
                    <span className="font-bold">{stats?.subscriptionsByPlan.enterprise || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Users by Role
                </CardTitle>
                <CardDescription>Platform-wide user distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-600" />
                      <span>Superadmins</span>
                    </div>
                    <span className="font-bold">{stats?.usersByRole.superadmin || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">Admin</Badge>
                      <span>Tenant Admins</span>
                    </div>
                    <span className="font-bold">{stats?.usersByRole.admin || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Manager</Badge>
                      <span>Managers</span>
                    </div>
                    <span className="font-bold">{stats?.usersByRole.manager || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Employee</Badge>
                      <span>Employees</span>
                    </div>
                    <span className="font-bold">{stats?.usersByRole.employee || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Client</Badge>
                      <span>Clients</span>
                    </div>
                    <span className="font-bold">{stats?.usersByRole.client || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Total Platform Users</CardTitle>
              <CardDescription>All users across all tenants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Users className="h-12 w-12 text-muted-foreground" />
                <div>
                  <div className="text-4xl font-bold">{stats?.totalUsers || 0}</div>
                  <p className="text-muted-foreground">registered users on the platform</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function Subscriptions() {
  return (
    <SuperAdminGuard>
      <SubscriptionsContent />
    </SuperAdminGuard>
  );
}
