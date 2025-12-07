import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ManagerGuard } from "@/components/RoleGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Clock, 
  Search, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  MapPin,
  Camera,
  Eye,
  Calendar,
  Timer,
  Users,
  Building2
} from "lucide-react";
import type { TimeRecord, Site, User } from "@shared/schema";

function TimesheetApprovalsContent() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [viewingRecord, setViewingRecord] = useState<TimeRecord | null>(null);
  const [rejectingRecord, setRejectingRecord] = useState<TimeRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: timeRecords = [], isLoading } = useQuery<TimeRecord[]>({
    queryKey: ["/api/time-records"],
  });

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/time-records/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-records"] });
      toast({ title: "Success", description: "Time record approved" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to approve record" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiRequest("PATCH", `/api/time-records/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-records"] });
      setRejectingRecord(null);
      setRejectReason("");
      toast({ title: "Success", description: "Time record rejected" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to reject record" });
    },
  });

  const filteredRecords = timeRecords.filter((record) => {
    const user = users.find(u => u.id === record.userId);
    const site = sites.find(s => s.id === record.siteId);
    const userName = user ? `${user.firstName} ${user.lastName}`.toLowerCase() : "";
    const siteName = site?.name?.toLowerCase() || "";
    
    const matchesSearch = 
      userName.includes(searchTerm.toLowerCase()) ||
      siteName.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    const matchesSite = siteFilter === "all" || record.siteId === siteFilter;
    return matchesSearch && matchesStatus && matchesSite;
  });

  const sortedRecords = [...filteredRecords].sort((a, b) => 
    new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
  );

  const getUserName = (userId: string | null) => {
    if (!userId) return "-";
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : userId;
  };

  const getSiteName = (siteId: string | null) => {
    if (!siteId) return "-";
    const site = sites.find(s => s.id === siteId);
    return site?.name || siteId;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "contested":
        return <Badge variant="outline" className="border-orange-500 text-orange-600"><AlertTriangle className="w-3 h-3 mr-1" />Contested</Badge>;
      case "pending":
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const formatTime = (date: string | Date | null) => {
    if (!date) return "-";
    return format(new Date(date), "HH:mm");
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy");
  };

  const recordStats = {
    total: timeRecords.length,
    pending: timeRecords.filter(r => r.status === "pending").length,
    approved: timeRecords.filter(r => r.status === "approved").length,
    rejected: timeRecords.filter(r => r.status === "rejected").length,
    suspicious: timeRecords.filter(r => r.isSuspicious).length,
  };

  const handleApprove = (record: TimeRecord) => {
    approveMutation.mutate(record.id);
  };

  const handleReject = () => {
    if (rejectingRecord && rejectReason.trim()) {
      rejectMutation.mutate({ id: rejectingRecord.id, reason: rejectReason });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("admin.timesheetApproval")}</h1>
          <p className="text-muted-foreground">
            Review and approve employee time records
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-records">{recordStats.total}</p>
                <p className="text-sm text-muted-foreground">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-pending-count">{recordStats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-approved-count">{recordStats.approved}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-rejected-count">{recordStats.rejected}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-suspicious-count">{recordStats.suspicious}</p>
                <p className="text-sm text-muted-foreground">Suspicious</p>
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
                placeholder="Search by employee or site..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
                data-testid="input-search-records"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="contested">Contested</SelectItem>
              </SelectContent>
            </Select>
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-48" data-testid="select-site-filter">
                <SelectValue placeholder="Filter by site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading time records...</div>
          ) : sortedRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== "all" || siteFilter !== "all" 
                ? "No records match your filters" 
                : "No time records found."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRecords.map((record) => (
                  <TableRow key={record.id} data-testid={`row-record-${record.id}`}>
                    <TableCell className="font-medium">{formatDate(record.checkInTime)}</TableCell>
                    <TableCell>{getUserName(record.userId)}</TableCell>
                    <TableCell>{getSiteName(record.siteId)}</TableCell>
                    <TableCell>{formatTime(record.checkInTime)}</TableCell>
                    <TableCell>{formatTime(record.checkOutTime)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Timer className="w-3 h-3 text-muted-foreground" />
                        {record.totalHours || "-"}
                        {record.overtimeHours && parseFloat(record.overtimeHours) > 0 && (
                          <Badge variant="outline" className="ml-1 text-xs">
                            +{record.overtimeHours}h OT
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {record.isSuspicious && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Suspicious
                          </Badge>
                        )}
                        {!record.isWithinGeofence && (
                          <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                            <MapPin className="w-3 h-3 mr-1" />
                            Outside
                          </Badge>
                        )}
                        {record.isOffline && (
                          <Badge variant="outline" className="text-xs">
                            Offline
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setViewingRecord(record)}
                          data-testid={`button-view-${record.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {record.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => handleApprove(record)}
                              disabled={approveMutation.isPending}
                              data-testid={`button-approve-${record.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => setRejectingRecord(record)}
                              data-testid={`button-reject-${record.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
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

      <Dialog open={!!viewingRecord} onOpenChange={(open) => !open && setViewingRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Time Record Details</DialogTitle>
            <DialogDescription>
              View detailed information about this time record
            </DialogDescription>
          </DialogHeader>
          {viewingRecord && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="w-4 h-4" />Employee
                  </p>
                  <p className="font-medium" data-testid="text-detail-employee">
                    {getUserName(viewingRecord.userId)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-4 h-4" />Site
                  </p>
                  <p className="font-medium" data-testid="text-detail-site">
                    {getSiteName(viewingRecord.siteId)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" />Date
                  </p>
                  <p className="font-medium" data-testid="text-detail-date">
                    {formatDate(viewingRecord.checkInTime)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div data-testid="text-detail-status">
                    {getStatusBadge(viewingRecord.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600 flex items-center gap-1">
                    <Clock className="w-4 h-4" />Check In
                  </h4>
                  <p className="text-lg font-bold" data-testid="text-detail-checkin-time">
                    {formatTime(viewingRecord.checkInTime)}
                  </p>
                  {viewingRecord.checkInLatitude && viewingRecord.checkInLongitude && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {viewingRecord.checkInLatitude}, {viewingRecord.checkInLongitude}
                    </p>
                  )}
                  {viewingRecord.checkInPhoto && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                        <Camera className="w-3 h-3" />Photo
                      </p>
                      <img 
                        src={viewingRecord.checkInPhoto} 
                        alt="Check-in" 
                        className="w-32 h-32 object-cover rounded-md border"
                        data-testid="img-checkin-photo"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600 flex items-center gap-1">
                    <Clock className="w-4 h-4" />Check Out
                  </h4>
                  <p className="text-lg font-bold" data-testid="text-detail-checkout-time">
                    {viewingRecord.checkOutTime ? formatTime(viewingRecord.checkOutTime) : "Not checked out"}
                  </p>
                  {viewingRecord.checkOutLatitude && viewingRecord.checkOutLongitude && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {viewingRecord.checkOutLatitude}, {viewingRecord.checkOutLongitude}
                    </p>
                  )}
                  {viewingRecord.checkOutPhoto && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                        <Camera className="w-3 h-3" />Photo
                      </p>
                      <img 
                        src={viewingRecord.checkOutPhoto} 
                        alt="Check-out" 
                        className="w-32 h-32 object-cover rounded-md border"
                        data-testid="img-checkout-photo"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  <p className="text-xl font-bold" data-testid="text-detail-total-hours">
                    {viewingRecord.totalHours || "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Overtime Hours</p>
                  <p className="text-xl font-bold text-orange-600" data-testid="text-detail-overtime">
                    {viewingRecord.overtimeHours || "0"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Break Minutes</p>
                  <p className="text-xl font-bold" data-testid="text-detail-break">
                    {viewingRecord.breakMinutes || 0}
                  </p>
                </div>
              </div>

              {(viewingRecord.isSuspicious || !viewingRecord.isWithinGeofence) && (
                <div className="pt-4 border-t space-y-2">
                  <h4 className="font-medium text-orange-600 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />Warnings
                  </h4>
                  {viewingRecord.isSuspicious && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-md">
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        Suspicious Activity Detected
                      </p>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        {viewingRecord.suspiciousReason || "No reason provided"}
                      </p>
                    </div>
                  )}
                  {!viewingRecord.isWithinGeofence && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-md">
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        Outside Geofence
                      </p>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        The employee was not within the site boundaries when clocking in/out.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {viewingRecord.notes && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm" data-testid="text-detail-notes">{viewingRecord.notes}</p>
                </div>
              )}

              {viewingRecord.approvedBy && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {viewingRecord.status === "approved" ? "Approved" : "Reviewed"} by {getUserName(viewingRecord.approvedBy)}
                    {viewingRecord.approvedAt && ` on ${format(new Date(viewingRecord.approvedAt), "dd/MM/yyyy HH:mm")}`}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingRecord(null)}>
              Close
            </Button>
            {viewingRecord?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  className="text-red-600"
                  onClick={() => {
                    setRejectingRecord(viewingRecord);
                    setViewingRecord(null);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    handleApprove(viewingRecord);
                    setViewingRecord(null);
                  }}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectingRecord} onOpenChange={(open) => {
        if (!open) {
          setRejectingRecord(null);
          setRejectReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Time Record</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this time record. The employee will be notified.
            </DialogDescription>
          </DialogHeader>
          {rejectingRecord && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <strong>Employee:</strong> {getUserName(rejectingRecord.userId)}
                </p>
                <p className="text-sm">
                  <strong>Date:</strong> {formatDate(rejectingRecord.checkInTime)}
                </p>
                <p className="text-sm">
                  <strong>Hours:</strong> {rejectingRecord.totalHours || "N/A"}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Reason</label>
                <Textarea
                  placeholder="Enter the reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  data-testid="textarea-reject-reason"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setRejectingRecord(null);
                setRejectReason("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TimesheetApprovals() {
  return (
    <ManagerGuard>
      <TimesheetApprovalsContent />
    </ManagerGuard>
  );
}
