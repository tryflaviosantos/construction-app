import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SuperAdminGuard } from "@/components/RoleGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Shield, Building2, Users, Search, Edit, CheckCircle, XCircle, Clock, AlertTriangle, UserCheck, Plus, UserPlus } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import type { Tenant, User } from "@shared/schema";

interface EnrichedTenant extends Tenant {
  userCount: number;
  adminCount: number;
  managerCount: number;
  employeeCount: number;
}

interface TenantUser extends User {
  tenantName?: string;
}

const initialCreateForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  subscriptionPlan: "basic",
  subscriptionStatus: "active",
  adminEmail: "",
  adminPassword: "",
  adminFirstName: "",
  adminLastName: "",
};

const initialUserForm = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  role: "employee",
};

function TenantManagementContent() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { impersonate, isImpersonatePending, isImpersonating, impersonatedTenantName, impersonatedTenantId } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTenant, setEditingTenant] = useState<EnrichedTenant | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [editForm, setEditForm] = useState({
    subscriptionPlan: "",
    subscriptionStatus: "",
  });
  const [managingUsersTenant, setManagingUsersTenant] = useState<EnrichedTenant | null>(null);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [userForm, setUserForm] = useState(initialUserForm);

  const { data: tenants = [], isLoading } = useQuery<EnrichedTenant[]>({
    queryKey: ["/api/superadmin/tenants"],
  });

  const { data: allUsers = [] } = useQuery<TenantUser[]>({
    queryKey: ["/api/superadmin/users"],
  });

  const tenantUsers = managingUsersTenant
    ? allUsers.filter(u => u.tenantId === managingUsersTenant.id)
    : [];

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Tenant> }) => {
      return apiRequest("PATCH", `/api/superadmin/tenants/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/tenants"] });
      setEditingTenant(null);
      toast({
        title: "Tenant updated",
        description: "Subscription settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update tenant.",
        variant: "destructive",
      });
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: async (data: typeof initialCreateForm) => {
      return apiRequest("POST", "/api/superadmin/tenants", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/tenants"] });
      setIsCreateDialogOpen(false);
      setCreateForm(initialCreateForm);
      toast({
        title: "Tenant created",
        description: "New company and admin user created successfully.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create tenant.",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof initialUserForm & { tenantId: string }) => {
      return apiRequest("POST", "/api/superadmin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/tenants"] });
      setIsAddUserDialogOpen(false);
      setUserForm(initialUserForm);
      toast({
        title: "User created",
        description: "New user has been added to the company.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create user.",
      });
    },
  });

  const handleCreateTenant = () => {
    if (!createForm.name) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Company name is required.",
      });
      return;
    }
    createTenantMutation.mutate(createForm);
  };

  const handleCreateUser = () => {
    if (!userForm.email || !userForm.password) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Email and password are required.",
      });
      return;
    }
    if (!managingUsersTenant) return;
    createUserMutation.mutate({ ...userForm, tenantId: managingUsersTenant.id });
  };

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case "trial":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Trial</Badge>;
      case "suspended":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Suspended</Badge>;
      case "cancelled":
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  const getPlanBadge = (plan: string | null) => {
    switch (plan) {
      case "basic":
        return <Badge variant="outline">Basic</Badge>;
      case "professional":
        return <Badge variant="secondary">Professional</Badge>;
      case "enterprise":
        return <Badge variant="default">Enterprise</Badge>;
      default:
        return <Badge variant="outline">{plan || "None"}</Badge>;
    }
  };

  const handleEdit = (tenant: EnrichedTenant) => {
    setEditingTenant(tenant);
    setEditForm({
      subscriptionPlan: tenant.subscriptionPlan || "basic",
      subscriptionStatus: tenant.subscriptionStatus || "active",
    });
  };

  const handleSave = () => {
    if (!editingTenant) return;
    updateTenantMutation.mutate({
      id: editingTenant.id,
      data: editForm,
    });
  };

  const handleImpersonate = (tenant: EnrichedTenant) => {
    impersonate(tenant.id, {
      onSuccess: () => {
        toast({
          title: "Impersonation Started",
          description: `You are now viewing data as ${tenant.name}. Go to Dashboard to see their data.`,
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to start impersonation.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Tenant Management
        </h1>
        <p className="text-muted-foreground">
          View and manage all registered companies and their subscriptions
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                All Tenants ({tenants.length})
              </CardTitle>
              <CardDescription>
                Manage subscription plans and status for all registered companies
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tenants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-tenants"
                />
              </div>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                data-testid="button-add-tenant"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tenant
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading tenants...</div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No tenants match your search" : "No tenants registered yet"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{tenant.name}</div>
                          <div className="text-sm text-muted-foreground">{tenant.email || "No email"}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(tenant.subscriptionPlan)}</TableCell>
                      <TableCell>{getStatusBadge(tenant.subscriptionStatus)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{tenant.userCount}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tenant.adminCount}A / {tenant.managerCount}M / {tenant.employeeCount}E
                        </div>
                      </TableCell>
                      <TableCell>
                        {tenant.createdAt
                          ? format(new Date(tenant.createdAt), "MMM d, yyyy")
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setManagingUsersTenant(tenant)}
                            title="Manage users"
                            data-testid={`button-manage-users-${tenant.id}`}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleImpersonate(tenant)}
                            disabled={isImpersonatePending || impersonatedTenantId === tenant.id}
                            title="Impersonate this tenant"
                            data-testid={`button-impersonate-tenant-${tenant.id}`}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(tenant)}
                            data-testid={`button-edit-tenant-${tenant.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingTenant} onOpenChange={() => setEditingTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tenant Subscription</DialogTitle>
            <DialogDescription>
              Update subscription plan and status for {editingTenant?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subscription Plan</Label>
              <Select
                value={editForm.subscriptionPlan}
                onValueChange={(value) => setEditForm({ ...editForm, subscriptionPlan: value })}
              >
                <SelectTrigger data-testid="select-subscription-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subscription Status</Label>
              <Select
                value={editForm.subscriptionStatus}
                onValueChange={(value) => setEditForm({ ...editForm, subscriptionStatus: value })}
              >
                <SelectTrigger data-testid="select-subscription-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingTenant(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateTenantMutation.isPending}
              data-testid="button-save-tenant"
            >
              {updateTenantMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>
              Add a new company and optionally create an admin user for it
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="font-medium">Company Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Company Name *</Label>
                  <Input
                    id="create-name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Acme Construction"
                    data-testid="input-create-tenant-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-email">Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="contact@acme.com"
                    data-testid="input-create-tenant-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-phone">Phone</Label>
                  <Input
                    id="create-phone"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+1 234 567 890"
                    data-testid="input-create-tenant-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-address">Address</Label>
                  <Input
                    id="create-address"
                    value={createForm.address}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                    placeholder="123 Main St"
                    data-testid="input-create-tenant-address"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subscription Plan</Label>
                  <Select
                    value={createForm.subscriptionPlan}
                    onValueChange={(value) => setCreateForm({ ...createForm, subscriptionPlan: value })}
                  >
                    <SelectTrigger data-testid="select-create-subscription-plan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subscription Status</Label>
                  <Select
                    value={createForm.subscriptionStatus}
                    onValueChange={(value) => setCreateForm({ ...createForm, subscriptionStatus: value })}
                  >
                    <SelectTrigger data-testid="select-create-subscription-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Admin User (Optional)</h3>
              <p className="text-sm text-muted-foreground">
                Create an admin user for this company. Leave blank to create without admin.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-admin-first-name">First Name</Label>
                  <Input
                    id="create-admin-first-name"
                    value={createForm.adminFirstName}
                    onChange={(e) => setCreateForm({ ...createForm, adminFirstName: e.target.value })}
                    placeholder="John"
                    data-testid="input-create-admin-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-admin-last-name">Last Name</Label>
                  <Input
                    id="create-admin-last-name"
                    value={createForm.adminLastName}
                    onChange={(e) => setCreateForm({ ...createForm, adminLastName: e.target.value })}
                    placeholder="Doe"
                    data-testid="input-create-admin-last-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-admin-email">Admin Email / Username</Label>
                  <Input
                    id="create-admin-email"
                    value={createForm.adminEmail}
                    onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                    placeholder="john@acme.com"
                    data-testid="input-create-admin-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-admin-password">Password</Label>
                  <Input
                    id="create-admin-password"
                    type="password"
                    value={createForm.adminPassword}
                    onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                    placeholder="Secure password"
                    data-testid="input-create-admin-password"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setCreateForm(initialCreateForm);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTenant}
              disabled={createTenantMutation.isPending}
              data-testid="button-create-tenant-submit"
            >
              {createTenantMutation.isPending ? "Creating..." : "Create Tenant"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!managingUsersTenant} onOpenChange={() => setManagingUsersTenant(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Users - {managingUsersTenant?.name}</DialogTitle>
            <DialogDescription>
              View and add users for this company
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium">Users ({tenantUsers.length})</h3>
              <Button
                size="sm"
                onClick={() => setIsAddUserDialogOpen(true)}
                data-testid="button-add-user"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
            {tenantUsers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No users in this company yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge variant="default" className="bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setManagingUsersTenant(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User to {managingUsersTenant?.name}</DialogTitle>
            <DialogDescription>
              Create a new user for this company
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-first-name">First Name</Label>
                <Input
                  id="user-first-name"
                  value={userForm.firstName}
                  onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                  placeholder="John"
                  data-testid="input-user-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-last-name">Last Name</Label>
                <Input
                  id="user-last-name"
                  value={userForm.lastName}
                  onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                  placeholder="Doe"
                  data-testid="input-user-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email / Username *</Label>
              <Input
                id="user-email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="john@company.com"
                data-testid="input-user-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">Password *</Label>
              <Input
                id="user-password"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Secure password"
                data-testid="input-user-password"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={userForm.role}
                onValueChange={(value) => setUserForm({ ...userForm, role: value })}
              >
                <SelectTrigger data-testid="select-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddUserDialogOpen(false);
                setUserForm(initialUserForm);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
              data-testid="button-create-user-submit"
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TenantManagement() {
  return (
    <SuperAdminGuard>
      <TenantManagementContent />
    </SuperAdminGuard>
  );
}
