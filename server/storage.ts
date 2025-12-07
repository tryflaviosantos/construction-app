// Database Storage - javascript_database blueprint
import {
  users,
  tenants,
  clients,
  sites,
  siteAssignments,
  timeRecords,
  contestations,
  tools,
  toolTransactions,
  leaveRequests,
  payrollRecords,
  notifications,
  notificationPreferences,
  siteDocuments,
  chatRooms,
  chatParticipants,
  chatMessages,
  serviceOrders,
  type User,
  type UpsertUser,
  type Tenant,
  type InsertTenant,
  type Client,
  type InsertClient,
  type Site,
  type InsertSite,
  type SiteAssignment,
  type InsertSiteAssignment,
  type TimeRecord,
  type InsertTimeRecord,
  type Contestation,
  type InsertContestation,
  type Tool,
  type InsertTool,
  type ToolTransaction,
  type InsertToolTransaction,
  type LeaveRequest,
  type InsertLeaveRequest,
  type PayrollRecord,
  type InsertPayrollRecord,
  type Notification,
  type InsertNotification,
  type NotificationPreferences,
  type InsertNotificationPreferences,
  type SiteDocument,
  type InsertSiteDocument,
  type ChatRoom,
  type InsertChatRoom,
  type ChatParticipant,
  type InsertChatParticipant,
  type ChatMessage,
  type InsertChatMessage,
  type ServiceOrder,
  type InsertServiceOrder,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, or, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: UpsertUser): Promise<User>;
  getUsersByTenant(tenantId: string): Promise<User[]>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Tenant operations
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantByName(name: string): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  createTenant(data: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined>;

  // Superadmin operations
  getAllUsers(): Promise<User[]>;

  // Client operations
  getClient(id: string): Promise<Client | undefined>;
  getClientsByTenant(tenantId: string): Promise<Client[]>;
  getClientByUserId(userId: string): Promise<Client | undefined>;
  createClient(data: InsertClient): Promise<Client>;
  updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  // Site operations
  getSite(id: string): Promise<Site | undefined>;
  getSitesByTenant(tenantId: string): Promise<Site[]>;
  getSitesByClient(clientId: string): Promise<Site[]>;
  createSite(data: InsertSite): Promise<Site>;
  updateSite(id: string, data: Partial<InsertSite>): Promise<Site | undefined>;
  deleteSite(id: string): Promise<boolean>;

  // Site Assignment operations
  getSiteAssignment(id: string): Promise<SiteAssignment | undefined>;
  getSiteAssignmentsByUser(userId: string): Promise<SiteAssignment[]>;
  getSiteAssignmentsBySite(siteId: string): Promise<SiteAssignment[]>;
  createSiteAssignment(data: InsertSiteAssignment): Promise<SiteAssignment>;
  updateSiteAssignment(id: string, data: Partial<InsertSiteAssignment>): Promise<SiteAssignment | undefined>;

  // Time Record operations
  getTimeRecord(id: string): Promise<TimeRecord | undefined>;
  getTimeRecordsByUser(userId: string): Promise<TimeRecord[]>;
  getTimeRecordsBySite(siteId: string): Promise<TimeRecord[]>;
  getTimeRecordsByTenant(tenantId: string): Promise<TimeRecord[]>;
  getActiveTimeRecord(userId: string): Promise<TimeRecord | undefined>;
  createTimeRecord(data: InsertTimeRecord): Promise<TimeRecord>;
  updateTimeRecord(id: string, data: Partial<InsertTimeRecord>): Promise<TimeRecord | undefined>;

  // Contestation operations
  getContestation(id: string): Promise<Contestation | undefined>;
  getContestationsByTimeRecord(timeRecordId: string): Promise<Contestation[]>;
  createContestation(data: InsertContestation): Promise<Contestation>;
  updateContestation(id: string, data: Partial<InsertContestation>): Promise<Contestation | undefined>;

  // Tool operations
  getTool(id: string): Promise<Tool | undefined>;
  getToolsByTenant(tenantId: string): Promise<Tool[]>;
  getToolByQrCode(qrCode: string): Promise<Tool | undefined>;
  createTool(data: InsertTool): Promise<Tool>;
  updateTool(id: string, data: Partial<InsertTool>): Promise<Tool | undefined>;
  deleteTool(id: string): Promise<boolean>;

  // Tool Transaction operations
  getToolTransactionsByTool(toolId: string): Promise<ToolTransaction[]>;
  createToolTransaction(data: InsertToolTransaction): Promise<ToolTransaction>;

  // Leave Request operations
  getLeaveRequest(id: string): Promise<LeaveRequest | undefined>;
  getLeaveRequestsByUser(userId: string): Promise<LeaveRequest[]>;
  getLeaveRequestsByTenant(tenantId: string): Promise<LeaveRequest[]>;
  createLeaveRequest(data: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: string, data: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined>;

  // Payroll operations
  getPayrollRecord(id: string): Promise<PayrollRecord | undefined>;
  getPayrollRecordsByUser(userId: string): Promise<PayrollRecord[]>;
  getPayrollRecordsByTenant(tenantId: string): Promise<PayrollRecord[]>;
  createPayrollRecord(data: InsertPayrollRecord): Promise<PayrollRecord>;
  updatePayrollRecord(id: string, data: Partial<InsertPayrollRecord>): Promise<PayrollRecord | undefined>;

  // Notification operations
  getNotification(id: string): Promise<Notification | undefined>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationsByUser(userId: string): Promise<Notification[]>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // Notification Preferences operations
  getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined>;
  upsertNotificationPreferences(data: InsertNotificationPreferences & { userId: string }): Promise<NotificationPreferences>;

  // Site Document operations
  getSiteDocument(id: string): Promise<SiteDocument | undefined>;
  getSiteDocumentsBySite(siteId: string): Promise<SiteDocument[]>;
  getSiteDocumentVersions(parentId: string): Promise<SiteDocument[]>;
  createSiteDocument(data: InsertSiteDocument): Promise<SiteDocument>;
  updateSiteDocument(id: string, data: Partial<InsertSiteDocument>): Promise<SiteDocument | undefined>;

  // Chat Room operations
  getChatRoom(id: string): Promise<ChatRoom | undefined>;
  getChatRoomsBySite(siteId: string): Promise<ChatRoom[]>;
  getChatRoomsByUser(userId: string): Promise<ChatRoom[]>;
  createChatRoom(data: InsertChatRoom): Promise<ChatRoom>;

  // Chat Participant operations
  getChatParticipants(roomId: string): Promise<ChatParticipant[]>;
  addChatParticipant(data: InsertChatParticipant): Promise<ChatParticipant>;
  updateChatParticipantLastRead(roomId: string, userId: string): Promise<void>;

  // Chat Message operations
  getChatMessages(roomId: string, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(data: InsertChatMessage): Promise<ChatMessage>;

  // Service Order operations
  getServiceOrder(id: string): Promise<ServiceOrder | undefined>;
  getServiceOrdersByTenant(tenantId: string): Promise<ServiceOrder[]>;
  getServiceOrdersBySite(siteId: string): Promise<ServiceOrder[]>;
  getServiceOrdersByClient(clientId: string): Promise<ServiceOrder[]>;
  createServiceOrder(data: InsertServiceOrder): Promise<ServiceOrder>;
  updateServiceOrder(id: string, data: Partial<InsertServiceOrder>): Promise<ServiceOrder | undefined>;
  deleteServiceOrder(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  async updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  // Tenant operations
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantByName(name: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.name, name));
    return tenant;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createTenant(data: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(data).returning();
    return tenant;
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [tenant] = await db
      .update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  }

  // Client operations
  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientsByTenant(tenantId: string): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.tenantId, tenantId));
  }

  async getClientByUserId(userId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.userId, userId));
    return client;
  }

  async createClient(data: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(data).returning();
    return client;
  }

  async updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: string): Promise<boolean> {
    await db.delete(clients).where(eq(clients.id, id));
    return true;
  }

  // Site operations
  async getSite(id: string): Promise<Site | undefined> {
    const [site] = await db.select().from(sites).where(eq(sites.id, id));
    return site;
  }

  async getSitesByTenant(tenantId: string): Promise<Site[]> {
    return db.select().from(sites).where(eq(sites.tenantId, tenantId));
  }

  async getSitesByClient(clientId: string): Promise<Site[]> {
    return db.select().from(sites).where(eq(sites.clientId, clientId));
  }

  async createSite(data: InsertSite): Promise<Site> {
    const [site] = await db.insert(sites).values(data).returning();
    return site;
  }

  async updateSite(id: string, data: Partial<InsertSite>): Promise<Site | undefined> {
    const [site] = await db
      .update(sites)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sites.id, id))
      .returning();
    return site;
  }

  async deleteSite(id: string): Promise<boolean> {
    const result = await db.delete(sites).where(eq(sites.id, id));
    return true;
  }

  // Site Assignment operations
  async getSiteAssignment(id: string): Promise<SiteAssignment | undefined> {
    const [assignment] = await db.select().from(siteAssignments).where(eq(siteAssignments.id, id));
    return assignment;
  }

  async getSiteAssignmentsByUser(userId: string): Promise<SiteAssignment[]> {
    return db.select().from(siteAssignments).where(eq(siteAssignments.userId, userId));
  }

  async getSiteAssignmentsBySite(siteId: string): Promise<SiteAssignment[]> {
    return db.select().from(siteAssignments).where(eq(siteAssignments.siteId, siteId));
  }

  async createSiteAssignment(data: InsertSiteAssignment): Promise<SiteAssignment> {
    const [assignment] = await db.insert(siteAssignments).values(data).returning();
    return assignment;
  }

  async updateSiteAssignment(id: string, data: Partial<InsertSiteAssignment>): Promise<SiteAssignment | undefined> {
    const [assignment] = await db
      .update(siteAssignments)
      .set(data)
      .where(eq(siteAssignments.id, id))
      .returning();
    return assignment;
  }

  // Time Record operations
  async getTimeRecord(id: string): Promise<TimeRecord | undefined> {
    const [record] = await db.select().from(timeRecords).where(eq(timeRecords.id, id));
    return record;
  }

  async getTimeRecordsByUser(userId: string): Promise<TimeRecord[]> {
    return db
      .select()
      .from(timeRecords)
      .where(eq(timeRecords.userId, userId))
      .orderBy(desc(timeRecords.checkInTime));
  }

  async getTimeRecordsBySite(siteId: string): Promise<TimeRecord[]> {
    return db
      .select()
      .from(timeRecords)
      .where(eq(timeRecords.siteId, siteId))
      .orderBy(desc(timeRecords.checkInTime));
  }

  async getTimeRecordsByTenant(tenantId: string): Promise<TimeRecord[]> {
    return db
      .select()
      .from(timeRecords)
      .where(eq(timeRecords.tenantId, tenantId))
      .orderBy(desc(timeRecords.checkInTime));
  }

  async getActiveTimeRecord(userId: string): Promise<TimeRecord | undefined> {
    const [record] = await db
      .select()
      .from(timeRecords)
      .where(and(eq(timeRecords.userId, userId), eq(timeRecords.checkOutTime, null as any)));
    return record;
  }

  async createTimeRecord(data: InsertTimeRecord): Promise<TimeRecord> {
    const [record] = await db.insert(timeRecords).values(data).returning();
    return record;
  }

  async updateTimeRecord(id: string, data: Partial<InsertTimeRecord>): Promise<TimeRecord | undefined> {
    const [record] = await db
      .update(timeRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(timeRecords.id, id))
      .returning();
    return record;
  }

  // Contestation operations
  async getContestation(id: string): Promise<Contestation | undefined> {
    const [contestation] = await db.select().from(contestations).where(eq(contestations.id, id));
    return contestation;
  }

  async getContestationsByTimeRecord(timeRecordId: string): Promise<Contestation[]> {
    return db.select().from(contestations).where(eq(contestations.timeRecordId, timeRecordId));
  }

  async createContestation(data: InsertContestation): Promise<Contestation> {
    const [contestation] = await db.insert(contestations).values(data).returning();
    return contestation;
  }

  async updateContestation(id: string, data: Partial<InsertContestation>): Promise<Contestation | undefined> {
    const [contestation] = await db
      .update(contestations)
      .set(data)
      .where(eq(contestations.id, id))
      .returning();
    return contestation;
  }

  // Tool operations
  async getTool(id: string): Promise<Tool | undefined> {
    const [tool] = await db.select().from(tools).where(eq(tools.id, id));
    return tool;
  }

  async getToolsByTenant(tenantId: string): Promise<Tool[]> {
    return db.select().from(tools).where(eq(tools.tenantId, tenantId));
  }

  async getToolByQrCode(qrCode: string): Promise<Tool | undefined> {
    const [tool] = await db.select().from(tools).where(eq(tools.qrCode, qrCode));
    return tool;
  }

  async createTool(data: InsertTool): Promise<Tool> {
    const [tool] = await db.insert(tools).values(data).returning();
    return tool;
  }

  async updateTool(id: string, data: Partial<InsertTool>): Promise<Tool | undefined> {
    const [tool] = await db
      .update(tools)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tools.id, id))
      .returning();
    return tool;
  }

  async deleteTool(id: string): Promise<boolean> {
    const result = await db.delete(tools).where(eq(tools.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Tool Transaction operations
  async getToolTransactionsByTool(toolId: string): Promise<ToolTransaction[]> {
    return db
      .select()
      .from(toolTransactions)
      .where(eq(toolTransactions.toolId, toolId))
      .orderBy(desc(toolTransactions.createdAt));
  }

  async createToolTransaction(data: InsertToolTransaction): Promise<ToolTransaction> {
    const [transaction] = await db.insert(toolTransactions).values(data).returning();
    return transaction;
  }

  // Leave Request operations
  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    return request;
  }

  async getLeaveRequestsByUser(userId: string): Promise<LeaveRequest[]> {
    return db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.userId, userId))
      .orderBy(desc(leaveRequests.startDate));
  }

  async getLeaveRequestsByTenant(tenantId: string): Promise<LeaveRequest[]> {
    return db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.tenantId, tenantId))
      .orderBy(desc(leaveRequests.startDate));
  }

  async createLeaveRequest(data: InsertLeaveRequest): Promise<LeaveRequest> {
    const [request] = await db.insert(leaveRequests).values(data).returning();
    return request;
  }

  async updateLeaveRequest(id: string, data: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined> {
    const [request] = await db
      .update(leaveRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();
    return request;
  }

  // Payroll operations
  async getPayrollRecord(id: string): Promise<PayrollRecord | undefined> {
    const [record] = await db.select().from(payrollRecords).where(eq(payrollRecords.id, id));
    return record;
  }

  async getPayrollRecordsByUser(userId: string): Promise<PayrollRecord[]> {
    return db
      .select()
      .from(payrollRecords)
      .where(eq(payrollRecords.userId, userId))
      .orderBy(desc(payrollRecords.periodStart));
  }

  async getPayrollRecordsByTenant(tenantId: string): Promise<PayrollRecord[]> {
    return db
      .select()
      .from(payrollRecords)
      .where(eq(payrollRecords.tenantId, tenantId))
      .orderBy(desc(payrollRecords.periodStart));
  }

  async createPayrollRecord(data: InsertPayrollRecord): Promise<PayrollRecord> {
    const [record] = await db.insert(payrollRecords).values(data).returning();
    return record;
  }

  async updatePayrollRecord(id: string, data: Partial<InsertPayrollRecord>): Promise<PayrollRecord | undefined> {
    const [record] = await db
      .update(payrollRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(payrollRecords.id, id))
      .returning();
    return record;
  }

  // Notification operations
  async getNotification(id: string): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))).orderBy(desc(notifications.createdAt));
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [notification] = await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(eq(notifications.id, id)).returning();
    return notification;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(eq(notifications.userId, userId));
  }

  // Notification Preferences operations
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    const [prefs] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
    return prefs;
  }

  async upsertNotificationPreferences(data: InsertNotificationPreferences & { userId: string }): Promise<NotificationPreferences> {
    const [prefs] = await db.insert(notificationPreferences).values(data).onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: { ...data, updatedAt: new Date() },
    }).returning();
    return prefs;
  }

  // Site Document operations
  async getSiteDocument(id: string): Promise<SiteDocument | undefined> {
    const [doc] = await db.select().from(siteDocuments).where(eq(siteDocuments.id, id));
    return doc;
  }

  async getSiteDocumentsBySite(siteId: string): Promise<SiteDocument[]> {
    return db.select().from(siteDocuments).where(and(eq(siteDocuments.siteId, siteId), eq(siteDocuments.isActive, true))).orderBy(desc(siteDocuments.createdAt));
  }

  async getSiteDocumentVersions(parentId: string): Promise<SiteDocument[]> {
    return db.select().from(siteDocuments).where(eq(siteDocuments.parentDocumentId, parentId)).orderBy(desc(siteDocuments.version));
  }

  async createSiteDocument(data: InsertSiteDocument): Promise<SiteDocument> {
    const [doc] = await db.insert(siteDocuments).values(data).returning();
    return doc;
  }

  async updateSiteDocument(id: string, data: Partial<InsertSiteDocument>): Promise<SiteDocument | undefined> {
    const [doc] = await db.update(siteDocuments).set({ ...data, updatedAt: new Date() }).where(eq(siteDocuments.id, id)).returning();
    return doc;
  }

  // Chat Room operations
  async getChatRoom(id: string): Promise<ChatRoom | undefined> {
    const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, id));
    return room;
  }

  async getChatRoomsBySite(siteId: string): Promise<ChatRoom[]> {
    return db.select().from(chatRooms).where(eq(chatRooms.siteId, siteId));
  }

  async getChatRoomsByUser(userId: string): Promise<ChatRoom[]> {
    const participantRooms = await db.select().from(chatParticipants).where(eq(chatParticipants.userId, userId));
    if (participantRooms.length === 0) return [];
    const roomIds = participantRooms.map(p => p.roomId);
    return db.select().from(chatRooms).where(or(...roomIds.map(id => eq(chatRooms.id, id))));
  }

  async createChatRoom(data: InsertChatRoom): Promise<ChatRoom> {
    const [room] = await db.insert(chatRooms).values(data).returning();
    return room;
  }

  // Chat Participant operations
  async getChatParticipants(roomId: string): Promise<ChatParticipant[]> {
    return db.select().from(chatParticipants).where(eq(chatParticipants.roomId, roomId));
  }

  async addChatParticipant(data: InsertChatParticipant): Promise<ChatParticipant> {
    const [participant] = await db.insert(chatParticipants).values(data).returning();
    return participant;
  }

  async updateChatParticipantLastRead(roomId: string, userId: string): Promise<void> {
    await db.update(chatParticipants).set({ lastReadAt: new Date() }).where(and(eq(chatParticipants.roomId, roomId), eq(chatParticipants.userId, userId)));
  }

  // Chat Message operations
  async getChatMessages(roomId: string, limit: number = 50): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).where(and(eq(chatMessages.roomId, roomId), eq(chatMessages.isDeleted, false))).orderBy(desc(chatMessages.createdAt)).limit(limit);
  }

  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db.insert(chatMessages).values(data).returning();
    return message;
  }

  // Service Order operations
  async getServiceOrder(id: string): Promise<ServiceOrder | undefined> {
    const [order] = await db.select().from(serviceOrders).where(eq(serviceOrders.id, id));
    return order;
  }

  async getServiceOrdersByTenant(tenantId: string): Promise<ServiceOrder[]> {
    return db.select().from(serviceOrders).where(eq(serviceOrders.tenantId, tenantId)).orderBy(desc(serviceOrders.createdAt));
  }

  async getServiceOrdersBySite(siteId: string): Promise<ServiceOrder[]> {
    return db.select().from(serviceOrders).where(eq(serviceOrders.siteId, siteId)).orderBy(desc(serviceOrders.createdAt));
  }

  async getServiceOrdersByClient(clientId: string): Promise<ServiceOrder[]> {
    return db.select().from(serviceOrders).where(eq(serviceOrders.clientId, clientId)).orderBy(desc(serviceOrders.createdAt));
  }

  async createServiceOrder(data: InsertServiceOrder): Promise<ServiceOrder> {
    const [order] = await db.insert(serviceOrders).values(data).returning();
    return order;
  }

  async updateServiceOrder(id: string, data: Partial<InsertServiceOrder>): Promise<ServiceOrder | undefined> {
    const [order] = await db.update(serviceOrders).set({ ...data, updatedAt: new Date() }).where(eq(serviceOrders.id, id)).returning();
    return order;
  }

  async deleteServiceOrder(id: string): Promise<boolean> {
    await db.delete(serviceOrders).where(eq(serviceOrders.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
