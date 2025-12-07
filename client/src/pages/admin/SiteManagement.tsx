import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ManagerGuard } from "@/components/RoleGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Building, Search, Pencil, MapPin, Clock, DollarSign, Users, Plus, Trash2 } from "lucide-react";
import type { Site, Client, User, SiteAssignment } from "@shared/schema";

const siteFormSchema = z.object({
  name: z.string().min(1, "Site name is required"),
  address: z.string().min(1, "Address is required"),
  clientId: z.string().min(1, "Client is required"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  geofenceRadius: z.coerce.number().min(10).max(1000).default(100),
  workStartTime: z.string().default("08:00"),
  workEndTime: z.string().default("17:00"),
  billingType: z.enum(["hourly", "daily", "fixed"]).default("hourly"),
  hourlyRate: z.string().optional(),
  status: z.enum(["active", "completed", "paused"]).default("active"),
});

type SiteFormData = z.infer<typeof siteFormSchema>;

const assignmentSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  role: z.enum(["worker", "supervisor"]).default("worker"),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

function SiteManagementContent() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [assigningSite, setAssigningSite] = useState<Site | null>(null);
  const [deletingSite, setDeletingSite] = useState<Site | null>(null);

  const { data: sites = [], isLoading } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: assignments = [] } = useQuery<SiteAssignment[]>({
    queryKey: ["/api/sites", assigningSite?.id, "assignments"],
    enabled: !!assigningSite,
  });

  const form = useForm<SiteFormData>({
    resolver: zodResolver(siteFormSchema),
    defaultValues: {
      name: "",
      address: "",
      clientId: "",
      latitude: "",
      longitude: "",
      geofenceRadius: 100,
      workStartTime: "08:00",
      workEndTime: "17:00",
      billingType: "hourly",
      hourlyRate: "",
      status: "active",
    },
  });

  const assignmentForm = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      userId: "",
      role: "worker",
    },
  });

  const createSiteMutation = useMutation({
    mutationFn: async (data: SiteFormData) => {
      return apiRequest("POST", "/api/sites", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({ title: t("common.save"), description: "Site created successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to create site" });
    },
  });

  const updateSiteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SiteFormData> }) => {
      return apiRequest("PATCH", `/api/sites/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      setEditingSite(null);
      form.reset();
      toast({ title: t("common.save"), description: "Site updated successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to update site" });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentFormData & { siteId: string }) => {
      return apiRequest("POST", "/api/site-assignments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites", assigningSite?.id, "assignments"] });
      assignmentForm.reset();
      toast({ title: t("common.save"), description: "Worker assigned successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to assign worker" });
    },
  });

  const deleteSiteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/sites/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      setDeletingSite(null);
      toast({ title: t("common.delete"), description: "Site deleted successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete site" });
    },
  });

  const filteredSites = sites.filter((site) => {
    const matchesSearch =
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || site.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = (data: SiteFormData) => {
    if (editingSite) {
      updateSiteMutation.mutate({ id: editingSite.id, data });
    } else {
      createSiteMutation.mutate(data);
    }
  };

  const handleEdit = (site: Site) => {
    setEditingSite(site);
    form.reset({
      name: site.name,
      address: site.address,
      clientId: site.clientId,
      latitude: site.latitude || "",
      longitude: site.longitude || "",
      geofenceRadius: site.geofenceRadius || 100,
      workStartTime: site.workStartTime || "08:00",
      workEndTime: site.workEndTime || "17:00",
      billingType: (site.billingType as "hourly" | "daily" | "fixed") || "hourly",
      hourlyRate: site.hourlyRate || "",
      status: (site.status as "active" | "completed" | "paused") || "active",
    });
  };

  const handleAssignWorker = (data: AssignmentFormData) => {
    if (!assigningSite) return;
    createAssignmentMutation.mutate({ ...data, siteId: assigningSite.id });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "completed": return "secondary";
      case "paused": return "outline";
      default: return "secondary";
    }
  };

  const getBillingTypeLabel = (type: string) => {
    switch (type) {
      case "hourly": return "Per Hour";
      case "daily": return "Per Day";
      case "fixed": return "Fixed Price";
      default: return type;
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Unknown";
  };

  const employees = users.filter(u => u.role === "employee" || u.role === "manager");

  const assignedUserIds = assignments.map(a => a.userId);
  const availableEmployees = employees.filter(e => !assignedUserIds.includes(e.id));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.siteManagement")}</h1>
          <p className="text-muted-foreground">
            Manage construction sites, configure billing and worker assignments
          </p>
        </div>
        <Dialog open={isAddDialogOpen || !!editingSite} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingSite(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-site">
              <Plus className="h-4 w-4 mr-2" />
              Add Site
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSite ? "Edit Site" : "Add New Site"}
              </DialogTitle>
              <DialogDescription>
                {editingSite ? "Update site configuration" : "Create a new construction site"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Downtown Office Building" data-testid="input-site-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-client">
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full site address" data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. 52.3676" data-testid="input-latitude" />
                        </FormControl>
                        <FormDescription>For GPS geofencing</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. 4.9041" data-testid="input-longitude" />
                        </FormControl>
                        <FormDescription>For GPS geofencing</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="geofenceRadius"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Geofence Radius (meters)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-geofence-radius" />
                      </FormControl>
                      <FormDescription>Maximum distance from site center for valid check-ins</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="workStartTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-work-start" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workEndTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-work-end" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="billingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-billing-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="hourly">Per Hour</SelectItem>
                            <SelectItem value="daily">Per Day</SelectItem>
                            <SelectItem value="fixed">Fixed Price</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hourlyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} placeholder="0.00" data-testid="input-rate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={createSiteMutation.isPending || updateSiteMutation.isPending} data-testid="button-save-site">
                    {t("common.save")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!assigningSite} onOpenChange={(open) => {
        if (!open) {
          setAssigningSite(null);
          assignmentForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Workers to {assigningSite?.name}</DialogTitle>
            <DialogDescription>
              Assign employees to work at this construction site
            </DialogDescription>
          </DialogHeader>
          
          {assignments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Currently Assigned</h4>
              <div className="flex flex-wrap gap-2">
                {assignments.map((assignment) => {
                  const user = users.find(u => u.id === assignment.userId);
                  return (
                    <Badge key={assignment.id} variant="secondary">
                      {user?.firstName} {user?.lastName}
                      {assignment.role === "supervisor" && " (Supervisor)"}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <Form {...assignmentForm}>
            <form onSubmit={assignmentForm.handleSubmit(handleAssignWorker)} className="space-y-4">
              <FormField
                control={assignmentForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-employee">
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableEmployees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName} ({employee.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={assignmentForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role at Site</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assignment-role">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="worker">Worker</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createAssignmentMutation.isPending || availableEmployees.length === 0} data-testid="button-assign-worker">
                  Assign Worker
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-sites"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sites found</p>
              <p className="text-sm">Create your first construction site to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Work Hours</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSites.map((site) => (
                  <TableRow key={site.id} data-testid={`row-site-${site.id}`}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{site.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">{site.address}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getClientName(site.clientId)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {site.workStartTime || "08:00"} - {site.workEndTime || "17:00"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {getBillingTypeLabel(site.billingType || "hourly")}
                        </Badge>
                        {site.hourlyRate && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            {site.hourlyRate}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(site.status || "active")}>
                        {site.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setAssigningSite(site)}
                          data-testid={`button-assign-site-${site.id}`}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(site)}
                          data-testid={`button-edit-site-${site.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingSite(site)}
                          data-testid={`button-delete-site-${site.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingSite} onOpenChange={(open) => !open && setDeletingSite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSite?.name}"? This action cannot be undone.
              All associated assignments and records will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSite && deleteSiteMutation.mutate(deletingSite.id)}
              disabled={deleteSiteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteSiteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SiteManagement() {
  return (
    <ManagerGuard>
      <SiteManagementContent />
    </ManagerGuard>
  );
}
