import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  Clock,
  Wrench,
  DollarSign,
  Building2,
  Users,
} from "lucide-react";

interface HoursBySite {
  siteId: string;
  siteName: string;
  totalHours: number;
  overtimeHours: number;
  recordCount: number;
}

interface HoursTrend {
  date: string;
  hours: number;
  overtime: number;
}

interface ToolUsage {
  total: number;
  statusCounts: {
    available: number;
    in_use: number;
    maintenance: number;
    lost: number;
    stolen: number;
  };
  byCategory: { name: string; value: number }[];
}

interface PayrollSummary {
  totalPaid: number;
  totalPending: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  employeeCount: number;
  recordCount: number;
  monthlyData: { month: string; amount: number; hours: number }[];
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function Analytics() {
  const { t } = useTranslation();

  const { data: hoursBySite, isLoading: loadingHoursBySite } = useQuery<HoursBySite[]>({
    queryKey: ["/api/analytics/hours-by-site"],
  });

  const { data: hoursTrend, isLoading: loadingHoursTrend } = useQuery<HoursTrend[]>({
    queryKey: ["/api/analytics/hours-trend"],
  });

  const { data: toolUsage, isLoading: loadingToolUsage } = useQuery<ToolUsage>({
    queryKey: ["/api/analytics/tool-usage"],
  });

  const { data: payrollSummary, isLoading: loadingPayroll } = useQuery<PayrollSummary>({
    queryKey: ["/api/analytics/payroll-summary"],
  });

  const toolStatusData = toolUsage ? [
    { name: t("tools.available"), value: toolUsage.statusCounts.available },
    { name: t("tools.inUse"), value: toolUsage.statusCounts.in_use },
    { name: t("tools.maintenance"), value: toolUsage.statusCounts.maintenance },
    { name: t("tools.lost"), value: toolUsage.statusCounts.lost },
    { name: t("tools.stolen"), value: toolUsage.statusCounts.stolen },
  ].filter(item => item.value > 0) : [];

  const summaryCards = [
    {
      title: t("analytics.totalHours"),
      value: hoursBySite?.reduce((sum, s) => sum + s.totalHours, 0).toFixed(1) || "0",
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: t("analytics.activeSites"),
      value: hoursBySite?.length || 0,
      icon: Building2,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: t("analytics.totalTools"),
      value: toolUsage?.total || 0,
      icon: Wrench,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: t("analytics.employeeCount"),
      value: payrollSummary?.employeeCount || 0,
      icon: Users,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  const isLoading = loadingHoursBySite || loadingHoursTrend || loadingToolUsage || loadingPayroll;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-analytics-title">
          {t("analytics.title")}
        </h1>
        <p className="text-muted-foreground">{t("analytics.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((stat, index) => (
          <Card key={index} data-testid={`card-analytics-stat-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid={`text-analytics-value-${index}`}>
                  {stat.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="productivity" className="space-y-4">
        <TabsList data-testid="tabs-analytics">
          <TabsTrigger value="productivity" data-testid="tab-productivity">
            {t("analytics.productivity")}
          </TabsTrigger>
          <TabsTrigger value="tools" data-testid="tab-tools">
            {t("nav.tools")}
          </TabsTrigger>
          <TabsTrigger value="payroll" data-testid="tab-payroll">
            {t("nav.payroll")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="productivity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t("analytics.hoursTrend")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHoursTrend ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : hoursTrend && hoursTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={hoursTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        className="text-xs"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="hours"
                        name={t("analytics.regularHours")}
                        stroke="hsl(var(--chart-1))"
                        fill="hsl(var(--chart-1))"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="overtime"
                        name={t("analytics.overtimeHours")}
                        stroke="hsl(var(--chart-2))"
                        fill="hsl(var(--chart-2))"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    {t("analytics.noData")}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t("analytics.hoursBySite")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHoursBySite ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : hoursBySite && hoursBySite.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hoursBySite} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis 
                        dataKey="siteName" 
                        type="category" 
                        className="text-xs"
                        width={100}
                        tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}...` : value}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="totalHours" 
                        name={t("analytics.regularHours")} 
                        fill="hsl(var(--chart-1))" 
                        radius={[0, 4, 4, 0]}
                      />
                      <Bar 
                        dataKey="overtimeHours" 
                        name={t("analytics.overtimeHours")} 
                        fill="hsl(var(--chart-2))" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    {t("analytics.noData")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  {t("analytics.toolStatus")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingToolUsage ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : toolStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={toolStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {toolStatusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    {t("analytics.noData")}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  {t("analytics.toolsByCategory")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingToolUsage ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : toolUsage?.byCategory && toolUsage.byCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={toolUsage.byCategory}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Bar 
                        dataKey="value" 
                        name={t("analytics.count")} 
                        fill="hsl(var(--chart-3))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    {t("analytics.noData")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("analytics.totalPaid")}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                {loadingPayroll ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-green-600" data-testid="text-total-paid">
                    ${payrollSummary?.totalPaid.toFixed(2) || "0.00"}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("analytics.totalPending")}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                {loadingPayroll ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-orange-600" data-testid="text-total-pending">
                    ${payrollSummary?.totalPending.toFixed(2) || "0.00"}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("analytics.regularHours")}
                </CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                {loadingPayroll ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-regular-hours">
                    {payrollSummary?.totalRegularHours.toFixed(1) || "0"}h
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("analytics.overtimeHours")}
                </CardTitle>
                <Clock className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                {loadingPayroll ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-overtime-hours">
                    {payrollSummary?.totalOvertimeHours.toFixed(1) || "0"}h
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t("analytics.payrollTrend")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPayroll ? (
                <Skeleton className="h-[300px] w-full" />
              ) : payrollSummary?.monthlyData && payrollSummary.monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={payrollSummary.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      className="text-xs"
                      tickFormatter={(value) => {
                        const [year, month] = value.split('-');
                        return `${month}/${year.slice(2)}`;
                      }}
                    />
                    <YAxis yAxisId="left" className="text-xs" />
                    <YAxis yAxisId="right" orientation="right" className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value, name) => {
                        if (name === t("analytics.amount")) return [`$${Number(value).toFixed(2)}`, name];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="amount"
                      name={t("analytics.amount")}
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-1))" }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="hours"
                      name={t("common.hours")}
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-2))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {t("analytics.noData")}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
