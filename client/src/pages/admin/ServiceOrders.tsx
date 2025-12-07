import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ManagerGuard } from "@/components/RoleGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { 
  FileText, 
  Calculator,
  Calendar,
  Building2,
  Clock,
  DollarSign,
  Download,
  Eye,
  Users,
  MapPin,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from "lucide-react";
import type { Site, Client } from "@shared/schema";

interface ServiceOrder {
  siteId: string;
  siteName: string;
  clientId: string;
  clientName: string;
  billingType: string;
  hourlyRate: number;
  totalHours: number;
  overtimeHours: number;
  regularHours: number;
  approvedRecords: number;
  pendingRecords: number;
  regularCost: number;
  overtimeCost: number;
  totalCost: number;
  workers: string[];
  workerIds: string[];
  workDays: number;
}

interface ServiceOrdersResponse {
  orders: ServiceOrder[];
  totals: {
    totalHours: number;
    overtimeHours: number;
    totalCost: number;
    approvedRecords: number;
    pendingRecords: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  overtimeMultiplier: number;
}

function ServiceOrdersContent() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const currentDate = new Date();
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(currentDate), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(currentDate), "yyyy-MM-dd"));
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [viewingOrder, setViewingOrder] = useState<ServiceOrder | null>(null);

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: serviceOrdersData, isLoading } = useQuery<ServiceOrdersResponse>({
    queryKey: ["/api/service-orders/calculate", periodStart, periodEnd, selectedSite, selectedClient],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: periodStart,
        endDate: periodEnd,
        siteId: selectedSite,
        clientId: selectedClient,
      });
      const res = await fetch(`/api/service-orders/calculate?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to calculate service orders");
      return res.json();
    },
  });

  const serviceOrders = serviceOrdersData?.orders || [];
  const totals = serviceOrdersData?.totals || {
    totalHours: 0,
    overtimeHours: 0,
    totalCost: 0,
    approvedRecords: 0,
    pendingRecords: 0,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(1) + "h";
  };

  const getBillingTypeBadge = (type: string) => {
    switch (type) {
      case "hourly":
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><Clock className="w-3 h-3 mr-1" />Hourly</Badge>;
      case "daily":
        return <Badge variant="outline" className="border-green-500 text-green-600"><Calendar className="w-3 h-3 mr-1" />Daily</Badge>;
      case "fixed":
        return <Badge variant="outline" className="border-purple-500 text-purple-600"><DollarSign className="w-3 h-3 mr-1" />Fixed</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const overtimeMultiplier = serviceOrdersData?.overtimeMultiplier || 1.5;

  const handleExportOrder = (order: ServiceOrder) => {
    const content = `
SERVICE ORDER
=============

Site: ${order.siteName}
Client: ${order.clientName}
Period: ${format(new Date(periodStart), "dd/MM/yyyy")} - ${format(new Date(periodEnd), "dd/MM/yyyy")}

SUMMARY
-------
Billing Type: ${order.billingType.charAt(0).toUpperCase() + order.billingType.slice(1)}
Rate: ${formatCurrency(order.hourlyRate)}${order.billingType === "hourly" ? "/hour" : order.billingType === "daily" ? "/day" : ""}

Hours Worked:
  Regular Hours: ${formatHours(order.regularHours)}
  Overtime Hours: ${formatHours(order.overtimeHours)}
  Total Hours: ${formatHours(order.totalHours)}

Work Days: ${order.workDays}
Workers: ${order.workers.length}
Time Records: ${order.approvedRecords} approved, ${order.pendingRecords} pending

COSTS
-----
Regular Cost: ${formatCurrency(order.regularCost)}
Overtime Cost (${overtimeMultiplier}x): ${formatCurrency(order.overtimeCost)}
----------------------
TOTAL: ${formatCurrency(order.totalCost)}

Workers:
${order.workers.map(w => `  - ${w}`).join("\n")}

Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `service-order-${order.siteName.replace(/\s+/g, "-").toLowerCase()}-${periodStart}-${periodEnd}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Service Order Exported",
      description: `Service order for ${order.siteName} has been downloaded.`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("admin.serviceOrders")}</h1>
          <p className="text-muted-foreground">
            Calculate and generate service orders based on worked hours
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-8 h-8 text-blue-600" />
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold" data-testid="text-total-hours">{formatHours(totals.totalHours)}</p>
                )}
                <p className="text-sm text-muted-foreground">Total Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-orange-600" />
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold" data-testid="text-overtime-hours">{formatHours(totals.overtimeHours)}</p>
                )}
                <p className="text-sm text-muted-foreground">Overtime</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-2xl font-bold" data-testid="text-total-cost">{formatCurrency(totals.totalCost)}</p>
                )}
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold" data-testid="text-approved-records">{totals.approvedRecords}</p>
                )}
                <p className="text-sm text-muted-foreground">Approved Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold" data-testid="text-pending-records">{totals.pendingRecords}</p>
                )}
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Service Order Calculator
          </CardTitle>
          <CardDescription>
            Select a period and filter by site or client to calculate service orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-start">Period Start</Label>
              <Input
                id="period-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-44"
                data-testid="input-period-start"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-end">Period End</Label>
              <Input
                id="period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-44"
                data-testid="input-period-end"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-filter">Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger id="client-filter" className="w-48" data-testid="select-client-filter">
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-filter">Site</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger id="site-filter" className="w-48" data-testid="select-site-filter">
                  <SelectValue placeholder="All sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Service Orders
          </CardTitle>
          <CardDescription>
            Calculated service orders for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : serviceOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-orders">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No approved time records found for the selected period.</p>
              <p className="text-sm mt-2">Adjust the date range or filters to see service orders.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Overtime</TableHead>
                  <TableHead className="text-right">Workers</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceOrders.map((order) => (
                  <TableRow key={order.siteId} data-testid={`row-order-${order.siteId}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span data-testid={`text-site-name-${order.siteId}`}>{order.siteName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span data-testid={`text-client-name-${order.siteId}`}>{order.clientName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getBillingTypeBadge(order.billingType)}</TableCell>
                    <TableCell className="text-right font-medium" data-testid={`text-hours-${order.siteId}`}>
                      {formatHours(order.totalHours)}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.overtimeHours > 0 ? (
                        <Badge variant="outline" className="border-orange-500 text-orange-600">
                          +{formatHours(order.overtimeHours)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span data-testid={`text-workers-${order.siteId}`}>{order.workers.length}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Badge variant="default" className="bg-green-600" data-testid={`badge-approved-${order.siteId}`}>
                          {order.approvedRecords}
                        </Badge>
                        {order.pendingRecords > 0 && (
                          <Badge variant="secondary" data-testid={`badge-pending-${order.siteId}`}>
                            {order.pendingRecords}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600" data-testid={`text-cost-${order.siteId}`}>
                      {formatCurrency(order.totalCost)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setViewingOrder(order)}
                          data-testid={`button-view-${order.siteId}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleExportOrder(order)}
                          data-testid={`button-export-${order.siteId}`}
                        >
                          <Download className="w-4 h-4" />
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

      <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Service Order Details
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown for {viewingOrder?.siteName}
            </DialogDescription>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-4 h-4" />Site
                  </p>
                  <p className="font-medium" data-testid="text-detail-site">
                    {viewingOrder.siteName}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-4 h-4" />Client
                  </p>
                  <p className="font-medium" data-testid="text-detail-client">
                    {viewingOrder.clientName}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Period</p>
                  <p className="font-medium" data-testid="text-detail-period">
                    {format(new Date(periodStart), "dd/MM/yyyy")} - {format(new Date(periodEnd), "dd/MM/yyyy")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Billing Type</p>
                  <div data-testid="text-detail-billing">
                    {getBillingTypeBadge(viewingOrder.billingType)}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Hours Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted p-3 rounded-md text-center">
                    <p className="text-2xl font-bold" data-testid="text-detail-regular-hours">
                      {formatHours(viewingOrder.regularHours)}
                    </p>
                    <p className="text-sm text-muted-foreground">Regular</p>
                  </div>
                  <div className="bg-muted p-3 rounded-md text-center">
                    <p className="text-2xl font-bold text-orange-600" data-testid="text-detail-overtime-hours">
                      {formatHours(viewingOrder.overtimeHours)}
                    </p>
                    <p className="text-sm text-muted-foreground">Overtime</p>
                  </div>
                  <div className="bg-muted p-3 rounded-md text-center">
                    <p className="text-2xl font-bold" data-testid="text-detail-total-hours">
                      {formatHours(viewingOrder.totalHours)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Cost Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate:</span>
                    <span className="font-medium" data-testid="text-detail-rate">
                      {formatCurrency(viewingOrder.hourlyRate)}
                      {viewingOrder.billingType === "hourly" ? "/hour" : viewingOrder.billingType === "daily" ? "/day" : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Regular Cost:</span>
                    <span data-testid="text-detail-regular-cost">{formatCurrency(viewingOrder.regularCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overtime Cost ({overtimeMultiplier}x):</span>
                    <span data-testid="text-detail-overtime-cost">{formatCurrency(viewingOrder.overtimeCost)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold text-lg text-green-600" data-testid="text-detail-total-cost">
                      {formatCurrency(viewingOrder.totalCost)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Additional Info</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Work Days: </span>
                    <span className="font-medium" data-testid="text-detail-work-days">{viewingOrder.workDays}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Workers: </span>
                    <span className="font-medium" data-testid="text-detail-worker-count">{viewingOrder.workers.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Approved Records: </span>
                    <span className="font-medium" data-testid="text-detail-approved">{viewingOrder.approvedRecords}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pending Records: </span>
                    <span className="font-medium" data-testid="text-detail-pending">{viewingOrder.pendingRecords}</span>
                  </div>
                </div>
              </div>

              {viewingOrder.workers.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Workers</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingOrder.workers.map((workerName, index) => (
                      <Badge key={index} variant="secondary" data-testid={`badge-worker-${index}`}>
                        <Users className="w-3 h-3 mr-1" />
                        {workerName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewingOrder(null)} data-testid="button-close-detail">
              Close
            </Button>
            {viewingOrder && (
              <Button onClick={() => handleExportOrder(viewingOrder)} data-testid="button-detail-export">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ServiceOrders() {
  return (
    <ManagerGuard>
      <ServiceOrdersContent />
    </ManagerGuard>
  );
}
