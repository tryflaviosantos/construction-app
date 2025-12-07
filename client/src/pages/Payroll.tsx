import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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
  Calculator,
  Download,
  DollarSign,
  Clock,
  Moon,
  Umbrella,
  Check,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import type { PayrollRecord } from "@shared/schema";

export default function Payroll() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("current");

  const { data: payrollRecords, isLoading } = useQuery<PayrollRecord[]>({
    queryKey: ["/api/payroll", selectedPeriod],
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/payroll/${id}/mark-paid`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: t("payroll.paid"), description: "Payment recorded" });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/payroll/export?period=${selectedPeriod}`);
      return response;
    },
    onSuccess: () => {
      toast({ title: t("common.export"), description: "Export ready for download" });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      paid: "default",
      processing: "secondary",
    };
    return <Badge variant={variants[status] || "secondary"}>{t(`payroll.${status}`)}</Badge>;
  };

  const periods = [
    { value: "current", label: format(new Date(), "MMMM yyyy") },
    { value: "previous", label: format(subMonths(new Date(), 1), "MMMM yyyy") },
    { value: "two_months_ago", label: format(subMonths(new Date(), 2), "MMMM yyyy") },
  ];

  const totalAmount = payrollRecords?.reduce(
    (sum, record) => sum + parseFloat(record.totalAmount || "0"),
    0
  ) ?? 0;

  const totalRegularHours = payrollRecords?.reduce(
    (sum, record) => sum + parseFloat(record.regularHours || "0"),
    0
  ) ?? 0;

  const totalOvertimeHours = payrollRecords?.reduce(
    (sum, record) => sum + parseFloat(record.overtimeHours || "0"),
    0
  ) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">{t("nav.payroll")}</h1>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48" data-testid="select-payroll-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            data-testid="button-export-payroll"
          >
            <Download className="mr-2 h-4 w-4" />
            {t("common.export")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t("payroll.totalAmount")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-amount">
                ${totalAmount.toFixed(2)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t("payroll.regularHours")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{totalRegularHours.toFixed(1)}h</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Moon className="h-4 w-4" />
              {t("payroll.overtimeHours")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{totalOvertimeHours.toFixed(1)}h</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Umbrella className="h-4 w-4" />
              {t("payroll.vacationDays")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {payrollRecords?.reduce((sum, r) => sum + (r.vacationDays || 0), 0) ?? 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("payroll.period")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">{t("payroll.regularHours")}</TableHead>
                  <TableHead className="text-right">{t("payroll.overtimeHours")}</TableHead>
                  <TableHead className="text-right">{t("payroll.nightHours")}</TableHead>
                  <TableHead className="text-right">{t("payroll.vacationDays")}</TableHead>
                  <TableHead className="text-right">{t("payroll.sickDays")}</TableHead>
                  <TableHead className="text-right">{t("payroll.totalAmount")}</TableHead>
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
                ) : payrollRecords?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No payroll records for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  payrollRecords?.map((record) => (
                    <TableRow key={record.id} data-testid={`payroll-row-${record.id}`}>
                      <TableCell className="font-medium">{record.userId}</TableCell>
                      <TableCell className="text-right">{record.regularHours}h</TableCell>
                      <TableCell className="text-right">{record.overtimeHours}h</TableCell>
                      <TableCell className="text-right">{record.nightHours}h</TableCell>
                      <TableCell className="text-right">{record.vacationDays}</TableCell>
                      <TableCell className="text-right">{record.sickDays}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${parseFloat(record.totalAmount || "0").toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status || "pending")}</TableCell>
                      <TableCell className="text-right">
                        {record.status !== "paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markPaidMutation.mutate(record.id)}
                            disabled={markPaidMutation.isPending}
                            data-testid={`button-mark-paid-${record.id}`}
                          >
                            <Check className="mr-1 h-3 w-3" />
                            {t("payroll.markAsPaid")}
                          </Button>
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
    </div>
  );
}
