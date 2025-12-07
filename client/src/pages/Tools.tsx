import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wrench,
  QrCode,
  Search,
  Plus,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  History,
} from "lucide-react";
import type { Tool, Site } from "@shared/schema";

export default function Tools() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [selectedSite, setSelectedSite] = useState("");
  const [condition, setCondition] = useState("good");
  const [notes, setNotes] = useState("");

  const { data: tools, isLoading } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
  });

  const { data: sites } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const filteredTools = tools?.filter((tool) => {
    const matchesSearch = tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.serialNumber?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || tool.status === filter;
    return matchesSearch && matchesFilter;
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data: { toolId: string; siteId: string; condition: string; notes?: string }) => {
      return apiRequest("POST", `/api/tools/${data.toolId}/checkout`, {
        siteId: data.siteId,
        condition: data.condition,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      toast({ title: t("tools.checkout"), description: "Tool checked out successfully" });
      setShowCheckoutDialog(false);
      resetCheckoutForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to checkout tool", variant: "destructive" });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async (data: { toolId: string; siteId: string; condition: string; notes?: string }) => {
      return apiRequest("POST", `/api/tools/${data.toolId}/checkin`, {
        siteId: data.siteId,
        condition: data.condition,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      toast({ title: t("tools.checkin"), description: "Tool returned successfully" });
      setShowCheckoutDialog(false);
      resetCheckoutForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to checkin tool", variant: "destructive" });
    },
  });

  const resetCheckoutForm = () => {
    setSelectedTool(null);
    setSelectedSite("");
    setCondition("good");
    setNotes("");
  };

  const handleCheckout = (tool: Tool) => {
    setSelectedTool(tool);
    setShowCheckoutDialog(true);
  };

  const handleCheckin = (tool: Tool) => {
    setSelectedTool(tool);
    setShowCheckoutDialog(true);
  };

  const submitCheckout = () => {
    if (!selectedTool || !selectedSite) {
      toast({ title: "Error", description: "Please select a site", variant: "destructive" });
      return;
    }
    checkoutMutation.mutate({
      toolId: selectedTool.id,
      siteId: selectedSite,
      condition,
      notes: notes || undefined,
    });
  };

  const submitCheckin = () => {
    if (!selectedTool) return;
    const siteId = selectedTool.currentSiteId || selectedSite;
    if (!siteId) {
      toast({ title: "Error", description: "Please select a site", variant: "destructive" });
      return;
    }
    checkinMutation.mutate({
      toolId: selectedTool.id,
      siteId,
      condition,
      notes: notes || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive"; icon: typeof CheckCircle }> = {
      available: { variant: "default", icon: CheckCircle },
      in_use: { variant: "secondary", icon: Package },
      maintenance: { variant: "secondary", icon: AlertTriangle },
      lost: { variant: "destructive", icon: XCircle },
      stolen: { variant: "destructive", icon: XCircle },
    };
    const config = variants[status] || variants.available;
    return (
      <Badge variant={config.variant} className="gap-1">
        <config.icon className="h-3 w-3" />
        {t(`tools.${status}`)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">{t("tools.inventory")}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-scan-qr">
            <QrCode className="mr-2 h-4 w-4" />
            {t("tools.scanQr")}
          </Button>
          <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-tool">
            <Plus className="mr-2 h-4 w-4" />
            {t("common.add")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-tools"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-tools">
            <SelectValue placeholder={t("common.filter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.status")}: All</SelectItem>
            <SelectItem value="available">{t("tools.available")}</SelectItem>
            <SelectItem value="in_use">{t("tools.inUse")}</SelectItem>
            <SelectItem value="maintenance">{t("tools.maintenance")}</SelectItem>
            <SelectItem value="lost">{t("tools.lost")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="grid">
        <TabsList>
          <TabsTrigger value="grid">Grid</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-32 w-full mb-4" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools?.map((tool) => (
                <Card key={tool.id} className="hover-elevate" data-testid={`card-tool-${tool.id}`}>
                  <CardContent className="p-4">
                    <div className="aspect-square bg-muted rounded-md mb-4 flex items-center justify-center">
                      {tool.photo ? (
                        <img src={tool.photo} alt={tool.name} className="w-full h-full object-cover rounded-md" />
                      ) : (
                        <Wrench className="h-16 w-16 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold">{tool.name}</h3>
                        {getStatusBadge(tool.status || "available")}
                      </div>
                      {tool.serialNumber && (
                        <p className="text-sm text-muted-foreground">SN: {tool.serialNumber}</p>
                      )}
                      {tool.category && (
                        <Badge variant="outline">{tool.category}</Badge>
                      )}
                      <div className="flex gap-2 pt-2">
                        {tool.status === "available" ? (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleCheckout(tool)}
                            disabled={checkoutMutation.isPending}
                            data-testid={`button-checkout-${tool.id}`}
                          >
                            {t("tools.checkout")}
                          </Button>
                        ) : tool.status === "in_use" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleCheckin(tool)}
                            disabled={checkinMutation.isPending}
                            data-testid={`button-checkin-${tool.id}`}
                          >
                            {t("tools.checkin")}
                          </Button>
                        ) : null}
                        <Button size="sm" variant="ghost" data-testid={`button-history-${tool.id}`}>
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Name</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">{t("common.status")}</th>
                      <th className="text-left p-4 font-medium">{t("tools.assignedTo")}</th>
                      <th className="text-right p-4 font-medium">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTools?.map((tool) => (
                      <tr key={tool.id} className="border-b">
                        <td className="p-4">{tool.name}</td>
                        <td className="p-4">{tool.category || "-"}</td>
                        <td className="p-4">{getStatusBadge(tool.status || "available")}</td>
                        <td className="p-4">{tool.currentUserId || "-"}</td>
                        <td className="p-4 text-right">
                          <Button size="sm" variant="ghost">
                            {t("common.view")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.add")} Tool</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Tool Name" data-testid="input-tool-name" />
            <Input placeholder="Serial Number" data-testid="input-tool-serial" />
            <Select>
              <SelectTrigger data-testid="select-tool-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="power">Power Tools</SelectItem>
                <SelectItem value="hand">Hand Tools</SelectItem>
                <SelectItem value="safety">Safety Equipment</SelectItem>
                <SelectItem value="measuring">Measuring Tools</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button data-testid="button-save-tool">{t("common.save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCheckoutDialog} onOpenChange={(open) => { if (!open) { setShowCheckoutDialog(false); resetCheckoutForm(); } else { setShowCheckoutDialog(true); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTool?.status === "available" ? t("tools.checkout") : t("tools.checkin")} - {selectedTool?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTool?.status === "available" 
                ? "Select a site and confirm the tool condition" 
                : "Confirm the tool condition upon return"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(selectedTool?.status === "available" || !selectedTool?.currentSiteId) && (
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger data-testid="select-checkout-site">
                  <SelectValue placeholder="Select Site" />
                </SelectTrigger>
                <SelectContent>
                  {sites?.map((site) => (
                    <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger data-testid="select-tool-condition">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              placeholder="Notes (optional)" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="input-tool-notes"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCheckoutDialog(false); resetCheckoutForm(); }}>
                {t("common.cancel")}
              </Button>
              <Button 
                onClick={selectedTool?.status === "available" ? submitCheckout : submitCheckin}
                disabled={checkoutMutation.isPending || checkinMutation.isPending}
                data-testid="button-confirm-tool-action"
              >
                {t("common.confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
