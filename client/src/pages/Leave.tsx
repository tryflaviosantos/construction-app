import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
  Calendar as CalendarIcon,
  Plus,
  Umbrella,
  Stethoscope,
  User,
  CircleDollarSign,
  Check,
  X,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { LeaveRequest } from "@shared/schema";

export default function Leave() {
  const { t } = useTranslation();
  const { user, isManager } = useAuth();
  const { toast } = useToast();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [leaveType, setLeaveType] = useState("vacation");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState("");

  const { data: myRequests, isLoading: loadingMy } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests/my"],
  });

  const { data: teamRequests, isLoading: loadingTeam } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests/team"],
    enabled: isManager,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { type: string; startDate: Date; endDate: Date; reason: string }) => {
      return apiRequest("POST", "/api/leave-requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/my"] });
      toast({ title: t("leave.request"), description: "Request submitted successfully" });
      setShowRequestDialog(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit request", variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/leave-requests/${id}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/team"] });
      toast({ title: t("common.approved"), description: "Request approved" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/leave-requests/${id}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/team"] });
      toast({ title: t("common.rejected"), description: "Request rejected" });
    },
  });

  const resetForm = () => {
    setLeaveType("vacation");
    setStartDate(undefined);
    setEndDate(undefined);
    setReason("");
  };

  const leaveTypes = [
    { value: "vacation", label: t("leave.vacation"), icon: Umbrella },
    { value: "sick", label: t("leave.sick"), icon: Stethoscope },
    { value: "personal", label: t("leave.personal"), icon: User },
    { value: "unpaid", label: t("leave.unpaid"), icon: CircleDollarSign },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{t(`common.${status}`)}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    const config = leaveTypes.find((lt) => lt.value === type);
    const Icon = config?.icon || Umbrella;
    return <Icon className="h-4 w-4" />;
  };

  const daysCount = startDate && endDate ? differenceInDays(endDate, startDate) + 1 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">{t("nav.leave")}</h1>
        <Button onClick={() => setShowRequestDialog(true)} data-testid="button-request-leave">
          <Plus className="mr-2 h-4 w-4" />
          {t("leave.request")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("leave.balance")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-vacation-balance">
              {user?.vacationDaysBalance ?? 22}
            </div>
            <p className="text-sm text-muted-foreground">{t("leave.daysRemaining")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("common.pending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {myRequests?.filter((r) => r.status === "pending").length ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">{t("leave.myRequests")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("common.approved")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {myRequests?.filter((r) => r.status === "approved").length ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">{t("leave.myRequests")}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="my">
        <TabsList>
          <TabsTrigger value="my">{t("leave.myRequests")}</TabsTrigger>
          {isManager && <TabsTrigger value="team">{t("leave.teamRequests")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="my" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loadingMy ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : myRequests?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No leave requests yet
                </div>
              ) : (
                <div className="divide-y">
                  {myRequests?.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 flex items-center justify-between gap-4"
                      data-testid={`leave-request-${request.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                          {getTypeIcon(request.type)}
                        </div>
                        <div>
                          <p className="font-medium">{t(`leave.${request.type}`)}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(request.startDate), "MMM d")} -{" "}
                            {format(new Date(request.endDate), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {request.daysCount} {t("common.days")}
                        </span>
                        {getStatusBadge(request.status || "pending")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isManager && (
          <TabsContent value="team" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loadingTeam ? (
                  <div className="p-4 space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : teamRequests?.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No pending team requests
                  </div>
                ) : (
                  <div className="divide-y">
                    {teamRequests?.map((request) => (
                      <div
                        key={request.id}
                        className="p-4 flex items-center justify-between gap-4"
                        data-testid={`team-leave-request-${request.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                            {getTypeIcon(request.type)}
                          </div>
                          <div>
                            <p className="font-medium">{t(`leave.${request.type}`)}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(request.startDate), "MMM d")} -{" "}
                              {format(new Date(request.endDate), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {request.status === "pending" ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => approveMutation.mutate(request.id)}
                                disabled={approveMutation.isPending}
                                data-testid={`button-approve-${request.id}`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectMutation.mutate(request.id)}
                                disabled={rejectMutation.isPending}
                                data-testid={`button-reject-${request.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            getStatusBadge(request.status || "pending")
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("leave.request")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger data-testid="select-leave-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t("leave.startDate")}</label>
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  className="rounded-md border"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t("leave.endDate")}</label>
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => (startDate ? date < startDate : false)}
                  className="rounded-md border"
                />
              </div>
            </div>

            {daysCount > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                {daysCount} {t("common.days")}
              </p>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">{t("leave.reason")}</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("leave.reason")}
                data-testid="input-leave-reason"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (startDate && endDate) {
                    createMutation.mutate({
                      type: leaveType,
                      startDate,
                      endDate,
                      reason,
                    });
                  }
                }}
                disabled={!startDate || !endDate || createMutation.isPending}
                data-testid="button-submit-leave"
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
