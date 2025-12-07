import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  MapPin,
  Users,
  Clock,
  Plus,
  Search,
  Calendar,
  DollarSign,
} from "lucide-react";
import type { Site, Client } from "@shared/schema";

export default function Sites() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    clientId: "",
    billingType: "hourly",
    hourlyRate: "",
    workStartTime: "08:00",
    workEndTime: "17:00",
    geofenceRadius: "100",
  });

  const { data: sites, isLoading } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/sites", {
        ...data,
        hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
        geofenceRadius: parseInt(data.geofenceRadius),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      toast({ title: t("sites.addSite"), description: "Site created successfully" });
      setShowAddDialog(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create site", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      clientId: "",
      billingType: "hourly",
      hourlyRate: "",
      workStartTime: "08:00",
      workEndTime: "17:00",
      geofenceRadius: "100",
    });
  };

  const filteredSites = sites?.filter((site) => {
    const matchesSearch = site.name.toLowerCase().includes(search.toLowerCase()) ||
      site.address?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || site.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      completed: "secondary",
      paused: "secondary",
    };
    return <Badge variant={variants[status] || "secondary"}>{t(`sites.${status}`)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">{t("nav.sites")}</h1>
        <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-site">
          <Plus className="mr-2 h-4 w-4" />
          {t("sites.addSite")}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-sites"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-sites">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.status")}: All</SelectItem>
            <SelectItem value="active">{t("sites.active")}</SelectItem>
            <SelectItem value="completed">{t("sites.completed")}</SelectItem>
            <SelectItem value="paused">{t("sites.paused")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSites?.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No sites found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSites?.map((site) => (
            <Card key={site.id} className="hover-elevate" data-testid={`card-site-${site.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{site.name}</CardTitle>
                  {getStatusBadge(site.status || "active")}
                </div>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {site.address}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t("sites.workHours")}
                    </span>
                    <span>{site.workStartTime} - {site.workEndTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {t("sites.billingType")}
                    </span>
                    <span>{t(`sites.${site.billingType}`)}</span>
                  </div>
                  {site.hourlyRate && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Rate</span>
                      <span>${site.hourlyRate}/hr</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" data-testid={`button-view-site-${site.id}`}>
                    {t("common.view")}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-site-${site.id}`}>
                    {t("common.edit")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("sites.addSite")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{t("sites.siteName")}</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("sites.siteName")}
                data-testid="input-site-name"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">{t("sites.address")}</label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t("sites.address")}
                data-testid="input-site-address"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">{t("sites.client")}</label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => setFormData({ ...formData, clientId: value })}
              >
                <SelectTrigger data-testid="select-site-client">
                  <SelectValue placeholder={t("sites.client")} />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t("sites.billingType")}</label>
                <Select
                  value={formData.billingType}
                  onValueChange={(value) => setFormData({ ...formData, billingType: value })}
                >
                  <SelectTrigger data-testid="select-billing-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">{t("sites.hourly")}</SelectItem>
                    <SelectItem value="daily">{t("sites.daily")}</SelectItem>
                    <SelectItem value="fixed">{t("sites.fixed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Rate</label>
                <Input
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-hourly-rate"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Time</label>
                <Input
                  type="time"
                  value={formData.workStartTime}
                  onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                  data-testid="input-start-time"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">End Time</label>
                <Input
                  type="time"
                  value={formData.workEndTime}
                  onChange={(e) => setFormData({ ...formData, workEndTime: e.target.value })}
                  data-testid="input-end-time"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Geofence Radius (meters)</label>
              <Input
                type="number"
                value={formData.geofenceRadius}
                onChange={(e) => setFormData({ ...formData, geofenceRadius: e.target.value })}
                placeholder="100"
                data-testid="input-geofence-radius"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.name || !formData.address || createMutation.isPending}
                data-testid="button-save-site"
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
