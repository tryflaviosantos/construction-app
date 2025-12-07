import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  DollarSign,
  AlertCircle,
  Check,
  X,
  Eye,
  Building2,
  MapPin,
  Camera,
} from "lucide-react";
import { format } from "date-fns";
import type { TimeRecord, Site } from "@shared/schema";

interface TimeRecordWithDetails extends TimeRecord {
  user?: { firstName: string; lastName: string };
  site?: { name: string };
}

export default function ClientPortal() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [showContestDialog, setShowContestDialog] = useState(false);
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TimeRecordWithDetails | null>(null);
  const [contestReason, setContestReason] = useState("");
  const [contestSeverity, setContestSeverity] = useState("minor");

  const { data: mySites } = useQuery<Site[]>({
    queryKey: ["/api/client/sites"],
  });

  const { data: timeRecords, isLoading } = useQuery<TimeRecordWithDetails[]>({
    queryKey: ["/api/client/time-records", selectedSite],
  });

  const { data: stats } = useQuery<{
    hoursThisMonth: number;
    pendingValidation: number;
    totalCost: number;
  }>({
    queryKey: ["/api/client/stats"],
  });

  const validateMutation = useMutation({
    mutationFn: async (recordId: string) => {
      return apiRequest("POST", `/api/client/time-records/${recordId}/validate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/time-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/stats"] });
      toast({ title: t("common.approved"), description: "Hours validated" });
    },
  });

  const contestMutation = useMutation({
    mutationFn: async (data: { recordId: string; reason: string; severity: string }) => {
      return apiRequest("POST", `/api/client/time-records/${data.recordId}/contest`, {
        reason: data.reason,
        severity: data.severity,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/time-records"] });
      toast({ title: t("client.contest"), description: "Contestation submitted" });
      setShowContestDialog(false);
      setContestReason("");
    },
  });

  const validateAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/client/time-records/validate-all", {
        siteId: selectedSite === "all" ? undefined : selectedSite,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/time-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/stats"] });
      toast({ title: t("client.approveAll"), description: "All pending hours validated" });
    },
  });

  const pendingRecords = timeRecords?.filter((r) => !r.clientValidated);

  const getStatusBadge = (record: TimeRecordWithDetails) => {
    if (record.status === "contested") {
      return <Badge variant="destructive">{t("client.contest")}</Badge>;
    }
    if (record.clientValidated) {
      return <Badge variant="default">{t("common.approved")}</Badge>;
    }
    return <Badge variant="secondary">{t("common.pending")}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">{t("client.myProjects")}</h1>
        <Select value={selectedSite} onValueChange={setSelectedSite}>
          <SelectTrigger className="w-48" data-testid="select-client-site">
            <SelectValue placeholder="All Sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {mySites?.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t("client.hoursThisMonth")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-hours-this-month">
                {stats?.hoursThisMonth?.toFixed(1) ?? 0}h
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {t("client.pendingValidation")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-pending-validation">
                {stats?.pendingValidation ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t("client.totalCost")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-cost">
                ${stats?.totalCost?.toFixed(2) ?? 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>{t("client.validateHours")}</CardTitle>
            <CardDescription>
              {pendingRecords?.length ?? 0} records pending validation
            </CardDescription>
          </div>
          {(pendingRecords?.length ?? 0) > 0 && (
            <Button
              onClick={() => validateAllMutation.mutate()}
              disabled={validateAllMutation.isPending}
              data-testid="button-approve-all"
            >
              <Check className="mr-2 h-4 w-4" />
              {t("client.approveAll")}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>{t("time.clockIn")}</TableHead>
                  <TableHead>{t("time.clockOut")}</TableHead>
                  <TableHead className="text-right">{t("common.total")}</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : timeRecords?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No time records found
                    </TableCell>
                  </TableRow>
                ) : (
                  timeRecords?.map((record) => (
                    <TableRow key={record.id} data-testid={`time-record-row-${record.id}`}>
                      <TableCell>
                        {format(new Date(record.checkInTime), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {record.user?.firstName} {record.user?.lastName}
                      </TableCell>
                      <TableCell>{record.site?.name}</TableCell>
                      <TableCell>
                        {format(new Date(record.checkInTime), "HH:mm")}
                      </TableCell>
                      <TableCell>
                        {record.checkOutTime
                          ? format(new Date(record.checkOutTime), "HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {record.totalHours}h
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowEvidenceDialog(true);
                          }}
                          data-testid={`button-view-evidence-${record.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>{getStatusBadge(record)}</TableCell>
                      <TableCell className="text-right">
                        {!record.clientValidated && record.status !== "contested" && (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              onClick={() => validateMutation.mutate(record.id)}
                              disabled={validateMutation.isPending}
                              data-testid={`button-validate-${record.id}`}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRecord(record);
                                setShowContestDialog(true);
                              }}
                              data-testid={`button-contest-${record.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("client.viewEvidence")}</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t("time.clockIn")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-lg font-semibold">
                        {format(new Date(selectedRecord.checkInTime), "HH:mm")}
                      </p>
                      {selectedRecord.checkInPhoto ? (
                        <img
                          src={selectedRecord.checkInPhoto}
                          alt="Check-in photo"
                          className="w-full aspect-square object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-muted rounded-md flex items-center justify-center">
                          <Camera className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {selectedRecord.isWithinGeofence ? (
                          <span className="text-green-600">{t("time.withinGeofence")}</span>
                        ) : (
                          <span className="text-red-600">{t("time.outsideGeofence")}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t("time.clockOut")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-lg font-semibold">
                        {selectedRecord.checkOutTime
                          ? format(new Date(selectedRecord.checkOutTime), "HH:mm")
                          : "In Progress"}
                      </p>
                      {selectedRecord.checkOutPhoto ? (
                        <img
                          src={selectedRecord.checkOutPhoto}
                          alt="Check-out photo"
                          className="w-full aspect-square object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-muted rounded-md flex items-center justify-center">
                          <Camera className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-md">
                <span className="font-medium">{t("time.hoursWorked")}</span>
                <span className="text-xl font-bold">{selectedRecord.totalHours}h</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showContestDialog} onOpenChange={setShowContestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("client.contest")}</DialogTitle>
            <DialogDescription>
              {t("client.contestReason")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select value={contestSeverity} onValueChange={setContestSeverity}>
                <SelectTrigger data-testid="select-contest-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor discrepancy</SelectItem>
                  <SelectItem value="significant">Significant issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">{t("leave.reason")}</label>
              <Textarea
                value={contestReason}
                onChange={(e) => setContestReason(e.target.value)}
                placeholder={t("client.contestReason")}
                rows={4}
                data-testid="input-contest-reason"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowContestDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedRecord) {
                    contestMutation.mutate({
                      recordId: selectedRecord.id,
                      reason: contestReason,
                      severity: contestSeverity,
                    });
                  }
                }}
                disabled={!contestReason || contestMutation.isPending}
                data-testid="button-submit-contest"
              >
                {t("common.submit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
