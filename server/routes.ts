import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import {
  insertTimeRecordSchema,
  insertToolSchema,
  insertToolTransactionSchema,
  insertLeaveRequestSchema,
  insertSiteSchema,
  insertClientSchema,
  insertContestationSchema,
  insertSiteAssignmentSchema,
} from "@shared/schema";

// Store connected WebSocket clients by room
const chatClients = new Map<string, Map<string, WebSocket>>();

function broadcastToRoom(roomId: string, message: any, excludeUserId?: string) {
  const roomClients = chatClients.get(roomId);
  if (!roomClients) return;
  
  const messageStr = JSON.stringify(message);
  roomClients.forEach((ws, odId) => {
    if (excludeUserId && odId === excludeUserId) return;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);

  // Local Auth - Register (creates tenant and sets user as admin)
  app.post("/api/auth/register", async (req: any, res) => {
    try {
      const { email, password, firstName, lastName, companyName, subscriptionPlan } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      if (!companyName) {
        return res.status(400).json({ message: "Company name is required" });
      }
      
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Check if company name already exists
      const existingTenant = await storage.getTenantByName(companyName);
      if (existingTenant) {
        return res.status(400).json({ message: "A company with this name already exists" });
      }
      
      // Create the tenant first
      const tenant = await storage.createTenant({
        name: companyName,
        email: email || "",
        subscriptionPlan: subscriptionPlan || "basic",
        subscriptionStatus: "active",
      });
      
      // Create the user as admin of the new tenant
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "admin",
        tenantId: tenant.id,
        isActive: true,
      });
      
      req.login({ claims: { sub: user.id }, localAuth: true }, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Failed to login after registration" });
        }
        const { password: _, ...userWithoutPassword } = user;
        res.json({ ...userWithoutPassword, tenant });
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // Local Auth - Login
  app.post("/api/auth/local-login", async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      if (!user.isActive) {
        return res.status(403).json({ message: "Account is disabled" });
      }
      
      req.login({ claims: { sub: user.id }, localAuth: true }, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Failed to login" });
        }
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Local Auth - Logout
  app.post("/api/auth/local-logout", (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
        res.clearCookie("connect.sid");
        res.json({ success: true });
      });
    });
  });

  // Seed route - create default test users for development
  app.post("/api/seed/users", async (req: any, res) => {
    try {
      // First create a default tenant if none exists
      let tenant = await storage.getTenantByName("ConstructTrack Demo");
      if (!tenant) {
        tenant = await storage.createTenant({
          name: "ConstructTrack Demo",
          email: "demo@constructtrack.com",
          phone: "+1234567890",
          address: "123 Construction Ave",
          subscriptionPlan: "professional",
          subscriptionStatus: "active",
        });
      }

      const testUsers = [
        { password: "superadmin123", role: "superadmin", firstName: "Super", lastName: "Admin", email: "superadmin@constructtrack.com" },
        { password: "admin123", role: "admin", firstName: "Admin", lastName: "User", email: "admin@constructtrack.com" },
        { password: "manager123", role: "manager", firstName: "Manager", lastName: "User", email: "manager@constructtrack.com" },
        { password: "employee123", role: "employee", firstName: "Employee", lastName: "User", email: "employee@constructtrack.com" },
        { password: "client123", role: "client", firstName: "Client", lastName: "User", email: "client@constructtrack.com" },
      ];

      const createdUsers = [];
      for (const userData of testUsers) {
        let user = await storage.getUserByEmail(userData.email);
        if (!user) {
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          user = await storage.createUser({
            email: userData.email,
            password: hashedPassword,
            role: userData.role,
            firstName: userData.firstName,
            lastName: userData.lastName,
            tenantId: userData.role !== "superadmin" ? tenant.id : undefined,
            isActive: true,
          });
          createdUsers.push({ email: userData.email, role: userData.role, created: true });
        } else {
          createdUsers.push({ email: userData.email, role: userData.role, created: false, message: "already exists" });
        }
      }

      res.json({ message: "Seed completed", tenant: { id: tenant.id, name: tenant.name }, users: createdUsers });
    } catch (error) {
      console.error("Error seeding users:", error);
      res.status(500).json({ message: "Failed to seed users", error: String(error) });
    }
  });

  // Helper to get effective tenantId (impersonated or user's own)
  const getEffectiveTenantId = (req: any, user: { role: string; tenantId?: string | null }): string | null => {
    // If superadmin and impersonating, use impersonated tenant
    if (user.role === "superadmin" && req.session?.impersonatedTenantId) {
      return req.session.impersonatedTenantId;
    }
    return user.tenantId || null;
  };

  // Auth routes - supports both Replit Auth and local auth
  app.get("/api/auth/user", async (req: any, res) => {
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (user) {
        const { password: _, ...userWithoutPassword } = user;
        
        // Include impersonation info for superadmins
        const impersonation = user.role === "superadmin" && req.session.impersonatedTenantId ? {
          isImpersonating: true,
          impersonatedTenantId: req.session.impersonatedTenantId,
          impersonatedTenantName: req.session.impersonatedTenantName,
        } : null;
        
        res.json({
          ...userWithoutPassword,
          impersonation,
        });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/hours-by-site", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      
      const sites = await storage.getSitesByTenant(effectiveTenantId);
      const timeRecords = await storage.getTimeRecordsByTenant(effectiveTenantId);
      
      const hoursBySite = sites.map(site => {
        const siteRecords = timeRecords.filter(r => r.siteId === site.id);
        const totalHours = siteRecords.reduce((sum, r) => sum + parseFloat(r.totalHours || "0"), 0);
        const overtimeHours = siteRecords.reduce((sum, r) => sum + parseFloat(r.overtimeHours || "0"), 0);
        return {
          siteId: site.id,
          siteName: site.name,
          totalHours: Math.round(totalHours * 10) / 10,
          overtimeHours: Math.round(overtimeHours * 10) / 10,
          recordCount: siteRecords.length,
        };
      });
      
      res.json(hoursBySite);
    } catch (error) {
      console.error("Error fetching hours by site:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/hours-trend", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      
      const timeRecords = await storage.getTimeRecordsByTenant(effectiveTenantId);
      const days = parseInt(req.query.days as string) || 30;
      const now = new Date();
      
      const trendData: { date: string; hours: number; overtime: number }[] = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dayRecords = timeRecords.filter(r => {
          const checkIn = new Date(r.checkInTime);
          return checkIn >= date && checkIn < nextDate;
        });
        
        const hours = dayRecords.reduce((sum, r) => sum + parseFloat(r.totalHours || "0"), 0);
        const overtime = dayRecords.reduce((sum, r) => sum + parseFloat(r.overtimeHours || "0"), 0);
        
        trendData.push({
          date: date.toISOString().split('T')[0],
          hours: Math.round(hours * 10) / 10,
          overtime: Math.round(overtime * 10) / 10,
        });
      }
      
      res.json(trendData);
    } catch (error) {
      console.error("Error fetching hours trend:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/tool-usage", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      
      const tools = await storage.getToolsByTenant(effectiveTenantId);
      
      const statusCounts = {
        available: tools.filter(t => t.status === "available").length,
        in_use: tools.filter(t => t.status === "in_use").length,
        maintenance: tools.filter(t => t.status === "maintenance").length,
        lost: tools.filter(t => t.status === "lost").length,
        stolen: tools.filter(t => t.status === "stolen").length,
      };
      
      const toolsByCategory: Record<string, number> = {};
      tools.forEach(tool => {
        const category = tool.category || "Other";
        toolsByCategory[category] = (toolsByCategory[category] || 0) + 1;
      });
      
      res.json({
        total: tools.length,
        statusCounts,
        byCategory: Object.entries(toolsByCategory).map(([name, value]) => ({ name, value })),
      });
    } catch (error) {
      console.error("Error fetching tool usage:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/payroll-summary", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      
      const payrollRecords = await storage.getPayrollRecordsByTenant(effectiveTenantId);
      const users = await storage.getUsersByTenant(effectiveTenantId);
      
      const summary = {
        totalPaid: payrollRecords
          .filter(p => p.status === "paid")
          .reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0),
        totalPending: payrollRecords
          .filter(p => p.status === "pending" || p.status === "processing")
          .reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0),
        totalRegularHours: payrollRecords.reduce((sum, p) => sum + parseFloat(p.regularHours || "0"), 0),
        totalOvertimeHours: payrollRecords.reduce((sum, p) => sum + parseFloat(p.overtimeHours || "0"), 0),
        employeeCount: users.filter(u => u.role === "employee").length,
        recordCount: payrollRecords.length,
      };
      
      // Monthly breakdown for the last 6 months
      const monthlyData: { month: string; amount: number; hours: number }[] = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = date.toISOString().slice(0, 7);
        
        const monthRecords = payrollRecords.filter(p => {
          const period = p.periodStart ? new Date(p.periodStart) : null;
          return period && period.toISOString().slice(0, 7) === monthStr;
        });
        
        monthlyData.push({
          month: monthStr,
          amount: Math.round(monthRecords.reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0) * 100) / 100,
          hours: Math.round(monthRecords.reduce((sum, p) => sum + parseFloat(p.regularHours || "0") + parseFloat(p.overtimeHours || "0"), 0) * 10) / 10,
        });
      }
      
      res.json({ ...summary, monthlyData });
    } catch (error) {
      console.error("Error fetching payroll summary:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Service Order Calculator
  app.get("/api/service-orders/calculate", isAuthenticated, async (req: any, res) => {
    // Helper to safely parse numeric values, returning 0 for NaN/null/undefined
    const safeParseFloat = (value: any): number => {
      if (value === null || value === undefined) return 0;
      const parsed = parseFloat(String(value).replace(',', '.'));
      return isNaN(parsed) ? 0 : parsed;
    };
    
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      
      // Only managers, admins, and superadmins can access
      if (user.role !== "admin" && user.role !== "manager" && user.role !== "superadmin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const { startDate, endDate, siteId, clientId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start and end dates are required" });
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      if (start > end) {
        return res.status(400).json({ message: "Start date must be before end date" });
      }
      
      end.setHours(23, 59, 59, 999);
      
      const sites = await storage.getSitesByTenant(effectiveTenantId);
      const clients = await storage.getClientsByTenant(effectiveTenantId);
      const timeRecords = await storage.getTimeRecordsByTenant(effectiveTenantId);
      const users = await storage.getUsersByTenant(effectiveTenantId);
      
      // Filter sites - empty string or "all" means no filter
      let filteredSites = sites;
      if (siteId && siteId !== "all" && siteId !== "") {
        filteredSites = filteredSites.filter(s => s.id === siteId);
      }
      if (clientId && clientId !== "all" && clientId !== "") {
        filteredSites = filteredSites.filter(s => s.clientId === clientId);
      }
      
      const serviceOrders = [];
      
      for (const site of filteredSites) {
        // Filter time records for this site within the date range
        const siteRecords = timeRecords.filter(record => {
          if (record.siteId !== site.id) return false;
          const checkIn = new Date(record.checkInTime);
          return checkIn >= start && checkIn <= end;
        });
        
        if (siteRecords.length === 0) continue;
        
        const approvedRecords = siteRecords.filter(r => r.status === "approved");
        const pendingRecords = siteRecords.filter(r => r.status === "pending");
        
        let totalHours = 0;
        let overtimeHours = 0;
        const workerSet = new Set<string>();
        const workDaysSet = new Set<string>();
        
        // Only calculate from approved records
        for (const record of approvedRecords) {
          totalHours += safeParseFloat(record.totalHours);
          overtimeHours += safeParseFloat(record.overtimeHours);
          workerSet.add(record.userId);
          const checkInDate = new Date(record.checkInTime);
          workDaysSet.add(`${checkInDate.getFullYear()}-${checkInDate.getMonth()}-${checkInDate.getDate()}`);
        }
        
        const regularHours = Math.max(0, totalHours - overtimeHours);
        const hourlyRate = safeParseFloat(site.hourlyRate);
        const overtimeMultiplier = 1.5;
        
        let regularCost = 0;
        let overtimeCost = 0;
        
        if (site.billingType === "hourly") {
          regularCost = regularHours * hourlyRate;
          overtimeCost = overtimeHours * hourlyRate * overtimeMultiplier;
        } else if (site.billingType === "daily") {
          // Daily rate: hourlyRate is the daily rate in this case
          const dailyRate = hourlyRate;
          regularCost = workDaysSet.size * dailyRate;
          overtimeCost = overtimeHours * (dailyRate / 8) * overtimeMultiplier;
        } else if (site.billingType === "fixed") {
          // Fixed: hourlyRate represents the fixed project rate, no overtime calculation
          regularCost = hourlyRate;
          overtimeCost = 0;
        }
        
        const client = clients.find(c => c.id === site.clientId);
        const workerNames = Array.from(workerSet).map(userId => {
          const u = users.find(usr => usr.id === userId);
          return u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || userId : userId;
        });
        
        serviceOrders.push({
          siteId: site.id,
          siteName: site.name,
          clientId: site.clientId,
          clientName: client?.name || "Unknown",
          billingType: site.billingType || "hourly",
          hourlyRate,
          totalHours: Math.round(totalHours * 100) / 100,
          overtimeHours: Math.round(overtimeHours * 100) / 100,
          regularHours: Math.round(regularHours * 100) / 100,
          approvedRecords: approvedRecords.length,
          pendingRecords: pendingRecords.length,
          regularCost: Math.round(regularCost * 100) / 100,
          overtimeCost: Math.round(overtimeCost * 100) / 100,
          totalCost: Math.round((regularCost + overtimeCost) * 100) / 100,
          workers: workerNames,
          workerIds: Array.from(workerSet),
          workDays: workDaysSet.size,
        });
      }
      
      // Sort by total cost descending
      serviceOrders.sort((a, b) => b.totalCost - a.totalCost);
      
      // Calculate totals
      const totals = serviceOrders.reduce(
        (acc, order) => ({
          totalHours: acc.totalHours + order.totalHours,
          overtimeHours: acc.overtimeHours + order.overtimeHours,
          totalCost: acc.totalCost + order.totalCost,
          approvedRecords: acc.approvedRecords + order.approvedRecords,
          pendingRecords: acc.pendingRecords + order.pendingRecords,
        }),
        { totalHours: 0, overtimeHours: 0, totalCost: 0, approvedRecords: 0, pendingRecords: 0 }
      );
      
      res.json({
        orders: serviceOrders,
        totals: {
          totalHours: Math.round(totals.totalHours * 100) / 100,
          overtimeHours: Math.round(totals.overtimeHours * 100) / 100,
          totalCost: Math.round(totals.totalCost * 100) / 100,
          approvedRecords: totals.approvedRecords,
          pendingRecords: totals.pendingRecords,
        },
        period: { startDate, endDate },
        overtimeMultiplier: 1.5,
      });
    } catch (error) {
      console.error("Error calculating service orders:", error);
      res.status(500).json({ message: "Failed to calculate service orders" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      
      const timeRecords = await storage.getTimeRecordsByTenant(effectiveTenantId);
      const tools = await storage.getToolsByTenant(effectiveTenantId);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const activeWorkers = timeRecords.filter(r => 
        r.checkInTime && !r.checkOutTime
      ).length;
      
      const todayRecords = timeRecords.filter(r => {
        const checkIn = new Date(r.checkInTime);
        return checkIn >= today;
      });
      
      const hoursToday = todayRecords.reduce((sum, r) => {
        return sum + parseFloat(r.totalHours || "0");
      }, 0);
      
      const pendingApprovals = timeRecords.filter(r => r.status === "pending").length;
      const toolsOut = tools.filter(t => t.status === "in_use").length;
      
      res.json({
        activeWorkers,
        hoursToday: Math.round(hoursToday * 10) / 10,
        pendingApprovals,
        toolsOut,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Tenant/Company routes
  app.get("/api/tenant", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      const tenant = await storage.getTenant(effectiveTenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  app.patch("/api/tenant", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      // Only admins, managers, and impersonating superadmins can update tenant settings
      if (user.role !== "admin" && user.role !== "manager" && user.role !== "superadmin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      const tenant = await storage.updateTenant(effectiveTenantId, req.body);
      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ message: "Failed to update tenant" });
    }
  });

  // User routes
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      const users = await storage.getUsersByTenant(effectiveTenantId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Only admin and manager can create users
      if (currentUser.role !== "admin" && currentUser.role !== "manager") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const effectiveTenantId = currentUser.tenantId;
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }

      const { email, firstName, lastName, phone, role, hourlyRate, pin } = req.body;

      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, first name, and last name are required" });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || undefined,
        role: role || "employee",
        tenantId: effectiveTenantId,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate).toString() : undefined,
        pin: pin || undefined,
        isActive: true,
      });

      const { password: _, ...userWithoutPassword } = newUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Only admin and manager can update users
      if (currentUser.role !== "admin" && currentUser.role !== "manager") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Ensure users can only update users in their tenant
      if (currentUser.tenantId !== targetUser.tenantId) {
        return res.status(403).json({ message: "Cannot update user from another tenant" });
      }

      const updateData: any = { ...req.body };

      // Handle hourlyRate conversion
      if (updateData.hourlyRate) {
        updateData.hourlyRate = parseFloat(updateData.hourlyRate).toString();
      }

      // Handle password hashing if password is being updated
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      const user = await storage.updateUser(req.params.id, updateData);
      const { password: _, ...userWithoutPassword } = user || {};
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Only admin can delete users
      if (currentUser.role !== "admin") {
        return res.status(403).json({ message: "Only admins can delete users" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Ensure users can only delete users in their tenant
      if (currentUser.tenantId !== targetUser.tenantId) {
        return res.status(403).json({ message: "Cannot delete user from another tenant" });
      }

      // Prevent deleting the last admin
      if (targetUser.role === "admin" && currentUser.tenantId) {
        const adminCount = (await storage.getUsersByTenant(currentUser.tenantId)).filter(
          (u) => u.role === "admin"
        ).length;
        if (adminCount <= 1) {
          return res.status(400).json({ message: "Cannot delete the last admin" });
        }
      }

      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Sites routes
  app.get("/api/sites", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      const sites = await storage.getSitesByTenant(effectiveTenantId);
      res.json(sites);
    } catch (error) {
      console.error("Error fetching sites:", error);
      res.status(500).json({ message: "Failed to fetch sites" });
    }
  });

  app.get("/api/sites/:id", isAuthenticated, async (req: any, res) => {
    try {
      const site = await storage.getSite(req.params.id);
      res.json(site);
    } catch (error) {
      console.error("Error fetching site:", error);
      res.status(500).json({ message: "Failed to fetch site" });
    }
  });

  app.post("/api/sites", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      // Sanitize empty/whitespace strings to null for numeric fields
      const sanitizedBody = { ...req.body };
      const numericFields = ['hourlyRate', 'latitude', 'longitude', 'geofenceRadius'];
      for (const field of numericFields) {
        const val = sanitizedBody[field];
        if (val === '' || val === undefined || (typeof val === 'string' && val.trim() === '')) {
          sanitizedBody[field] = null;
        }
      }
      const data = insertSiteSchema.parse({ ...sanitizedBody, tenantId: effectiveTenantId });
      const site = await storage.createSite(data);
      res.json(site);
    } catch (error) {
      console.error("Error creating site:", error);
      res.status(500).json({ message: "Failed to create site" });
    }
  });

  app.patch("/api/sites/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Sanitize empty/whitespace strings to null for numeric fields
      const sanitizedBody = { ...req.body };
      const numericFields = ['hourlyRate', 'latitude', 'longitude', 'geofenceRadius'];
      for (const field of numericFields) {
        const val = sanitizedBody[field];
        if (val === '' || (typeof val === 'string' && val.trim() === '')) {
          sanitizedBody[field] = null;
        }
      }
      const site = await storage.updateSite(req.params.id, sanitizedBody);
      res.json(site);
    } catch (error) {
      console.error("Error updating site:", error);
      res.status(500).json({ message: "Failed to update site" });
    }
  });

  app.delete("/api/sites/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteSite(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting site:", error);
      res.status(500).json({ message: "Failed to delete site" });
    }
  });

  // Site Assignments
  app.get("/api/sites/:siteId/assignments", isAuthenticated, async (req: any, res) => {
    try {
      const assignments = await storage.getSiteAssignmentsBySite(req.params.siteId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.post("/api/site-assignments", isAuthenticated, async (req: any, res) => {
    try {
      const data = insertSiteAssignmentSchema.parse(req.body);
      const assignment = await storage.createSiteAssignment(data);
      res.json(assignment);
    } catch (error) {
      console.error("Error creating assignment:", error);
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  app.get("/api/my-assignments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assignments = await storage.getSiteAssignmentsByUser(userId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Clients routes
  app.get("/api/clients", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      const clients = await storage.getClientsByTenant(effectiveTenantId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      console.log("Creating client with body:", req.body, "tenantId:", effectiveTenantId);
      const data = insertClientSchema.parse({ ...req.body, tenantId: effectiveTenantId });
      const client = await storage.createClient(data);
      res.json(client);
    } catch (error: any) {
      console.error("Error creating client:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create client", error: error.message });
    }
  });

  app.patch("/api/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Time Records routes
  app.get("/api/time-records", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      const records = await storage.getTimeRecordsByTenant(effectiveTenantId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching time records:", error);
      res.status(500).json({ message: "Failed to fetch time records" });
    }
  });

  app.get("/api/time-records/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const records = await storage.getTimeRecordsByUser(userId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching time records:", error);
      res.status(500).json({ message: "Failed to fetch time records" });
    }
  });

  app.get("/api/time-records/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const record = await storage.getActiveTimeRecord(userId);
      res.json(record || null);
    } catch (error) {
      console.error("Error fetching active record:", error);
      res.status(500).json({ message: "Failed to fetch active record" });
    }
  });

  app.get("/api/time-records/site/:siteId", isAuthenticated, async (req: any, res) => {
    try {
      const records = await storage.getTimeRecordsBySite(req.params.siteId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching time records:", error);
      res.status(500).json({ message: "Failed to fetch time records" });
    }
  });

  app.post("/api/time-records/check-in", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }

      // Check if already checked in
      const activeRecord = await storage.getActiveTimeRecord(userId);
      if (activeRecord) {
        return res.status(400).json({ message: "Already checked in" });
      }

      // Validate geofence if site coordinates provided
      const { siteId, latitude, longitude, photo, deviceId } = req.body;
      const site = await storage.getSite(siteId);
      if (!site) {
        return res.status(400).json({ message: "Site not found" });
      }

      let isWithinGeofence = true;
      let isSuspicious = false;
      let suspiciousReason = "";

      if (site.latitude && site.longitude && latitude && longitude) {
        const distance = calculateDistance(
          parseFloat(site.latitude),
          parseFloat(site.longitude),
          latitude,
          longitude
        );
        isWithinGeofence = distance <= (site.geofenceRadius || 100);
        if (!isWithinGeofence) {
          isSuspicious = true;
          suspiciousReason = `Check-in outside geofence (${Math.round(distance)}m from site)`;
        }
      }

      const record = await storage.createTimeRecord({
        tenantId: effectiveTenantId,
        userId,
        siteId,
        checkInTime: new Date(),
        checkInLatitude: latitude?.toString(),
        checkInLongitude: longitude?.toString(),
        checkInPhoto: photo,
        checkInDeviceId: deviceId,
        isWithinGeofence,
        isSuspicious,
        suspiciousReason,
        status: "pending",
      });

      res.json(record);
    } catch (error) {
      console.error("Error checking in:", error);
      res.status(500).json({ message: "Failed to check in" });
    }
  });

  app.post("/api/time-records/:id/check-out", isAuthenticated, async (req: any, res) => {
    try {
      const { latitude, longitude, photo, deviceId } = req.body;
      const record = await storage.getTimeRecord(req.params.id);
      
      if (!record) {
        return res.status(404).json({ message: "Record not found" });
      }
      if (record.checkOutTime) {
        return res.status(400).json({ message: "Already checked out" });
      }

      const checkOutTime = new Date();
      const totalMs = checkOutTime.getTime() - new Date(record.checkInTime).getTime();
      const totalHours = (totalMs / 1000 / 60 / 60).toFixed(2);
      const overtimeHours = Math.max(0, parseFloat(totalHours) - 8).toFixed(2);

      const updated = await storage.updateTimeRecord(req.params.id, {
        checkOutTime,
        checkOutLatitude: latitude?.toString(),
        checkOutLongitude: longitude?.toString(),
        checkOutPhoto: photo,
        checkOutDeviceId: deviceId,
        totalHours,
        overtimeHours,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error checking out:", error);
      res.status(500).json({ message: "Failed to check out" });
    }
  });

  app.patch("/api/time-records/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const record = await storage.updateTimeRecord(req.params.id, {
        status: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
      });
      res.json(record);
    } catch (error) {
      console.error("Error approving record:", error);
      res.status(500).json({ message: "Failed to approve record" });
    }
  });

  app.patch("/api/time-records/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const record = await storage.updateTimeRecord(req.params.id, {
        status: "rejected",
        approvedBy: userId,
        approvedAt: new Date(),
        notes: req.body.reason,
      });
      res.json(record);
    } catch (error) {
      console.error("Error rejecting record:", error);
      res.status(500).json({ message: "Failed to reject record" });
    }
  });

  // Client Portal - Time records validation
  app.patch("/api/time-records/:id/client-validate", isAuthenticated, async (req: any, res) => {
    try {
      const { validated } = req.body;
      const record = await storage.updateTimeRecord(req.params.id, {
        clientValidated: validated,
        clientValidatedAt: new Date(),
      });
      res.json(record);
    } catch (error) {
      console.error("Error validating record:", error);
      res.status(500).json({ message: "Failed to validate record" });
    }
  });

  // Contestations routes
  app.post("/api/contestations", isAuthenticated, async (req: any, res) => {
    try {
      const data = insertContestationSchema.parse(req.body);
      const contestation = await storage.createContestation(data);
      // Update time record status
      await storage.updateTimeRecord(req.body.timeRecordId, { status: "contested" });
      res.json(contestation);
    } catch (error) {
      console.error("Error creating contestation:", error);
      res.status(500).json({ message: "Failed to create contestation" });
    }
  });

  app.patch("/api/contestations/:id/resolve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contestation = await storage.updateContestation(req.params.id, {
        status: req.body.status,
        resolution: req.body.resolution,
        resolvedBy: userId,
        resolvedAt: new Date(),
      });
      res.json(contestation);
    } catch (error) {
      console.error("Error resolving contestation:", error);
      res.status(500).json({ message: "Failed to resolve contestation" });
    }
  });

  // Tools routes
  app.get("/api/tools", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      const tools = await storage.getToolsByTenant(effectiveTenantId);
      res.json(tools);
    } catch (error) {
      console.error("Error fetching tools:", error);
      res.status(500).json({ message: "Failed to fetch tools" });
    }
  });

  app.get("/api/tools/:id", isAuthenticated, async (req: any, res) => {
    try {
      const tool = await storage.getTool(req.params.id);
      res.json(tool);
    } catch (error) {
      console.error("Error fetching tool:", error);
      res.status(500).json({ message: "Failed to fetch tool" });
    }
  });

  app.get("/api/tools/qr/:qrCode", isAuthenticated, async (req: any, res) => {
    try {
      const tool = await storage.getToolByQrCode(req.params.qrCode);
      res.json(tool);
    } catch (error) {
      console.error("Error fetching tool:", error);
      res.status(500).json({ message: "Failed to fetch tool" });
    }
  });

  app.post("/api/tools", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      // Only managers and above can create tools
      const managerRoles = ["manager", "admin", "superadmin"];
      if (!managerRoles.includes(user.role)) {
        return res.status(403).json({ message: "Only managers can create tools" });
      }
      const data = insertToolSchema.parse({ ...req.body, tenantId: effectiveTenantId });
      const tool = await storage.createTool(data);
      res.json(tool);
    } catch (error) {
      console.error("Error creating tool:", error);
      res.status(500).json({ message: "Failed to create tool" });
    }
  });

  app.patch("/api/tools/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      // Only managers and above can update tools
      const managerRoles = ["manager", "admin", "superadmin"];
      if (!user || !managerRoles.includes(user.role)) {
        return res.status(403).json({ message: "Only managers can update tools" });
      }
      const tool = await storage.updateTool(req.params.id, req.body);
      res.json(tool);
    } catch (error) {
      console.error("Error updating tool:", error);
      res.status(500).json({ message: "Failed to update tool" });
    }
  });

  app.delete("/api/tools/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      // Only managers and above can delete tools
      const managerRoles = ["manager", "admin", "superadmin"];
      if (!user || !managerRoles.includes(user.role)) {
        return res.status(403).json({ message: "Only managers can delete tools" });
      }
      const success = await storage.deleteTool(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Tool not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tool:", error);
      res.status(500).json({ message: "Failed to delete tool" });
    }
  });

  // Tool Transactions (checkout/checkin)
  app.post("/api/tools/:id/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tool = await storage.getTool(req.params.id);
      if (!tool) {
        return res.status(404).json({ message: "Tool not found" });
      }
      if (tool.status !== "available") {
        return res.status(400).json({ message: "Tool not available" });
      }

      const transaction = await storage.createToolTransaction({
        toolId: req.params.id,
        userId,
        siteId: req.body.siteId,
        type: "checkout",
        photo: req.body.photo,
        notes: req.body.notes,
        condition: req.body.condition || "good",
      });

      await storage.updateTool(req.params.id, {
        status: "in_use",
        currentUserId: userId,
        currentSiteId: req.body.siteId,
      });

      res.json(transaction);
    } catch (error) {
      console.error("Error checking out tool:", error);
      res.status(500).json({ message: "Failed to checkout tool" });
    }
  });

  app.post("/api/tools/:id/checkin", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tool = await storage.getTool(req.params.id);
      if (!tool) {
        return res.status(404).json({ message: "Tool not found" });
      }

      const transaction = await storage.createToolTransaction({
        toolId: req.params.id,
        userId,
        siteId: req.body.siteId,
        type: "checkin",
        photo: req.body.photo,
        notes: req.body.notes,
        condition: req.body.condition || "good",
      });

      await storage.updateTool(req.params.id, {
        status: req.body.condition === "damaged" ? "maintenance" : "available",
        currentUserId: null,
        currentSiteId: null,
      });

      res.json(transaction);
    } catch (error) {
      console.error("Error checking in tool:", error);
      res.status(500).json({ message: "Failed to checkin tool" });
    }
  });

  app.get("/api/tools/:id/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const transactions = await storage.getToolTransactionsByTool(req.params.id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Leave Requests routes
  app.get("/api/leave-requests/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requests = await storage.getLeaveRequestsByUser(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      res.status(500).json({ message: "Failed to fetch leave requests" });
    }
  });

  app.get("/api/leave-requests/team", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      const requests = await storage.getLeaveRequestsByTenant(effectiveTenantId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      res.status(500).json({ message: "Failed to fetch leave requests" });
    }
  });

  app.post("/api/leave-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      const data = insertLeaveRequestSchema.parse({
        ...req.body,
        tenantId: effectiveTenantId,
        userId,
      });
      const request = await storage.createLeaveRequest(data);
      res.json(request);
    } catch (error) {
      console.error("Error creating leave request:", error);
      res.status(500).json({ message: "Failed to create leave request" });
    }
  });

  app.post("/api/leave-requests/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const request = await storage.updateLeaveRequest(req.params.id, {
        status: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
      });
      res.json(request);
    } catch (error) {
      console.error("Error approving request:", error);
      res.status(500).json({ message: "Failed to approve request" });
    }
  });

  app.post("/api/leave-requests/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const request = await storage.updateLeaveRequest(req.params.id, {
        status: "rejected",
        approvedBy: userId,
        approvedAt: new Date(),
      });
      res.json(request);
    } catch (error) {
      console.error("Error rejecting request:", error);
      res.status(500).json({ message: "Failed to reject request" });
    }
  });

  // Payroll routes
  app.get("/api/payroll", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      const records = await storage.getPayrollRecordsByTenant(effectiveTenantId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching payroll:", error);
      res.status(500).json({ message: "Failed to fetch payroll" });
    }
  });

  app.get("/api/payroll/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const records = await storage.getPayrollRecordsByUser(userId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching payroll:", error);
      res.status(500).json({ message: "Failed to fetch payroll" });
    }
  });

  // Create payroll record (admin only)
  app.post("/api/payroll", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Only admins can create payroll records" });
      }
      
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) {
        return res.status(400).json({ message: "No tenant context" });
      }
      
      const { userId: employeeId, periodStart, periodEnd, regularHours, overtimeHours, nightHours, vacationDays, sickDays, unpaidAbsenceDays, totalAmount } = req.body;
      
      if (!employeeId || !periodStart || !periodEnd) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const employee = await storage.getUser(employeeId);
      if (!employee || employee.tenantId !== effectiveTenantId) {
        return res.status(400).json({ message: "Invalid employee" });
      }
      
      const record = await storage.createPayrollRecord({
        tenantId: effectiveTenantId,
        userId: employeeId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        regularHours: regularHours ? parseFloat(regularHours).toString() : "0",
        overtimeHours: overtimeHours ? parseFloat(overtimeHours).toString() : "0",
        nightHours: nightHours ? parseFloat(nightHours).toString() : "0",
        vacationDays: vacationDays || 0,
        sickDays: sickDays || 0,
        unpaidAbsenceDays: unpaidAbsenceDays || 0,
        totalAmount: totalAmount ? parseFloat(totalAmount).toString() : undefined,
        status: "pending",
      });
      
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating payroll record:", error);
      res.status(500).json({ message: "Failed to create payroll record" });
    }
  });

  // Update payroll record (admin only)
  app.patch("/api/payroll/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Only admins can update payroll records" });
      }
      
      const effectiveTenantId = getEffectiveTenantId(req, user);
      const { id } = req.params;
      
      const record = await storage.getPayrollRecord(id);
      if (!record || record.tenantId !== effectiveTenantId) {
        return res.status(404).json({ message: "Payroll record not found" });
      }
      
      const { regularHours, overtimeHours, nightHours, vacationDays, sickDays, unpaidAbsenceDays, totalAmount, status, paidAt } = req.body;
      
      const updateData: any = {};
      if (regularHours !== undefined) updateData.regularHours = parseFloat(regularHours).toString();
      if (overtimeHours !== undefined) updateData.overtimeHours = parseFloat(overtimeHours).toString();
      if (nightHours !== undefined) updateData.nightHours = parseFloat(nightHours).toString();
      if (vacationDays !== undefined) updateData.vacationDays = vacationDays;
      if (sickDays !== undefined) updateData.sickDays = sickDays;
      if (unpaidAbsenceDays !== undefined) updateData.unpaidAbsenceDays = unpaidAbsenceDays;
      if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount).toString();
      if (status !== undefined) updateData.status = status;
      if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : null;
      
      const updated = await storage.updatePayrollRecord(id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating payroll record:", error);
      res.status(500).json({ message: "Failed to update payroll record" });
    }
  });

  // Object Storage routes
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/photos", isAuthenticated, async (req: any, res) => {
    if (!req.body.photoURL) {
      return res.status(400).json({ error: "photoURL is required" });
    }
    const userId = req.user?.claims?.sub;
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.photoURL,
        {
          owner: userId,
          visibility: "public",
        }
      );
      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============ NOTIFICATION ROUTES ============

  // Get user's notifications
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get unread notifications count
  app.get("/api/notifications/unread", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUnreadNotificationsByUser(userId);
      res.json({ count: notifications.length, notifications });
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const notification = await storage.markNotificationRead(req.params.id);
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Failed to mark notification read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ message: "Failed to mark all notifications read" });
    }
  });

  // Get notification preferences
  app.get("/api/notification-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let prefs = await storage.getNotificationPreferences(userId);
      if (!prefs) {
        prefs = await storage.upsertNotificationPreferences({ userId });
      }
      res.json(prefs);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch notification preferences" });
    }
  });

  // Update notification preferences
  app.put("/api/notification-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const prefs = await storage.upsertNotificationPreferences({ userId, ...req.body });
      res.json(prefs);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // ============ DOCUMENT PORTAL ROUTES ============

  // Get documents for a site
  app.get("/api/sites/:siteId/documents", isAuthenticated, async (req: any, res) => {
    try {
      const documents = await storage.getSiteDocumentsBySite(req.params.siteId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Upload a document
  app.post("/api/sites/:siteId/documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const document = await storage.createSiteDocument({
        tenantId: user?.tenantId || "",
        siteId: req.params.siteId,
        uploadedBy: userId,
        ...req.body,
      });
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  // Get document versions
  app.get("/api/documents/:id/versions", isAuthenticated, async (req: any, res) => {
    try {
      const versions = await storage.getSiteDocumentVersions(req.params.id);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching document versions:", error);
      res.status(500).json({ message: "Failed to fetch document versions" });
    }
  });

  // Update a document (create new version)
  app.put("/api/documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existingDoc = await storage.getSiteDocument(req.params.id);
      if (!existingDoc) {
        return res.status(404).json({ message: "Document not found" });
      }
      // Create new version
      const newDoc = await storage.createSiteDocument({
        tenantId: existingDoc.tenantId,
        siteId: existingDoc.siteId,
        uploadedBy: userId,
        name: req.body.name || existingDoc.name,
        category: req.body.category || existingDoc.category,
        description: req.body.description,
        fileUrl: req.body.fileUrl,
        fileType: req.body.fileType,
        fileSize: req.body.fileSize,
        version: (existingDoc.version || 1) + 1,
        parentDocumentId: existingDoc.parentDocumentId || existingDoc.id,
      });
      // Deactivate old version
      await storage.updateSiteDocument(existingDoc.id, { isActive: false });
      res.json(newDoc);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  // Delete a document (soft delete)
  app.delete("/api/documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.updateSiteDocument(req.params.id, { isActive: false });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // ============ CHAT ROUTES ============

  // Get chat rooms for user
  app.get("/api/chat/rooms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rooms = await storage.getChatRoomsByUser(userId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      res.status(500).json({ message: "Failed to fetch chat rooms" });
    }
  });

  // Get chat rooms for a site
  app.get("/api/sites/:siteId/chat", isAuthenticated, async (req: any, res) => {
    try {
      const rooms = await storage.getChatRoomsBySite(req.params.siteId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching site chat rooms:", error);
      res.status(500).json({ message: "Failed to fetch chat rooms" });
    }
  });

  // Create or get chat room for site
  app.post("/api/sites/:siteId/chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const site = await storage.getSite(req.params.siteId);
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }
      // Check if room already exists
      const existingRooms = await storage.getChatRoomsBySite(req.params.siteId);
      if (existingRooms.length > 0) {
        // Add user as participant if not already
        const participants = await storage.getChatParticipants(existingRooms[0].id);
        if (!participants.find(p => p.userId === userId)) {
          await storage.addChatParticipant({ roomId: existingRooms[0].id, userId, role: "member" });
        }
        return res.json(existingRooms[0]);
      }
      // Create new room
      const room = await storage.createChatRoom({
        tenantId: user?.tenantId || site.tenantId,
        siteId: req.params.siteId,
        name: site.name,
        type: "site",
      });
      // Add creator as admin
      await storage.addChatParticipant({ roomId: room.id, userId, role: "admin" });
      res.status(201).json(room);
    } catch (error) {
      console.error("Error creating chat room:", error);
      res.status(500).json({ message: "Failed to create chat room" });
    }
  });

  // Get messages for a room
  app.get("/api/chat/rooms/:roomId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const messages = await storage.getChatMessages(req.params.roomId, limit);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send a message
  app.post("/api/chat/rooms/:roomId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const message = await storage.createChatMessage({
        roomId: req.params.roomId,
        senderId: userId,
        content: req.body.content,
        type: req.body.type || "text",
        attachmentUrl: req.body.attachmentUrl,
      });
      // Update last read for sender
      await storage.updateChatParticipantLastRead(req.params.roomId, userId);
      
      // Broadcast to room via WebSocket
      broadcastToRoom(req.params.roomId, {
        type: "new_message",
        message: {
          ...message,
          sender: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl } : null,
        },
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get room participants
  app.get("/api/chat/rooms/:roomId/participants", isAuthenticated, async (req: any, res) => {
    try {
      const participants = await storage.getChatParticipants(req.params.roomId);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching participants:", error);
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });

  // Mark messages as read
  app.post("/api/chat/rooms/:roomId/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.updateChatParticipantLastRead(req.params.roomId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages read:", error);
      res.status(500).json({ message: "Failed to mark messages read" });
    }
  });

  // ============ SUPERADMIN ROUTES ============
  
  // Helper to check superadmin role
  const isSuperAdmin = async (req: any): Promise<boolean> => {
    if (!req.user?.claims?.sub) return false;
    const user = await storage.getUser(req.user.claims.sub);
    return user?.role === "superadmin";
  };

  // Get all tenants (superadmin only)
  app.get("/api/superadmin/tenants", isAuthenticated, async (req: any, res) => {
    try {
      if (!await isSuperAdmin(req)) {
        return res.status(403).json({ message: "Superadmin access required" });
      }
      
      const allTenants = await storage.getAllTenants();
      const allUsers = await storage.getAllUsers();
      
      // Enrich tenants with user counts
      const enrichedTenants = allTenants.map(tenant => {
        const tenantUsers = allUsers.filter(u => u.tenantId === tenant.id);
        return {
          ...tenant,
          userCount: tenantUsers.length,
          adminCount: tenantUsers.filter(u => u.role === "admin").length,
          managerCount: tenantUsers.filter(u => u.role === "manager").length,
          employeeCount: tenantUsers.filter(u => u.role === "employee").length,
        };
      });
      
      res.json(enrichedTenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  // Create tenant (superadmin only)
  app.post("/api/superadmin/tenants", isAuthenticated, async (req: any, res) => {
    try {
      if (!await isSuperAdmin(req)) {
        return res.status(403).json({ message: "Superadmin access required" });
      }
      
      const { name, email, phone, address, subscriptionPlan, subscriptionStatus, adminEmail, adminPassword, adminFirstName, adminLastName } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Tenant name is required" });
      }
      
      // Create the tenant
      const tenant = await storage.createTenant({
        name,
        email,
        phone,
        address,
        subscriptionPlan: subscriptionPlan || "basic",
        subscriptionStatus: subscriptionStatus || "active",
      });
      
      // If admin credentials provided, create an admin user for this tenant
      if (adminEmail && adminPassword) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await storage.createUser({
          email: adminEmail,
          password: hashedPassword,
          firstName: adminFirstName || "Admin",
          lastName: adminLastName || "",
          role: "admin",
          tenantId: tenant.id,
          isActive: true,
        });
      }
      
      res.json(tenant);
    } catch (error) {
      console.error("Error creating tenant:", error);
      res.status(500).json({ message: "Failed to create tenant" });
    }
  });

  // Update tenant (superadmin only)
  app.patch("/api/superadmin/tenants/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!await isSuperAdmin(req)) {
        return res.status(403).json({ message: "Superadmin access required" });
      }
      
      const tenant = await storage.updateTenant(req.params.id, req.body);
      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ message: "Failed to update tenant" });
    }
  });

  // Delete tenant (superadmin only)
  app.delete("/api/superadmin/tenants/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!await isSuperAdmin(req)) {
        return res.status(403).json({ message: "Superadmin access required" });
      }
      
      const { id } = req.params;
      const tenant = await storage.getTenant(id);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      // Soft delete: update subscription status to cancelled
      await storage.updateTenant(id, { subscriptionStatus: "cancelled" });
      res.json({ success: true, message: "Tenant deleted successfully" });
    } catch (error) {
      console.error("Error deleting tenant:", error);
      res.status(500).json({ message: "Failed to delete tenant" });
    }
  });

  // Get subscription details (superadmin only)
  app.get("/api/superadmin/tenants/:id/subscription", isAuthenticated, async (req: any, res) => {
    try {
      if (!await isSuperAdmin(req)) {
        return res.status(403).json({ message: "Superadmin access required" });
      }
      
      const { id } = req.params;
      const tenant = await storage.getTenant(id);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      res.json({
        tenantId: tenant.id,
        tenantName: tenant.name,
        subscriptionPlan: tenant.subscriptionPlan,
        subscriptionStatus: tenant.subscriptionStatus,
        stripeCustomerId: tenant.stripeCustomerId,
        stripeSubscriptionId: tenant.stripeSubscriptionId,
        createdAt: tenant.createdAt,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Update subscription (superadmin only)
  app.put("/api/superadmin/tenants/:id/subscription", isAuthenticated, async (req: any, res) => {
    try {
      if (!await isSuperAdmin(req)) {
        return res.status(403).json({ message: "Superadmin access required" });
      }
      
      const { id } = req.params;
      const { subscriptionPlan, subscriptionStatus } = req.body;
      
      if (!subscriptionPlan || !subscriptionStatus) {
        return res.status(400).json({ message: "subscriptionPlan and subscriptionStatus are required" });
      }
      
      const validPlans = ["basic", "professional", "enterprise"];
      const validStatuses = ["active", "trial", "suspended", "cancelled"];
      
      if (!validPlans.includes(subscriptionPlan)) {
        return res.status(400).json({ message: "Invalid subscription plan" });
      }
      
      if (!validStatuses.includes(subscriptionStatus)) {
        return res.status(400).json({ message: "Invalid subscription status" });
      }
      
      const tenant = await storage.getTenant(id);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      const updated = await storage.updateTenant(id, {
        subscriptionPlan,
        subscriptionStatus,
      });
      
      res.json({
        success: true,
        message: "Subscription updated successfully",
        subscription: {
          tenantId: updated?.id,
          subscriptionPlan: updated?.subscriptionPlan,
          subscriptionStatus: updated?.subscriptionStatus,
        },
      });
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // Create user for a tenant (superadmin only)
  app.post("/api/superadmin/users", isAuthenticated, async (req: any, res) => {
    try {
      if (!await isSuperAdmin(req)) {
        return res.status(403).json({ message: "Superadmin access required" });
      }
      
      const { email, password, firstName, lastName, role, tenantId } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      if (!tenantId && role !== "superadmin") {
        return res.status(400).json({ message: "Tenant is required for non-superadmin users" });
      }
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || "",
        lastName: lastName || "",
        role: role || "employee",
        tenantId: role === "superadmin" ? undefined : tenantId,
        isActive: true,
      });
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Get all users across all tenants (superadmin only)
  app.get("/api/superadmin/users", isAuthenticated, async (req: any, res) => {
    try {
      if (!await isSuperAdmin(req)) {
        return res.status(403).json({ message: "Superadmin access required" });
      }
      
      const allUsers = await storage.getAllUsers();
      const allTenants = await storage.getAllTenants();
      
      // Enrich users with tenant names
      const enrichedUsers = allUsers.map(user => {
        const tenant = allTenants.find(t => t.id === user.tenantId);
        return {
          ...user,
          tenantName: tenant?.name || "No Tenant",
        };
      });
      
      res.json(enrichedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Impersonate a tenant (superadmin only)
  // This allows superadmin to temporarily act as if they belong to a specific tenant
  app.post("/api/superadmin/impersonate/:tenantId", isAuthenticated, async (req: any, res) => {
    try {
      if (!await isSuperAdmin(req)) {
        return res.status(403).json({ message: "Superadmin access required" });
      }
      
      const tenantId = req.params.tenantId;
      const tenant = await storage.getTenant(tenantId);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      // Store impersonation info in session
      req.session.impersonatedTenantId = tenantId;
      req.session.impersonatedTenantName = tenant.name;
      
      res.json({ 
        success: true, 
        tenantId: tenant.id,
        tenantName: tenant.name,
        message: `Now impersonating ${tenant.name}` 
      });
    } catch (error) {
      console.error("Error starting impersonation:", error);
      res.status(500).json({ message: "Failed to start impersonation" });
    }
  });

  // Stop impersonating (superadmin only)
  app.post("/api/superadmin/stop-impersonate", isAuthenticated, async (req: any, res) => {
    try {
      if (!await isSuperAdmin(req)) {
        return res.status(403).json({ message: "Superadmin access required" });
      }
      
      // Clear impersonation info from session
      delete req.session.impersonatedTenantId;
      delete req.session.impersonatedTenantName;
      
      res.json({ success: true, message: "Stopped impersonation" });
    } catch (error) {
      console.error("Error stopping impersonation:", error);
      res.status(500).json({ message: "Failed to stop impersonation" });
    }
  });

  // Get current impersonation status
  app.get("/api/superadmin/impersonation-status", isAuthenticated, async (req: any, res) => {
    try {
      if (!await isSuperAdmin(req)) {
        return res.status(403).json({ message: "Superadmin access required" });
      }
      
      const impersonatedTenantId = req.session.impersonatedTenantId;
      const impersonatedTenantName = req.session.impersonatedTenantName;
      
      res.json({
        isImpersonating: !!impersonatedTenantId,
        tenantId: impersonatedTenantId || null,
        tenantName: impersonatedTenantName || null,
      });
    } catch (error) {
      console.error("Error fetching impersonation status:", error);
      res.status(500).json({ message: "Failed to fetch impersonation status" });
    }
  });

  // Platform-wide stats (superadmin only)
  app.get("/api/superadmin/stats", isAuthenticated, async (req: any, res) => {
    try {
      if (!await isSuperAdmin(req)) {
        return res.status(403).json({ message: "Superadmin access required" });
      }
      
      const allTenants = await storage.getAllTenants();
      const allUsers = await storage.getAllUsers();
      
      const stats = {
        totalTenants: allTenants.length,
        activeTenants: allTenants.filter(t => t.subscriptionStatus === "active").length,
        trialTenants: allTenants.filter(t => t.subscriptionStatus === "trial").length,
        suspendedTenants: allTenants.filter(t => t.subscriptionStatus === "suspended" || t.subscriptionStatus === "cancelled").length,
        totalUsers: allUsers.length,
        usersByRole: {
          superadmin: allUsers.filter(u => u.role === "superadmin").length,
          admin: allUsers.filter(u => u.role === "admin").length,
          manager: allUsers.filter(u => u.role === "manager").length,
          employee: allUsers.filter(u => u.role === "employee").length,
          client: allUsers.filter(u => u.role === "client").length,
        },
        subscriptionsByPlan: {
          basic: allTenants.filter(t => t.subscriptionPlan === "basic").length,
          professional: allTenants.filter(t => t.subscriptionPlan === "professional").length,
          enterprise: allTenants.filter(t => t.subscriptionPlan === "enterprise").length,
        },
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // ============ SERVICE ORDERS ENDPOINTS ============
  // Get all service orders for tenant
  app.get("/api/service-orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) return res.status(400).json({ message: "Tenant context required" });
      
      const orders = await storage.getServiceOrdersByTenant(effectiveTenantId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching service orders:", error);
      res.status(500).json({ message: "Failed to fetch service orders" });
    }
  });

  // Get service order by ID
  app.get("/api/service-orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getServiceOrder(id);
      if (!order) return res.status(404).json({ message: "Service order not found" });
      
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (order.tenantId !== effectiveTenantId) {
        return res.status(403).json({ message: "Cannot access service order from another tenant" });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error fetching service order:", error);
      res.status(500).json({ message: "Failed to fetch service order" });
    }
  });

  // Create service order
  app.post("/api/service-orders", isAuthenticated, async (req: any, res) => {
    try {
      const { siteId, clientId, orderNumber, description, priority, estimatedHours, hourlyRate, notes, assignedTo } = req.body;
      
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Only admins can create service orders" });
      }
      
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (!effectiveTenantId) return res.status(400).json({ message: "Tenant context required" });
      
      if (!siteId || !clientId || !orderNumber || !description) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const site = await storage.getSite(siteId);
      if (!site || site.tenantId !== effectiveTenantId) {
        return res.status(400).json({ message: "Invalid site" });
      }
      
      const client = await storage.getClient(clientId);
      if (!client || client.tenantId !== effectiveTenantId) {
        return res.status(400).json({ message: "Invalid client" });
      }
      
      const estimatedAmount = estimatedHours && hourlyRate 
        ? (parseFloat(estimatedHours) * parseFloat(hourlyRate)).toString()
        : undefined;
      
      const order = await storage.createServiceOrder({
        tenantId: effectiveTenantId,
        siteId,
        clientId,
        orderNumber,
        description,
        priority: priority || "normal",
        estimatedHours: estimatedHours ? parseFloat(estimatedHours).toString() : undefined,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate).toString() : undefined,
        estimatedAmount,
        notes,
        createdBy: userId,
        assignedTo,
        status: "pending",
      });
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating service order:", error);
      res.status(500).json({ message: "Failed to create service order" });
    }
  });

  // Update service order
  app.patch("/api/service-orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, priority, estimatedHours, hourlyRate, actualHours, actualAmount, notes, assignedTo, completedAt } = req.body;
      
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      
      if (user.role !== "admin" && user.role !== "manager") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const order = await storage.getServiceOrder(id);
      if (!order) return res.status(404).json({ message: "Service order not found" });
      
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (order.tenantId !== effectiveTenantId) {
        return res.status(403).json({ message: "Cannot access service order from another tenant" });
      }
      
      const updateData: any = {};
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;
      if (estimatedHours) updateData.estimatedHours = parseFloat(estimatedHours).toString();
      if (hourlyRate) updateData.hourlyRate = parseFloat(hourlyRate).toString();
      if (actualHours) updateData.actualHours = parseFloat(actualHours).toString();
      if (actualAmount) updateData.actualAmount = parseFloat(actualAmount).toString();
      if (notes !== undefined) updateData.notes = notes;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
      if (completedAt !== undefined) updateData.completedAt = completedAt ? new Date(completedAt) : null;
      
      const updatedOrder = await storage.updateServiceOrder(id, updateData);
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating service order:", error);
      res.status(500).json({ message: "Failed to update service order" });
    }
  });

  // Delete service order
  app.delete("/api/service-orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Only admins can delete service orders" });
      }
      
      const order = await storage.getServiceOrder(id);
      if (!order) return res.status(404).json({ message: "Service order not found" });
      
      const effectiveTenantId = getEffectiveTenantId(req, user);
      if (order.tenantId !== effectiveTenantId) {
        return res.status(403).json({ message: "Cannot delete service order from another tenant" });
      }
      
      await storage.deleteServiceOrder(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting service order:", error);
      res.status(500).json({ message: "Failed to delete service order" });
    }
  });

  // ============ WEBSOCKET SETUP ============
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/chat" });

  wss.on("connection", (ws: WebSocket) => {
    let currentUserId: string | null = null;
    let currentRoomId: string | null = null;

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "join") {
          const { roomId, odId } = message;
          currentUserId = odId;
          currentRoomId = roomId;

          // Add client to room
          if (!chatClients.has(roomId)) {
            chatClients.set(roomId, new Map());
          }
          chatClients.get(roomId)!.set(odId, ws);

          // Notify others that user joined
          const user = await storage.getUser(odId);
          broadcastToRoom(roomId, {
            type: "user_joined",
            user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName } : { id: odId },
          }, odId);
        }

        if (message.type === "typing" && currentRoomId && currentUserId) {
          broadcastToRoom(currentRoomId, {
            type: "typing",
            odId: currentUserId,
          }, currentUserId);
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      if (currentRoomId && currentUserId) {
        const roomClients = chatClients.get(currentRoomId);
        if (roomClients) {
          roomClients.delete(currentUserId);
          if (roomClients.size === 0) {
            chatClients.delete(currentRoomId);
          }
        }
        broadcastToRoom(currentRoomId, {
          type: "user_left",
          odId: currentUserId,
        });
      }
    });
  });

  return httpServer;
}

// Utility function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
