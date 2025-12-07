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
  Eye,
  Calendar,
  CalendarCheck,
  CalendarX,
  Users,
  Briefcase,
  Heart,
  User as UserIcon,
  DollarSign
} from "lucide-react";
import type { LeaveRequest, User } from "@shared/schema";

function LeaveApprovalsContent() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewingRequest, setViewingRequest] = useState<LeaveRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: leaveRequests = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests/team"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/leave-requests/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/team"] });
      toast({ title: "Success", description: "Leave request approved" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to approve request" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiRequest("PATCH", `/api/leave-requests/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/team"] });
      setRejectingRequest(null);
      setRejectReason("");
      toast({ title: "Success", description: "Leave request rejected" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to reject request" });
    },
  });

  const filteredRequests = leaveRequests.filter((request) => {
    const user = users.find(u => u.id === request.userId);
    const userName = user ? `${user.firstName} ${user.lastName}`.toLowerCase() : "";
    
    const matchesSearch = 
      userName.includes(searchTerm.toLowerCase()) ||
      (request.reason?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesType = typeFilter === "all" || request.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => 
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  const getUserName = (userId: string | null) => {
    if (!userId) return "-";
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : userId;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "cancelled":
        return <Badge variant="outline"><CalendarX className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case "pending":
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getTypeBadge = (type: string | null) => {
    switch (type) {
      case "vacation":
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><Briefcase className="w-3 h-3 mr-1" />Vacation</Badge>;
      case "sick":
        return <Badge variant="outline" className="border-red-500 text-red-600"><Heart className="w-3 h-3 mr-1" />Sick</Badge>;
      case "personal":
        return <Badge variant="outline" className="border-purple-500 text-purple-600"><UserIcon className="w-3 h-3 mr-1" />Personal</Badge>;
      case "unpaid":
        return <Badge variant="outline" className="border-gray-500 text-gray-600"><DollarSign className="w-3 h-3 mr-1" />Unpaid</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy");
  };

  const requestStats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter(r => r.status === "pending").length,
    approved: leaveRequests.filter(r => r.status === "approved").length,
    rejected: leaveRequests.filter(r => r.status === "rejected").length,
    totalDays: leaveRequests.filter(r => r.status === "approved").reduce((sum, r) => sum + (r.daysCount || 1), 0),
  };

  const handleApprove = (request: LeaveRequest) => {
    approveMutation.mutate(request.id);
  };

  const handleReject = () => {
    if (rejectingRequest) {
      rejectMutation.mutate({ id: rejectingRequest.id, reason: rejectReason });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("admin.leaveApprovals")}</h1>
          <p className="text-muted-foreground">
            Review and approve employee leave and absence requests
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-requests">{requestStats.total}</p>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-pending-count">{requestStats.pending}</p>
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
                <p className="text-2xl font-bold" data-testid="text-approved-count">{requestStats.approved}</p>
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
                <p className="text-2xl font-bold" data-testid="text-rejected-count">{requestStats.rejected}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-days">{requestStats.totalDays}</p>
                <p className="text-sm text-muted-foreground">Days Approved</p>
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
                placeholder="Search by employee or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
                data-testid="input-search-requests"
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
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40" data-testid="select-type-filter">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="sick">Sick</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading leave requests...</div>
          ) : sortedRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== "all" || typeFilter !== "all" 
                ? "No requests match your filters" 
                : "No leave requests found."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRequests.map((request) => (
                  <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {getUserName(request.userId)}
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(request.type)}</TableCell>
                    <TableCell>{formatDate(request.startDate)}</TableCell>
                    <TableCell>{formatDate(request.endDate)}</TableCell>
                    <TableCell>
                      <span className="font-medium">{request.daysCount || 1}</span>
                      {request.isPartialDay && (
                        <Badge variant="outline" className="ml-1 text-xs">Partial</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.isPaid ? (
                        <Badge variant="outline" className="border-green-500 text-green-600">Paid</Badge>
                      ) : (
                        <Badge variant="outline" className="border-gray-500 text-gray-600">Unpaid</Badge>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setViewingRequest(request)}
                          data-testid={`button-view-${request.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {request.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => handleApprove(request)}
                              disabled={approveMutation.isPending}
                              data-testid={`button-approve-${request.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => setRejectingRequest(request)}
                              data-testid={`button-reject-${request.id}`}
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

      <Dialog open={!!viewingRequest} onOpenChange={(open) => !open && setViewingRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogDescription>
              View detailed information about this leave request
            </DialogDescription>
          </DialogHeader>
          {viewingRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="w-4 h-4" />Employee
                  </p>
                  <p className="font-medium" data-testid="text-detail-employee">
                    {getUserName(viewingRequest.userId)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Type</p>
                  <div data-testid="text-detail-type">
                    {getTypeBadge(viewingRequest.type)}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" />Start Date
                  </p>
                  <p className="font-medium" data-testid="text-detail-start-date">
                    {formatDate(viewingRequest.startDate)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" />End Date
                  </p>
                  <p className="font-medium" data-testid="text-detail-end-date">
                    {formatDate(viewingRequest.endDate)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div data-testid="text-detail-status">
                    {getStatusBadge(viewingRequest.status)}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium" data-testid="text-detail-days">
                    {viewingRequest.daysCount || 1} day{(viewingRequest.daysCount || 1) > 1 ? 's' : ''}
                    {viewingRequest.isPartialDay && ' (Partial)'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Payment Status</p>
                  <p className="font-medium" data-testid="text-detail-paid">
                    {viewingRequest.isPaid ? 'Paid Leave' : 'Unpaid Leave'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium" data-testid="text-detail-created">
                    {viewingRequest.createdAt ? formatDate(viewingRequest.createdAt) : '-'}
                  </p>
                </div>
              </div>

              {viewingRequest.reason && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Reason</p>
                  <p className="text-sm bg-muted p-3 rounded-md" data-testid="text-detail-reason">{viewingRequest.reason}</p>
                </div>
              )}

              {viewingRequest.approvedBy && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {viewingRequest.status === "approved" ? "Approved" : "Reviewed"} by {getUserName(viewingRequest.approvedBy)}
                    {viewingRequest.approvedAt && ` on ${formatDate(viewingRequest.approvedAt)}`}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingRequest(null)} data-testid="button-close-detail">
              Close
            </Button>
            {viewingRequest?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  className="text-red-600"
                  onClick={() => {
                    setViewingRequest(null);
                    setRejectingRequest(viewingRequest);
                  }}
                  data-testid="button-detail-reject"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600"
                  onClick={() => {
                    handleApprove(viewingRequest);
                    setViewingRequest(null);
                  }}
                  disabled={approveMutation.isPending}
                  data-testid="button-detail-approve"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectingRequest} onOpenChange={(open) => !open && setRejectingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {rejectingRequest ? getUserName(rejectingRequest.userId) : ""}'s leave request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter rejection reason (optional)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              data-testid="input-reject-reason"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setRejectingRequest(null);
                setRejectReason("");
              }}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LeaveApprovals() {
  return (
    <ManagerGuard>
      <LeaveApprovalsContent />
    </ManagerGuard>
  );
}
