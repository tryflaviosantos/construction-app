import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { NotificationBell } from "@/components/NotificationBell";
import { AppSidebar } from "@/components/AppSidebar";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { useAuth } from "@/hooks/useAuth";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import TimeTracking from "@/pages/TimeTracking";
import Tools from "@/pages/Tools";
import Leave from "@/pages/Leave";
import Payroll from "@/pages/Payroll";
import Sites from "@/pages/Sites";
import Employees from "@/pages/Employees";
import ClientPortal from "@/pages/ClientPortal";
import Settings from "@/pages/Settings";
import Analytics from "@/pages/Analytics";
import Documents from "@/pages/Documents";
import Chat from "@/pages/Chat";
import UserManagement from "@/pages/admin/UserManagement";
import SiteManagement from "@/pages/admin/SiteManagement";
import ClientManagement from "@/pages/admin/ClientManagement";
import ToolManagement from "@/pages/admin/ToolManagement";
import TimesheetApprovals from "@/pages/admin/TimesheetApprovals";
import LeaveApprovals from "@/pages/admin/LeaveApprovals";
import ServiceOrders from "@/pages/admin/ServiceOrders";
import CompanySettings from "@/pages/admin/CompanySettings";
import Subscriptions from "@/pages/superadmin/Subscriptions";
import TenantManagement from "@/pages/superadmin/TenantManagement";
import "@/lib/i18n";

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="sticky top-0 z-50">
            <ImpersonationBanner />
            <header className="flex items-center justify-between gap-2 p-2 border-b bg-background">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-2 flex-wrap">
                <NotificationBell />
                <LanguageSelector />
                <ThemeToggle />
              </div>
            </header>
          </div>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/time-tracking" component={TimeTracking} />
              <Route path="/tools" component={Tools} />
              <Route path="/leave" component={Leave} />
              <Route path="/payroll" component={Payroll} />
              <Route path="/sites" component={Sites} />
              <Route path="/employees" component={Employees} />
              <Route path="/client-portal" component={ClientPortal} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/documents" component={Documents} />
              <Route path="/chat" component={Chat} />
              <Route path="/settings" component={Settings} />
              <Route path="/admin/users" component={UserManagement} />
              <Route path="/admin/sites" component={SiteManagement} />
              <Route path="/admin/clients" component={ClientManagement} />
              <Route path="/admin/tools" component={ToolManagement} />
              <Route path="/admin/timesheets" component={TimesheetApprovals} />
              <Route path="/admin/leave" component={LeaveApprovals} />
              <Route path="/admin/service-orders" component={ServiceOrders} />
              <Route path="/admin/company" component={CompanySettings} />
              <Route path="/superadmin/subscriptions" component={Subscriptions} />
              <Route path="/superadmin/tenants" component={TenantManagement} />
              <Route component={Dashboard} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">
        {user ? <AuthenticatedApp /> : <Landing />}
      </Route>
      <Route path="/login">
        {user ? <AuthenticatedApp /> : <Login />}
      </Route>
      <Route path="/dashboard">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/time-tracking">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/tools">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/leave">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/payroll">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/sites">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/employees">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/client-portal">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/analytics">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/documents">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/settings">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/admin/users">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/admin/sites">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/admin/clients">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/admin/tools">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/admin/timesheets">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/admin/leave">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/admin/service-orders">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/admin/company">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/superadmin/subscriptions">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route path="/superadmin/tenants">{user ? <AuthenticatedApp /> : <Landing />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
          <PWAInstallPrompt />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
