import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Clock,
  Wrench,
  Building2,
  Users,
  Calendar,
  Calculator,
  Settings,
  LogOut,
  HardHat,
  FileCheck,
  BarChart3,
  FolderOpen,
  MessageCircle,
  UserCog,
  ClipboardList,
  CalendarCheck,
  Building,
  FileText,
  CreditCard,
  Shield,
} from "lucide-react";

export function AppSidebar() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { user, logout, isManager, isAdmin, isSuperAdmin, isClient } = useAuth();

  // Employee/worker menu items (NOT for superadmin)
  const mainMenuItems = [
    { title: t("nav.dashboard"), url: "/dashboard", icon: LayoutDashboard },
    { title: t("nav.timeRecords"), url: "/time-tracking", icon: Clock },
    { title: t("nav.tools"), url: "/tools", icon: Wrench },
    { title: t("nav.leave"), url: "/leave", icon: Calendar },
  ];

  // Manager-level menu items (NOT for superadmin)
  const managerMenuItems = [
    { title: t("nav.sites"), url: "/sites", icon: Building2 },
    { title: t("nav.employees"), url: "/employees", icon: Users },
    { title: t("nav.payroll"), url: "/payroll", icon: Calculator },
    { title: t("nav.analytics"), url: "/analytics", icon: BarChart3 },
    { title: t("nav.documents"), url: "/documents", icon: FolderOpen },
    { title: t("nav.chat"), url: "/chat", icon: MessageCircle },
  ];

  // Admin-level tenant management items (NOT for superadmin - they use impersonation)
  const adminMenuItems = [
    { title: t("admin.userManagement"), url: "/admin/users", icon: UserCog },
    { title: t("admin.siteManagement"), url: "/admin/sites", icon: Building },
    { title: t("admin.clientManagement"), url: "/admin/clients", icon: Users },
    { title: t("admin.toolManagement"), url: "/admin/tools", icon: Wrench },
    { title: t("admin.timesheets"), url: "/admin/timesheets", icon: ClipboardList },
    { title: t("admin.leaveApprovals"), url: "/admin/leave", icon: CalendarCheck },
    { title: t("admin.serviceOrders"), url: "/admin/service-orders", icon: FileText },
    { title: t("admin.companySettings"), url: "/admin/company", icon: Building2 },
  ];

  // Platform-level superadmin items ONLY
  const superAdminMenuItems = [
    { title: t("admin.tenantManagement", "Gestão de Empresas"), url: "/superadmin/tenants", icon: Shield },
    { title: t("admin.subscriptions"), url: "/superadmin/subscriptions", icon: CreditCard },
  ];
  
  // Check if user is a tenant admin/manager but NOT superadmin
  const isTenantManager = isManager && !isSuperAdmin;
  const isTenantAdmin = isAdmin && !isSuperAdmin;

  const clientMenuItems = [
    { title: t("client.myProjects"), url: "/client-portal", icon: FileCheck },
  ];

  const getInitials = () => {
    return `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || "U";
  };

  const getRoleBadge = () => {
    if (isSuperAdmin) return <Badge variant="destructive" className="text-xs">{t("roles.superadmin")}</Badge>;
    if (isAdmin) return <Badge variant="default" className="text-xs">{t("roles.admin")}</Badge>;
    if (isManager) return <Badge variant="secondary" className="text-xs">{t("roles.manager")}</Badge>;
    return null;
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <HardHat className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">ConstructTrack</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Client Portal - for clients only */}
        {isClient && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("client.myProjects")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {clientMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                    >
                      <Link href={item.url} data-testid={`nav-${item.url.slice(1)}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* SuperAdmin sees ONLY platform management */}
        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("admin.platformManagement", "Gestão da Plataforma")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/dashboard"}
                  >
                    <Link href="/dashboard" data-testid="nav-dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>{t("nav.dashboard")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {superAdminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url || location.startsWith(item.url)}
                    >
                      <Link href={item.url} data-testid={`nav-${item.url.replace(/\//g, '-').slice(1)}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Regular employees see main menu */}
        {!isClient && !isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("nav.home")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                    >
                      <Link href={item.url} data-testid={`nav-${item.url.slice(1)}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Tenant managers and admins see management section */}
        {(isTenantManager || isTenantAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("nav.management", "Gestão")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managerMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                    >
                      <Link href={item.url} data-testid={`nav-${item.url.slice(1)}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Tenant admins and managers see administration section */}
        {(isTenantManager || isTenantAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("admin.title")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url || location.startsWith(item.url)}
                    >
                      <Link href={item.url} data-testid={`nav-${item.url.replace(/\//g, '-').slice(1)}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/settings"}
                >
                  <Link href="/settings" data-testid="nav-settings">
                    <Settings className="h-4 w-4" />
                    <span>{t("nav.settings")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              {getRoleBadge()}
            </div>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
