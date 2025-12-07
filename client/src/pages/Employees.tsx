import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Clock,
  Calendar,
  Shield,
} from "lucide-react";
import type { User, Site } from "@shared/schema";

export default function Employees() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "employee",
    hourlyRate: "",
    pin: "",
  });

  const { data: employees, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: sites } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/users", {
        ...data,
        hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: t("employees.addEmployee"), description: "Employee added successfully" });
      setShowAddDialog(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add employee", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      role: "employee",
      hourlyRate: "",
      pin: "",
    });
  };

  const filteredEmployees = employees?.filter((emp) => {
    const matchesSearch =
      emp.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      emp.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || emp.role === filter;
    return matchesSearch && matchesFilter;
  });

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      admin: "destructive",
      manager: "default",
      employee: "secondary",
    };
    return <Badge variant={variants[role] || "secondary"}>{t(`employees.${role}`)}</Badge>;
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">{t("nav.employees")}</h1>
        <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-employee">
          <Plus className="mr-2 h-4 w-4" />
          {t("employees.addEmployee")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("employees.admin")}s
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees?.filter((e) => e.role === "admin").length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("employees.manager")}s
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees?.filter((e) => e.role === "manager").length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("employees.employee")}s
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees?.filter((e) => e.role === "employee").length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-employees"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-employees">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">{t("employees.admin")}</SelectItem>
            <SelectItem value="manager">{t("employees.manager")}</SelectItem>
            <SelectItem value="employee">{t("employees.employee")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>{t("employees.role")}</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">{t("employees.hourlyRate")}</TableHead>
                  <TableHead className="text-right">{t("employees.vacationBalance")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredEmployees?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees?.map((employee) => (
                    <TableRow key={employee.id} data-testid={`employee-row-${employee.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={employee.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {getInitials(employee.firstName, employee.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {employee.firstName} {employee.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{employee.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(employee.role)}</TableCell>
                      <TableCell>
                        {employee.phone && (
                          <span className="text-sm text-muted-foreground">{employee.phone}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {employee.hourlyRate ? `$${employee.hourlyRate}` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {employee.vacationDaysBalance ?? 22} {t("common.days")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.isActive ? "default" : "secondary"}>
                          {employee.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" data-testid={`button-view-employee-${employee.id}`}>
                          {t("common.view")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("employees.addEmployee")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">First Name</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First Name"
                  data-testid="input-first-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Last Name</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last Name"
                  data-testid="input-last-name"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                data-testid="input-email"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Phone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1234567890"
                data-testid="input-phone"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t("employees.role")}</label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger data-testid="select-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">{t("employees.employee")}</SelectItem>
                    <SelectItem value="manager">{t("employees.manager")}</SelectItem>
                    <SelectItem value="admin">{t("employees.admin")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{t("employees.hourlyRate")}</label>
                <Input
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-hourly-rate"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">PIN (6 digits)</label>
              <Input
                type="password"
                maxLength={6}
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                placeholder="Enter PIN"
                data-testid="input-pin"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.email || !formData.firstName || createMutation.isPending}
                data-testid="button-save-employee"
              >
                {t("common.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
