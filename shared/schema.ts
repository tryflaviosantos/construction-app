import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Tenants (Companies using the system)
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  logo: text("logo"),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  subscriptionPlan: varchar("subscription_plan", { length: 50 }).default("basic"),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default("active"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  settings: jsonb("settings").$type<{
    geofenceRadius?: number;
    requireSelfie?: boolean;
    requirePin?: boolean;
    defaultLanguage?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Users (all user types)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id), // null for superadmin
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: text("profile_image_url"),
  role: varchar("role", { length: 50 }).notNull().default("employee"), // superadmin, admin, manager, employee, client
  pin: varchar("pin", { length: 6 }),
  phone: varchar("phone", { length: 50 }),
  language: varchar("language", { length: 5 }).default("pt"),
  isActive: boolean("is_active").default(true),
  deviceId: varchar("device_id"),
  vacationDaysBalance: integer("vacation_days_balance").default(22),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients (construction clients)
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  taxId: varchar("tax_id", { length: 50 }),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  contactPerson: varchar("contact_person", { length: 255 }),
  type: varchar("type", { length: 50 }).default("company"), // residential, company
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Construction Sites (Obras)
export const sites = pgTable("sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  geofenceRadius: integer("geofence_radius").default(100), // meters
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  workStartTime: varchar("work_start_time", { length: 5 }).default("08:00"),
  workEndTime: varchar("work_end_time", { length: 5 }).default("17:00"),
  billingType: varchar("billing_type", { length: 50 }).default("hourly"), // hourly, daily, fixed
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 50 }).default("active"), // active, completed, paused
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Site Assignments (which employees work at which sites)
export const siteAssignments = pgTable("site_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").references(() => sites.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 50 }).default("worker"), // worker, supervisor
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
});

// Time Records (Ponto)
export const timeRecords = pgTable("time_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  siteId: varchar("site_id").references(() => sites.id).notNull(),
  checkInTime: timestamp("check_in_time").notNull(),
  checkOutTime: timestamp("check_out_time"),
  checkInLatitude: decimal("check_in_latitude", { precision: 10, scale: 7 }),
  checkInLongitude: decimal("check_in_longitude", { precision: 10, scale: 7 }),
  checkOutLatitude: decimal("check_out_latitude", { precision: 10, scale: 7 }),
  checkOutLongitude: decimal("check_out_longitude", { precision: 10, scale: 7 }),
  checkInPhoto: text("check_in_photo"),
  checkOutPhoto: text("check_out_photo"),
  checkInDeviceId: varchar("check_in_device_id"),
  checkOutDeviceId: varchar("check_out_device_id"),
  isOffline: boolean("is_offline").default(false),
  isWithinGeofence: boolean("is_within_geofence").default(true),
  status: varchar("status", { length: 50 }).default("pending"), // pending, approved, rejected, contested
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }),
  breakMinutes: integer("break_minutes").default(0),
  notes: text("notes"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  isSuspicious: boolean("is_suspicious").default(false),
  suspiciousReason: text("suspicious_reason"),
  clientValidated: boolean("client_validated"),
  clientValidatedAt: timestamp("client_validated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contestations (Client disputes)
export const contestations = pgTable("contestations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timeRecordId: varchar("time_record_id").references(() => timeRecords.id).notNull(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  reason: text("reason").notNull(),
  severity: varchar("severity", { length: 20 }).default("minor"), // minor, significant
  status: varchar("status", { length: 50 }).default("pending"), // pending, resolved, rejected
  resolution: text("resolution"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tools
export const tools = pgTable("tools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  serialNumber: varchar("serial_number", { length: 100 }),
  estimatedValue: decimal("estimated_value", { precision: 10, scale: 2 }),
  photo: text("photo"),
  qrCode: text("qr_code"),
  status: varchar("status", { length: 50 }).default("available"), // available, in_use, maintenance, lost, stolen
  currentUserId: varchar("current_user_id").references(() => users.id),
  currentSiteId: varchar("current_site_id").references(() => sites.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tool Transactions
export const toolTransactions = pgTable("tool_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  toolId: varchar("tool_id").references(() => tools.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  siteId: varchar("site_id").references(() => sites.id),
  type: varchar("type", { length: 50 }).notNull(), // checkout, checkin, lost, stolen, damaged
  photo: text("photo"),
  notes: text("notes"),
  condition: varchar("condition", { length: 50 }), // good, damaged
  createdAt: timestamp("created_at").defaultNow(),
});

// Leave Requests (Férias e Ausências)
export const leaveRequests = pgTable("leave_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // vacation, sick, personal, unpaid
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isPartialDay: boolean("is_partial_day").default(false),
  status: varchar("status", { length: 50 }).default("pending"), // pending, approved, rejected, cancelled
  reason: text("reason"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  isPaid: boolean("is_paid").default(true),
  daysCount: integer("days_count").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payroll Records
export const payrollRecords = pgTable("payroll_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  regularHours: decimal("regular_hours", { precision: 6, scale: 2 }).default("0"),
  overtimeHours: decimal("overtime_hours", { precision: 6, scale: 2 }).default("0"),
  nightHours: decimal("night_hours", { precision: 6, scale: 2 }).default("0"),
  vacationDays: integer("vacation_days").default(0),
  sickDays: integer("sick_days").default(0),
  unpaidAbsenceDays: integer("unpaid_absence_days").default(0),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 50 }).default("pending"), // pending, paid, processing
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Message Templates (for configurable notifications)
export const messageTemplates = pgTable("message_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // check_in_reminder, leave_approved, etc.
  targetRole: varchar("target_role", { length: 50 }).notNull(), // manager, employee, client
  language: varchar("language", { length: 5 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  body: text("body").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // late_arrival, tool_unreturned, contestation, leave_approved, etc.
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>(),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  channel: varchar("channel", { length: 50 }).default("in_app"), // in_app, push, email, sms
  createdAt: timestamp("created_at").defaultNow(),
});

// User notification preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  emailEnabled: boolean("email_enabled").default(true),
  pushEnabled: boolean("push_enabled").default(true),
  smsEnabled: boolean("sms_enabled").default(false),
  timeReminders: boolean("time_reminders").default(true),
  lateAlerts: boolean("late_alerts").default(true),
  toolAlerts: boolean("tool_alerts").default(true),
  contestationAlerts: boolean("contestation_alerts").default(true),
  leaveAlerts: boolean("leave_alerts").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Site Documents (for document portal)
export const siteDocuments = pgTable("site_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  siteId: varchar("site_id").references(() => sites.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // plans, certificates, reports, contracts, safety
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 50 }),
  fileSize: integer("file_size"),
  version: integer("version").default(1),
  parentDocumentId: varchar("parent_document_id"), // for versioning
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat Rooms (per site)
export const chatRooms = pgTable("chat_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  siteId: varchar("site_id").references(() => sites.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).default("site"), // site, direct, group
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat Room Participants
export const chatParticipants = pgTable("chat_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => chatRooms.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 50 }).default("member"), // admin, member
  joinedAt: timestamp("joined_at").defaultNow(),
  lastReadAt: timestamp("last_read_at"),
});

// Service Orders (Ordens de Serviço)
export const serviceOrders = pgTable("service_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  siteId: varchar("site_id").references(() => sites.id).notNull(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  orderNumber: varchar("order_number", { length: 50 }).unique().notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 50 }).default("pending"), // pending, in_progress, completed, cancelled
  priority: varchar("priority", { length: 50 }).default("normal"), // low, normal, high, urgent
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  estimatedHours: decimal("estimated_hours", { precision: 6, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 6, scale: 2 }),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  estimatedAmount: decimal("estimated_amount", { precision: 10, scale: 2 }),
  actualAmount: decimal("actual_amount", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  assignedTo: varchar("assigned_to").references(() => users.id),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat Messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => chatRooms.id).notNull(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 50 }).default("text"), // text, image, file, system
  attachmentUrl: text("attachment_url"),
  isEdited: boolean("is_edited").default(false),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  clients: many(clients),
  sites: many(sites),
  tools: many(tools),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  timeRecords: many(timeRecords),
  siteAssignments: many(siteAssignments),
  leaveRequests: many(leaveRequests),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [clients.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  sites: many(sites),
}));

export const sitesRelations = relations(sites, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [sites.tenantId],
    references: [tenants.id],
  }),
  client: one(clients, {
    fields: [sites.clientId],
    references: [clients.id],
  }),
  timeRecords: many(timeRecords),
  siteAssignments: many(siteAssignments),
}));

export const timeRecordsRelations = relations(timeRecords, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [timeRecords.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [timeRecords.userId],
    references: [users.id],
  }),
  site: one(sites, {
    fields: [timeRecords.siteId],
    references: [sites.id],
  }),
  contestations: many(contestations),
}));

export const toolsRelations = relations(tools, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [tools.tenantId],
    references: [tenants.id],
  }),
  currentUser: one(users, {
    fields: [tools.currentUserId],
    references: [users.id],
  }),
  currentSite: one(sites, {
    fields: [tools.currentSiteId],
    references: [sites.id],
  }),
  transactions: many(toolTransactions),
}));

// Insert Schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSiteSchema = createInsertSchema(sites).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTimeRecordSchema = createInsertSchema(timeRecords).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContestationSchema = createInsertSchema(contestations).omit({ id: true, createdAt: true });
export const insertToolSchema = createInsertSchema(tools).omit({ id: true, createdAt: true, updatedAt: true });
export const insertToolTransactionSchema = createInsertSchema(toolTransactions).omit({ id: true, createdAt: true });
export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPayrollRecordSchema = createInsertSchema(payrollRecords).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageTemplateSchema = createInsertSchema(messageTemplates).omit({ id: true, createdAt: true });
export const insertSiteAssignmentSchema = createInsertSchema(siteAssignments).omit({ id: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSiteDocumentSchema = createInsertSchema(siteDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChatRoomSchema = createInsertSchema(chatRooms).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChatParticipantSchema = createInsertSchema(chatParticipants).omit({ id: true, joinedAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceOrderSchema = createInsertSchema(serviceOrders).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Site = typeof sites.$inferSelect;
export type InsertSite = z.infer<typeof insertSiteSchema>;
export type TimeRecord = typeof timeRecords.$inferSelect;
export type InsertTimeRecord = z.infer<typeof insertTimeRecordSchema>;
export type Contestation = typeof contestations.$inferSelect;
export type InsertContestation = z.infer<typeof insertContestationSchema>;
export type Tool = typeof tools.$inferSelect;
export type InsertTool = z.infer<typeof insertToolSchema>;
export type ToolTransaction = typeof toolTransactions.$inferSelect;
export type InsertToolTransaction = z.infer<typeof insertToolTransactionSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type PayrollRecord = typeof payrollRecords.$inferSelect;
export type InsertPayrollRecord = z.infer<typeof insertPayrollRecordSchema>;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;
export type SiteAssignment = typeof siteAssignments.$inferSelect;
export type InsertSiteAssignment = z.infer<typeof insertSiteAssignmentSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type SiteDocument = typeof siteDocuments.$inferSelect;
export type InsertSiteDocument = z.infer<typeof insertSiteDocumentSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type ChatParticipant = typeof chatParticipants.$inferSelect;
export type InsertChatParticipant = z.infer<typeof insertChatParticipantSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ServiceOrder = typeof serviceOrders.$inferSelect;
export type InsertServiceOrder = z.infer<typeof insertServiceOrderSchema>;
