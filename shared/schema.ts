import { pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define user roles enum
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'member']);

// Define team table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  role: userRoleEnum("role").notNull().default('member'),
  teamId: integer("team_id").references(() => teams.id),
  designation: text("designation"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: text("date").notNull(), // ISO string format for date
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  duration: text("duration").notNull(),
  participants: text("participants").array().notNull(),
  location: text("location").notNull(),
  transcriptUrl: text("transcript_url"),
  transcriptText: text("transcript_text"),
  createdBy: integer("created_by").notNull(),
  teamId: integer("team_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isPublic: boolean("is_public").default(false),
});

export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  filePath: text("file_path").notNull(),
  uploadedBy: integer("uploaded_by").notNull(),
  meetingId: integer("meeting_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const decisions = pgTable("decisions", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  description: text("description").notNull(),
  owner: text("owner").notNull(),
  timestamp: text("timestamp").notNull(),
  context: text("context").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const actionItems = pgTable("action_items", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  task: text("task").notNull(),
  assignee: text("assignee").notNull(),
  deadline: text("deadline").notNull(),
  priority: text("priority").notNull(), // "High", "Medium", "Low"
  status: text("status").notNull(), // "Not Started", "In Progress", "Completed"
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const meetingSummaries = pgTable("meeting_summaries", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().unique(),
  executiveSummary: text("executive_summary").notNull(),
  attendees: jsonb("attendees"),
  keyDiscussionPoints: jsonb("key_discussion_points").notNull(),
  followUpRequirements: jsonb("follow_up_requirements").notNull(),
  sentimentAnalysis: jsonb("sentiment_analysis").notNull(),
  transcriptHighlights: jsonb("transcript_highlights").notNull(),
  decisionMakers: text("decision_makers"),
  attachments: text("attachments").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert Schemas
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertRecordingSchema = createInsertSchema(recordings).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
});

export const insertDecisionSchema = createInsertSchema(decisions).omit({
  id: true,
  createdAt: true,
});

export const insertActionItemSchema = createInsertSchema(actionItems).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingSummarySchema = createInsertSchema(meetingSummaries).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type Recording = typeof recordings.$inferSelect;

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

export type InsertDecision = z.infer<typeof insertDecisionSchema>;
export type Decision = typeof decisions.$inferSelect;

export type InsertActionItem = z.infer<typeof insertActionItemSchema>;
export type ActionItem = typeof actionItems.$inferSelect;

export type InsertMeetingSummary = z.infer<typeof insertMeetingSummarySchema>;
export type MeetingSummary = typeof meetingSummaries.$inferSelect;

// Extended schema for frontend use
export const attendeeSchema = z.object({
  name: z.string(),
  role: z.string(),
  contributions: z.string(),
  responsibleFor: z.array(z.string()),
});

export const decisionSchema = z.object({
  decision: z.string(),
  owner: z.string(),
});

export const taskAssignmentSchema = z.object({
  task: z.string(),
  assignee: z.string(),
});

// Schemas for structured speaker attribution
export const insightAttributionSchema = z.object({
  insight: z.string(),
  speaker: z.string(),
  text: z.string().optional(),
});

export const questionAttributionSchema = z.object({
  question: z.string(),
  speaker: z.string(),
  text: z.string().optional(),
});

export const concernAttributionSchema = z.object({
  concern: z.string(),
  speaker: z.string(),
  text: z.string().optional(),
});

export const discussionPointSchema = z.object({
  topic: z.string(),
  summary: z.string(),
  contributors: z.array(z.string()).optional(),
  insights: z.array(
    z.union([
      z.string(),
      insightAttributionSchema
    ])
  ),
  questions: z.array(
    z.union([
      z.string(),
      questionAttributionSchema
    ])
  ),
  decisions: z.array(decisionSchema).optional(),
});

export const followUpSchema = z.object({
  nextMeeting: z.string().optional(),
  deferredTopics: z.array(z.string()).optional(),
  resources: z.array(z.string()).optional(),
  taskAssignments: z.array(taskAssignmentSchema).optional(),
});

export const sentimentSchema = z.object({
  tone: z.string(),
  engagement: z.string(),
  concerns: z.union([
    z.string().optional(),
    z.array(
      z.union([
        z.string(),
        concernAttributionSchema
      ])
    ).optional(),
  ]),
});

export const transcriptHighlightSchema = z.object({
  quote: z.string(),
  speaker: z.string(),
  timestamp: z.string(),
  significance: z.string().optional(),
});

export type Attendee = z.infer<typeof attendeeSchema>;
export type DecisionDetail = z.infer<typeof decisionSchema>;
export type TaskAssignment = z.infer<typeof taskAssignmentSchema>;
export type InsightAttribution = z.infer<typeof insightAttributionSchema>;
export type QuestionAttribution = z.infer<typeof questionAttributionSchema>;
export type ConcernAttribution = z.infer<typeof concernAttributionSchema>;
export type DiscussionPoint = z.infer<typeof discussionPointSchema>;
export type FollowUp = z.infer<typeof followUpSchema>;
export type Sentiment = z.infer<typeof sentimentSchema>;
export type TranscriptHighlight = z.infer<typeof transcriptHighlightSchema>;
