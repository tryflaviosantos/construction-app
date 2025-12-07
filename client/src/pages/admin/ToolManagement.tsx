import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ManagerGuard } from "@/components/RoleGuard";
import { useAuth } from "@/hooks/useAuth";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  Wrench, 
  Search, 
  Pencil, 
  Plus, 
  Trash2, 
  QrCode,
  Package,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import type { Tool, Site, User } from "@shared/schema";

const toolFormSchema = z.object({
  name: z.string().min(1, "Tool name is required"),
  category: z.string().optional(),
  serialNumber: z.string().optional(),
  estimatedValue: z.string().optional(),
  status: z.enum(["available", "in_use", "maintenance", "lost", "stolen"]).default("available"),
});

type ToolFormData = z.infer<typeof toolFormSchema>;

const checkoutSchema = z.object({
  siteId: z.string().optional(),
  notes: z.string().optional(),
  condition: z.enum(["good", "damaged"]).default("good"),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface ToolTransaction {
  id: string;
  toolId: string;
  userId: string;
  siteId: string | null;
  type: string;
  notes: string | null;
  condition: string | null;
  createdAt: string;
}

function ToolManagementContent() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { canManageTools, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [deletingTool, setDeletingTool] = useState<Tool | null>(null);
  const [checkoutTool, setCheckoutTool] = useState<Tool | null>(null);
  const [checkinTool, setCheckinTool] = useState<Tool | null>(null);
  const [viewingTransactions, setViewingTransactions] = useState<Tool | null>(null);

  const { data: tools = [], isLoading } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
  });

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: transactions = [] } = useQuery<ToolTransaction[]>({
    queryKey: ["/api/tools", viewingTransactions?.id, "transactions"],
    enabled: !!viewingTransactions,
  });

  const form = useForm<ToolFormData>({
    resolver: zodResolver(toolFormSchema),
    defaultValues: {
      name: "",
      category: "",
      serialNumber: "",
      estimatedValue: "",
      status: "available",
    },
  });

  const checkoutForm = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      siteId: "",
      notes: "",
      condition: "good",
    },
  });

  const checkinForm = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      siteId: "",
      notes: "",
      condition: "good",
    },
  });

  const createToolMutation = useMutation({
    mutationFn: async (data: ToolFormData) => {
      return apiRequest("POST", "/api/tools", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({ title: t("common.save"), description: "Tool created successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to create tool" });
    },
  });

  const updateToolMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ToolFormData> }) => {
      return apiRequest("PATCH", `/api/tools/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      setEditingTool(null);
      form.reset();
      toast({ title: t("common.save"), description: "Tool updated successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to update tool" });
    },
  });

  const deleteToolMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tools/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      setDeletingTool(null);
      toast({ title: t("common.delete"), description: "Tool deleted successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete tool" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CheckoutFormData }) => {
      return apiRequest("POST", `/api/tools/${id}/checkout`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      setCheckoutTool(null);
      checkoutForm.reset();
      toast({ title: "Success", description: "Tool checked out successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to checkout tool" });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CheckoutFormData }) => {
      return apiRequest("POST", `/api/tools/${id}/checkin`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      setCheckinTool(null);
      checkinForm.reset();
      toast({ title: "Success", description: "Tool returned successfully" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to return tool" });
    },
  });

  const filteredTools = tools.filter((tool) => {
    const matchesSearch = 
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || tool.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = (data: ToolFormData) => {
    if (editingTool) {
      updateToolMutation.mutate({ id: editingTool.id, data });
    } else {
      createToolMutation.mutate(data);
    }
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    form.reset({
      name: tool.name,
      category: tool.category || "",
      serialNumber: tool.serialNumber || "",
      estimatedValue: tool.estimatedValue || "",
      status: tool.status as "available" | "in_use" | "maintenance" | "lost" | "stolen" || "available",
    });
  };

  const handleCheckout = (data: CheckoutFormData) => {
    if (checkoutTool) {
      checkoutMutation.mutate({ id: checkoutTool.id, data });
    }
  };

  const handleCheckin = (data: CheckoutFormData) => {
    if (checkinTool) {
      checkinMutation.mutate({ id: checkinTool.id, data });
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "available":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Available</Badge>;
      case "in_use":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />In Use</Badge>;
      case "maintenance":
        return <Badge variant="outline"><Wrench className="w-3 h-3 mr-1" />Maintenance</Badge>;
      case "lost":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Lost</Badge>;
      case "stolen":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Stolen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCurrentUser = (userId: string | null) => {
    if (!userId) return "-";
    const currentUser = users.find(u => u.id === userId);
    return currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : userId;
  };

  const getCurrentSite = (siteId: string | null) => {
    if (!siteId) return "-";
    const site = sites.find(s => s.id === siteId);
    return site?.name || siteId;
  };

  const toolStats = {
    total: tools.length,
    available: tools.filter(t => t.status === "available").length,
    inUse: tools.filter(t => t.status === "in_use").length,
    maintenance: tools.filter(t => t.status === "maintenance").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("admin.toolManagement")}</h1>
          <p className="text-muted-foreground">
            Manage company tools and track check-in/check-out
          </p>
        </div>
        {canManageTools && (
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-tool">
            <Plus className="w-4 h-4 mr-2" />
            Add Tool
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{toolStats.total}</p>
                <p className="text-sm text-muted-foreground">Total Tools</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{toolStats.available}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{toolStats.inUse}</p>
                <p className="text-sm text-muted-foreground">In Use</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{toolStats.maintenance}</p>
                <p className="text-sm text-muted-foreground">Maintenance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search tools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
                data-testid="input-search-tools"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="in_use">In Use</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="stolen">Stolen</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading tools...</div>
          ) : filteredTools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== "all" ? "No tools match your search" : "No tools found. Add your first tool to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current User</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTools.map((tool) => (
                  <TableRow key={tool.id} data-testid={`row-tool-${tool.id}`}>
                    <TableCell className="font-medium">{tool.name}</TableCell>
                    <TableCell>{tool.category || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">{tool.serialNumber || "-"}</TableCell>
                    <TableCell>{getStatusBadge(tool.status)}</TableCell>
                    <TableCell>{getCurrentUser(tool.currentUserId)}</TableCell>
                    <TableCell>{getCurrentSite(tool.currentSiteId)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {tool.status === "available" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCheckoutTool(tool);
                              checkoutForm.reset();
                            }}
                            data-testid={`button-checkout-${tool.id}`}
                          >
                            <ArrowRightLeft className="w-4 h-4 mr-1" />
                            Borrow
                          </Button>
                        )}
                        {tool.status === "in_use" && tool.currentUserId === user?.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCheckinTool(tool);
                              checkinForm.reset();
                            }}
                            data-testid={`button-checkin-${tool.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Return
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setViewingTransactions(tool)}
                          data-testid={`button-history-${tool.id}`}
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                        {canManageTools && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(tool)}
                              data-testid={`button-edit-${tool.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeletingTool(tool)}
                              data-testid={`button-delete-${tool.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen || !!editingTool} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setEditingTool(null);
          form.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTool ? "Edit Tool" : "Add New Tool"}</DialogTitle>
            <DialogDescription>
              {editingTool ? "Update tool information" : "Add a new tool to the inventory"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tool Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Power Drill" data-testid="input-tool-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Power Tools" data-testid="input-tool-category" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. SN-12345" data-testid="input-tool-serial" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimatedValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Value</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-tool-value" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {editingTool && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-tool-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="in_use">In Use</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                          <SelectItem value="stolen">Stolen</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingTool(null);
                    form.reset();
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createToolMutation.isPending || updateToolMutation.isPending}
                  data-testid="button-save-tool"
                >
                  {createToolMutation.isPending || updateToolMutation.isPending ? "Saving..." : t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkoutTool} onOpenChange={(open) => {
        if (!open) {
          setCheckoutTool(null);
          checkoutForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borrow Tool</DialogTitle>
            <DialogDescription>
              Checking out: {checkoutTool?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...checkoutForm}>
            <form onSubmit={checkoutForm.handleSubmit(handleCheckout)} className="space-y-4">
              <FormField
                control={checkoutForm.control}
                name="siteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-checkout-site">
                          <SelectValue placeholder="Select a site" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={checkoutForm.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tool Condition</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-checkout-condition">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="damaged">Damaged</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={checkoutForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Any notes..." data-testid="input-checkout-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCheckoutTool(null);
                    checkoutForm.reset();
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  disabled={checkoutMutation.isPending}
                  data-testid="button-confirm-checkout"
                >
                  {checkoutMutation.isPending ? "Processing..." : "Borrow Tool"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkinTool} onOpenChange={(open) => {
        if (!open) {
          setCheckinTool(null);
          checkinForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Tool</DialogTitle>
            <DialogDescription>
              Returning: {checkinTool?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...checkinForm}>
            <form onSubmit={checkinForm.handleSubmit(handleCheckin)} className="space-y-4">
              <FormField
                control={checkinForm.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tool Condition on Return</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-checkin-condition">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="damaged">Damaged</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={checkinForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Any notes about the return..." data-testid="input-checkin-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCheckinTool(null);
                    checkinForm.reset();
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  disabled={checkinMutation.isPending}
                  data-testid="button-confirm-checkin"
                >
                  {checkinMutation.isPending ? "Processing..." : "Return Tool"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingTransactions} onOpenChange={(open) => {
        if (!open) setViewingTransactions(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tool History: {viewingTransactions?.name}</DialogTitle>
            <DialogDescription>
              Check-in/check-out transaction history
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found for this tool
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.type === "checkout" ? "secondary" : "default"}>
                          {tx.type === "checkout" ? "Borrowed" : "Returned"}
                        </Badge>
                      </TableCell>
                      <TableCell>{getCurrentUser(tx.userId)}</TableCell>
                      <TableCell>
                        <Badge variant={tx.condition === "good" ? "outline" : "destructive"}>
                          {tx.condition || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingTransactions(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTool} onOpenChange={(open) => !open && setDeletingTool(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tool</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTool?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTool && deleteToolMutation.mutate(deletingTool.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteToolMutation.isPending ? "Deleting..." : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ToolManagement() {
  return (
    <ManagerGuard>
      <ToolManagementContent />
    </ManagerGuard>
  );
}
