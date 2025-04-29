import {
  users, type User, type InsertUser,
  teams, type Team, type InsertTeam,
  meetings, type Meeting, type InsertMeeting,
  decisions, type Decision, type InsertDecision,
  actionItems, type ActionItem, type InsertActionItem,
  meetingSummaries, type MeetingSummary, type InsertMeetingSummary,
  recordings, type Recording, type InsertRecording
} from "@shared/schema";
import session from "express-session";
import { db, pool } from "./db";
import { eq } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import memorystore from 'memorystore';

// Password utilities
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Configure session stores
const PostgresSessionStore = connectPgSimple(session);
const MemoryStore = memorystore(session);

// Storage interface with CRUD methods
export interface IStorage {
  // Session management
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUsersByTeam(teamId: number): Promise<User[]>;
  getUsers(): Promise<User[]>;
  
  // Team methods
  getTeam(id: number): Promise<Team | undefined>;
  getTeams(): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, team: Partial<InsertTeam>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  
  // Recording methods
  getRecording(id: number): Promise<Recording | undefined>;
  getRecordingByMeeting(meetingId: number): Promise<Recording | undefined>;
  createRecording(recording: InsertRecording): Promise<Recording>;
  updateRecording(id: number, recording: Partial<InsertRecording>): Promise<Recording | undefined>;
  deleteRecording(id: number): Promise<boolean>;
  
  // Meeting methods
  getMeeting(id: number): Promise<Meeting | undefined>;
  getMeetings(): Promise<Meeting[]>;
  getMeetingsByUser(userId: number): Promise<Meeting[]>;
  getMeetingsByTeam(teamId: number): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: number): Promise<boolean>;
  
  // Decision methods
  getDecision(id: number): Promise<Decision | undefined>;
  getDecisionsByMeeting(meetingId: number): Promise<Decision[]>;
  createDecision(decision: InsertDecision): Promise<Decision>;
  updateDecision(id: number, decision: Partial<InsertDecision>): Promise<Decision | undefined>;
  deleteDecision(id: number): Promise<boolean>;
  
  // Action Item methods
  getActionItem(id: number): Promise<ActionItem | undefined>;
  getActionItemsByMeeting(meetingId: number): Promise<ActionItem[]>;
  getActionItemsByAssignee(assignee: string): Promise<ActionItem[]>;
  createActionItem(actionItem: InsertActionItem): Promise<ActionItem>;
  updateActionItem(id: number, actionItem: Partial<InsertActionItem>): Promise<ActionItem | undefined>;
  deleteActionItem(id: number): Promise<boolean>;
  
  // Meeting Summary methods
  getMeetingSummary(id: number): Promise<MeetingSummary | undefined>;
  getMeetingSummaryByMeeting(meetingId: number): Promise<MeetingSummary | undefined>;
  createMeetingSummary(summary: InsertMeetingSummary): Promise<MeetingSummary>;
  updateMeetingSummary(id: number, summary: Partial<InsertMeetingSummary>): Promise<MeetingSummary | undefined>;
  deleteMeetingSummary(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Hash the password before storing
    const hashedPassword = await hashPassword(user.password);
    const userData = { ...user, password: hashedPassword };
    
    const [createdUser] = await db.insert(users).values(userData).returning();
    return createdUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    // If updating password, hash it
    if (userData.password) {
      userData.password = await hashPassword(userData.password);
    }
    
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getUsersByTeam(teamId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.teamId, teamId));
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Team methods
  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams);
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [createdTeam] = await db.insert(teams).values(team).returning();
    return createdTeam;
  }

  async updateTeam(id: number, teamData: Partial<InsertTeam>): Promise<Team | undefined> {
    const [updatedTeam] = await db
      .update(teams)
      .set(teamData)
      .where(eq(teams.id, id))
      .returning();
    
    return updatedTeam;
  }

  async deleteTeam(id: number): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Recording methods
  async getRecording(id: number): Promise<Recording | undefined> {
    const [recording] = await db.select().from(recordings).where(eq(recordings.id, id));
    return recording;
  }

  async getRecordingByMeeting(meetingId: number): Promise<Recording | undefined> {
    const [recording] = await db.select().from(recordings).where(eq(recordings.meetingId, meetingId));
    return recording;
  }

  async createRecording(recording: InsertRecording): Promise<Recording> {
    const [createdRecording] = await db.insert(recordings).values(recording).returning();
    return createdRecording;
  }

  async updateRecording(id: number, recordingData: Partial<InsertRecording>): Promise<Recording | undefined> {
    const [updatedRecording] = await db
      .update(recordings)
      .set(recordingData)
      .where(eq(recordings.id, id))
      .returning();
    
    return updatedRecording;
  }

  async deleteRecording(id: number): Promise<boolean> {
    const result = await db.delete(recordings).where(eq(recordings.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Meeting methods
  async getMeeting(id: number): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting;
  }

  async getMeetings(): Promise<Meeting[]> {
    return await db.select().from(meetings);
  }

  async getMeetingsByUser(userId: number): Promise<Meeting[]> {
    return await db.select().from(meetings).where(eq(meetings.createdBy, userId));
  }

  async getMeetingsByTeam(teamId: number): Promise<Meeting[]> {
    return await db.select().from(meetings).where(eq(meetings.teamId, teamId));
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const [createdMeeting] = await db.insert(meetings).values(meeting).returning();
    return createdMeeting;
  }

  async updateMeeting(id: number, meetingData: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const [updatedMeeting] = await db
      .update(meetings)
      .set(meetingData)
      .where(eq(meetings.id, id))
      .returning();
    
    return updatedMeeting;
  }

  async deleteMeeting(id: number): Promise<boolean> {
    const result = await db.delete(meetings).where(eq(meetings.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Decision methods
  async getDecision(id: number): Promise<Decision | undefined> {
    const [decision] = await db.select().from(decisions).where(eq(decisions.id, id));
    return decision;
  }

  async getDecisionsByMeeting(meetingId: number): Promise<Decision[]> {
    return await db.select().from(decisions).where(eq(decisions.meetingId, meetingId));
  }

  async createDecision(decision: InsertDecision): Promise<Decision> {
    const [createdDecision] = await db.insert(decisions).values(decision).returning();
    return createdDecision;
  }

  async updateDecision(id: number, decisionData: Partial<InsertDecision>): Promise<Decision | undefined> {
    const [updatedDecision] = await db
      .update(decisions)
      .set(decisionData)
      .where(eq(decisions.id, id))
      .returning();
    
    return updatedDecision;
  }

  async deleteDecision(id: number): Promise<boolean> {
    const result = await db.delete(decisions).where(eq(decisions.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Action Item methods
  async getActionItem(id: number): Promise<ActionItem | undefined> {
    const [actionItem] = await db.select().from(actionItems).where(eq(actionItems.id, id));
    return actionItem;
  }

  async getActionItemsByMeeting(meetingId: number): Promise<ActionItem[]> {
    return await db.select().from(actionItems).where(eq(actionItems.meetingId, meetingId));
  }

  async getActionItemsByAssignee(assignee: string): Promise<ActionItem[]> {
    return await db.select().from(actionItems).where(eq(actionItems.assignee, assignee));
  }

  async createActionItem(actionItem: InsertActionItem): Promise<ActionItem> {
    const [createdActionItem] = await db.insert(actionItems).values(actionItem).returning();
    return createdActionItem;
  }

  async updateActionItem(id: number, actionItemData: Partial<InsertActionItem>): Promise<ActionItem | undefined> {
    const [updatedActionItem] = await db
      .update(actionItems)
      .set(actionItemData)
      .where(eq(actionItems.id, id))
      .returning();
    
    return updatedActionItem;
  }

  async deleteActionItem(id: number): Promise<boolean> {
    const result = await db.delete(actionItems).where(eq(actionItems.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Meeting Summary methods
  async getMeetingSummary(id: number): Promise<MeetingSummary | undefined> {
    const [summary] = await db.select().from(meetingSummaries).where(eq(meetingSummaries.id, id));
    return summary;
  }

  async getMeetingSummaryByMeeting(meetingId: number): Promise<MeetingSummary | undefined> {
    const [summary] = await db.select().from(meetingSummaries).where(eq(meetingSummaries.meetingId, meetingId));
    return summary;
  }

  async createMeetingSummary(summary: InsertMeetingSummary): Promise<MeetingSummary> {
    const [createdSummary] = await db.insert(meetingSummaries).values(summary).returning();
    return createdSummary;
  }

  async updateMeetingSummary(id: number, summaryData: Partial<InsertMeetingSummary>): Promise<MeetingSummary | undefined> {
    const [updatedSummary] = await db
      .update(meetingSummaries)
      .set(summaryData)
      .where(eq(meetingSummaries.id, id))
      .returning();
    
    return updatedSummary;
  }

  async deleteMeetingSummary(id: number): Promise<boolean> {
    const result = await db.delete(meetingSummaries).where(eq(meetingSummaries.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

// Use the database storage implementation
export const storage = new DatabaseStorage();