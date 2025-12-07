import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Users,
  Clock,
  CheckCircle,
  Wrench,
  TrendingUp,
  Calendar,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

interface DashboardStats {
  activeWorkers: number;
  hoursToday: number;
  pendingApprovals: number;
  toolsOut: number;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const statCards = [
    {
      title: t("dashboard.activeWorkers"),
      value: stats?.activeWorkers ?? 0,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: t("dashboard.hoursToday"),
      value: stats?.hoursToday ?? 0,
      icon: Clock,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: t("dashboard.pendingApprovals"),
      value: stats?.pendingApprovals ?? 0,
      icon: CheckCircle,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: t("dashboard.toolsOut"),
      value: stats?.toolsOut ?? 0,
      icon: Wrench,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  const quickActions = [
    { label: t("time.clockIn"), href: "/time-tracking", icon: Clock },
    { label: t("tools.scanQr"), href: "/tools", icon: Wrench },
    { label: t("leave.request"), href: "/leave", icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">
          {t("dashboard.welcome")}, {user?.firstName || "User"}
        </h1>
        <p className="text-muted-foreground">{t("dashboard.todayOverview")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} data-testid={`card-stat-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid={`text-stat-value-${index}`}>
                  {stat.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>{t("dashboard.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  data-testid={`button-quick-action-${index}`}
                >
                  <span className="flex items-center gap-2">
                    <action.icon className="h-4 w-4" />
                    {action.label}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>{t("dashboard.recentActivity")}</CardTitle>
            <Link href="/time-records">
              <Button variant="ghost" size="sm" data-testid="button-view-all-activity">
                {t("dashboard.viewAll")}
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  {t("common.loading")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
