import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { generateDocx } from "./lib/docx-generator";
import {
  insertMeetingSchema,
  insertDecisionSchema,
  insertActionItemSchema,
  insertMeetingSummarySchema
} from "@shared/schema";
import { analyzeTranscript } from "./lib/openai";
import { sendSlackMessage } from "./lib/slack";
import { uploadRecording, saveRecordingToDatabase } from "./lib/upload-handler";
import { uploadTranscript, saveTranscriptToDatabase } from "./lib/transcript-handler";
import fs from "fs";
import path from "path";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes - prefix with /api
  
  // Meetings - force refreshing data each time
  app.get("/api/meetings", async (req: Request, res: Response) => {
    try {
      console.log("Fetching all meetings from database...");
      
      // Get all meetings with a direct query
      const result = await db.execute(`
        SELECT 
          id,
          title,
          date,
          start_time as "startTime",
          end_time as "endTime",
          duration,
          participants,
          location,
          transcript_url as "transcriptUrl",
          transcript_text as "transcriptText",
          created_by as "createdBy",
          team_id as "teamId",
          created_at as "createdAt",
          is_public as "isPublic"
        FROM 
          meetings
        ORDER BY 
          id DESC
      `);
      
      // Extract the rows from the result
      const meetings = result.rows || [];
      console.log("Found meetings:", meetings.length);
      
      // Set headers to prevent caching
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Content-Type', 'application/json');
      
      res.json(meetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      res.status(500).json({ message: "Failed to fetch meetings" });
    }
  });
  
  // Emergency endpoint to create a meeting directly with SQL
  app.get("/api/create-test-meeting", async (req: Request, res: Response) => {
    try {
      // Use direct SQL to create a meeting - using EXACTLY the same format as our successful insertion
      console.log("Emergency meeting creation triggered");
      const result = await db.execute(`
        INSERT INTO meetings (
          title, 
          date, 
          start_time, 
          end_time, 
          duration, 
          participants, 
          location, 
          created_by, 
          is_public
        )
        VALUES (
          'Emergency Meeting via API', 
          '2025-04-29', 
          '10:00 AM', 
          '11:00 AM', 
          '1 hour', 
          ARRAY['Aaqil Ahmed', 'Emergency Team', 'SQL Troubleshooter'],
          'Emergency Meeting Room',
          1,  
          TRUE
        )
        RETURNING *
      `);
      
      console.log("EMERGENCY MEETING CREATED VIA DIRECT SQL:", result);
      
      // Send plain success response
      res.status(200).send("OK");
    } catch (error) {
      console.error("Failed to create emergency meeting:", error);
      res.status(500).json({ message: "Failed to create emergency meeting" });
    }
  });
  
  app.get("/api/meetings/:id", async (req: Request, res: Response) => {
    try {
      const meetingId = parseInt(req.params.id);
      const meeting = await storage.getMeeting(meetingId);
      
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      res.json(meeting);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meeting" });
    }
  });
  
  app.post("/api/meetings", async (req: Request, res: Response) => {
    try {
      console.log("POST /api/meetings received with body:", JSON.stringify(req.body, null, 2));
      
      // First check if we received the participants array properly
      if (!req.body.participants || !Array.isArray(req.body.participants)) {
        console.error("Participants missing or not an array:", req.body.participants);
        return res.status(400).json({ 
          message: "Invalid meeting data", 
          error: "Participants must be an array" 
        });
      }
      
      const result = insertMeetingSchema.safeParse(req.body);
      
      if (!result.success) {
        console.error("Meeting validation failed:", result.error.errors);
        return res.status(400).json({ 
          message: "Invalid meeting data", 
          errors: result.error.errors 
        });
      }
      
      console.log("Meeting data valid, creating meeting:", result.data);
      const meeting = await storage.createMeeting(result.data);
      console.log("Meeting created successfully:", meeting);
      res.status(201).json(meeting);
    } catch (error) {
      console.error("Error creating meeting:", error);
      res.status(500).json({ 
        message: "Failed to create meeting", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  app.put("/api/meetings/:id", async (req: Request, res: Response) => {
    try {
      console.log(`PUT /api/meetings/${req.params.id} received with body:`, JSON.stringify(req.body, null, 2));
      
      const meetingId = parseInt(req.params.id);
      
      // First check if we received the participants array properly
      if (req.body.participants && !Array.isArray(req.body.participants)) {
        console.error("Participants not an array:", req.body.participants);
        return res.status(400).json({ 
          message: "Invalid meeting data", 
          error: "Participants must be an array" 
        });
      }
      
      const result = insertMeetingSchema.partial().safeParse(req.body);
      
      if (!result.success) {
        console.error("Meeting update validation failed:", result.error.errors);
        return res.status(400).json({ 
          message: "Invalid meeting data", 
          errors: result.error.errors 
        });
      }
      
      console.log("Meeting update data valid, updating meeting:", result.data);
      const updatedMeeting = await storage.updateMeeting(meetingId, result.data);
      
      if (!updatedMeeting) {
        console.error(`Meeting not found with ID: ${meetingId}`);
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      console.log("Meeting updated successfully:", updatedMeeting);
      res.json(updatedMeeting);
    } catch (error) {
      console.error("Error updating meeting:", error);
      res.status(500).json({ 
        message: "Failed to update meeting",
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  app.delete("/api/meetings/:id", async (req: Request, res: Response) => {
    try {
      const meetingId = parseInt(req.params.id);
      const deleted = await storage.deleteMeeting(meetingId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete meeting" });
    }
  });
  
  // Decisions
  app.get("/api/decisions", async (req: Request, res: Response) => {
    try {
      const meetingId = req.query.meetingId ? parseInt(req.query.meetingId as string) : undefined;
      
      let decisions;
      if (meetingId) {
        decisions = await storage.getDecisionsByMeeting(meetingId);
      } else {
        // Get all decisions from all meetings
        const meetings = await storage.getMeetings();
        decisions = await Promise.all(
          meetings.map(meeting => storage.getDecisionsByMeeting(meeting.id))
        );
        decisions = decisions.flat();
      }
      
      res.json(decisions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch decisions" });
    }
  });
  
  app.post("/api/decisions", async (req: Request, res: Response) => {
    try {
      const result = insertDecisionSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid decision data", errors: result.error.errors });
      }
      
      const meeting = await storage.getMeeting(result.data.meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      const decision = await storage.createDecision(result.data);
      res.status(201).json(decision);
    } catch (error) {
      res.status(500).json({ message: "Failed to create decision" });
    }
  });
  
  app.put("/api/decisions/:id", async (req: Request, res: Response) => {
    try {
      const decisionId = parseInt(req.params.id);
      const result = insertDecisionSchema.partial().safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid decision data", errors: result.error.errors });
      }
      
      const updatedDecision = await storage.updateDecision(decisionId, result.data);
      
      if (!updatedDecision) {
        return res.status(404).json({ message: "Decision not found" });
      }
      
      res.json(updatedDecision);
    } catch (error) {
      res.status(500).json({ message: "Failed to update decision" });
    }
  });
  
  app.delete("/api/decisions/:id", async (req: Request, res: Response) => {
    try {
      const decisionId = parseInt(req.params.id);
      const deleted = await storage.deleteDecision(decisionId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Decision not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete decision" });
    }
  });
  
  // Action Items
  app.get("/api/action-items", async (req: Request, res: Response) => {
    try {
      const meetingId = req.query.meetingId ? parseInt(req.query.meetingId as string) : undefined;
      const assignee = req.query.assignee as string | undefined;
      
      let actionItems;
      if (meetingId) {
        actionItems = await storage.getActionItemsByMeeting(meetingId);
      } else if (assignee) {
        actionItems = await storage.getActionItemsByAssignee(assignee);
      } else {
        // Get all action items from all meetings
        const meetings = await storage.getMeetings();
        actionItems = await Promise.all(
          meetings.map(meeting => storage.getActionItemsByMeeting(meeting.id))
        );
        actionItems = actionItems.flat();
      }
      
      res.json(actionItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch action items" });
    }
  });
  
  app.post("/api/action-items", async (req: Request, res: Response) => {
    try {
      const result = insertActionItemSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid action item data", errors: result.error.errors });
      }
      
      const meeting = await storage.getMeeting(result.data.meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      const actionItem = await storage.createActionItem(result.data);
      res.status(201).json(actionItem);
      
      // Notify on Slack if environment variables are set
      if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID) {
        try {
          await sendSlackMessage({
            channel: process.env.SLACK_CHANNEL_ID,
            text: `New action item created: "${actionItem.task}" assigned to ${actionItem.assignee}, due ${actionItem.deadline}`,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*New Action Item*\n*Task:* ${actionItem.task}\n*Assigned to:* ${actionItem.assignee}\n*Due:* ${actionItem.deadline}\n*Priority:* ${actionItem.priority}`
                }
              }
            ]
          });
        } catch (slackError) {
          console.error("Failed to send Slack notification:", slackError);
        }
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to create action item" });
    }
  });
  
  app.put("/api/action-items/:id", async (req: Request, res: Response) => {
    try {
      const actionItemId = parseInt(req.params.id);
      const result = insertActionItemSchema.partial().safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid action item data", errors: result.error.errors });
      }
      
      const originalItem = await storage.getActionItem(actionItemId);
      const updatedActionItem = await storage.updateActionItem(actionItemId, result.data);
      
      if (!updatedActionItem) {
        return res.status(404).json({ message: "Action item not found" });
      }
      
      res.json(updatedActionItem);
      
      // Notify on Slack if status changed to completed and environment variables are set
      if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID && 
          originalItem && originalItem.status !== "Completed" && updatedActionItem.status === "Completed") {
        try {
          await sendSlackMessage({
            channel: process.env.SLACK_CHANNEL_ID,
            text: `Action item completed: "${updatedActionItem.task}" by ${updatedActionItem.assignee}`,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*Action Item Completed* ✅\n*Task:* ${updatedActionItem.task}\n*Completed by:* ${updatedActionItem.assignee}`
                }
              }
            ]
          });
        } catch (slackError) {
          console.error("Failed to send Slack notification:", slackError);
        }
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update action item" });
    }
  });
  
  app.delete("/api/action-items/:id", async (req: Request, res: Response) => {
    try {
      const actionItemId = parseInt(req.params.id);
      const deleted = await storage.deleteActionItem(actionItemId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Action item not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete action item" });
    }
  });
  
  // Meeting Summaries
  app.get("/api/meeting-summaries", async (req: Request, res: Response) => {
    try {
      const meetingId = req.query.meetingId ? parseInt(req.query.meetingId as string) : undefined;
      
      if (meetingId) {
        const summary = await storage.getMeetingSummaryByMeeting(meetingId);
        
        if (!summary) {
          return res.status(404).json({ message: "Meeting summary not found" });
        }
        
        return res.json(summary);
      }
      
      // Get all summaries
      const meetings = await storage.getMeetings();
      const summaries = await Promise.all(
        meetings.map(async meeting => {
          const summary = await storage.getMeetingSummaryByMeeting(meeting.id);
          return summary ? { ...summary, meeting } : null;
        })
      );
      
      res.json(summaries.filter(Boolean));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meeting summaries" });
    }
  });
  
  app.post("/api/meeting-summaries", async (req: Request, res: Response) => {
    try {
      const result = insertMeetingSummarySchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid meeting summary data", errors: result.error.errors });
      }
      
      const meeting = await storage.getMeeting(result.data.meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Check if a summary already exists for this meeting
      const existingSummary = await storage.getMeetingSummaryByMeeting(result.data.meetingId);
      if (existingSummary) {
        return res.status(409).json({ message: "A summary already exists for this meeting" });
      }
      
      const summary = await storage.createMeetingSummary(result.data);
      res.status(201).json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to create meeting summary" });
    }
  });
  
  app.put("/api/meeting-summaries/:id", async (req: Request, res: Response) => {
    try {
      const summaryId = parseInt(req.params.id);
      const result = insertMeetingSummarySchema.partial().safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid meeting summary data", errors: result.error.errors });
      }
      
      const updatedSummary = await storage.updateMeetingSummary(summaryId, result.data);
      
      if (!updatedSummary) {
        return res.status(404).json({ message: "Meeting summary not found" });
      }
      
      res.json(updatedSummary);
    } catch (error) {
      res.status(500).json({ message: "Failed to update meeting summary" });
    }
  });
  
  app.delete("/api/meeting-summaries/:id", async (req: Request, res: Response) => {
    try {
      const summaryId = parseInt(req.params.id);
      const deleted = await storage.deleteMeetingSummary(summaryId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Meeting summary not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete meeting summary" });
    }
  });
  
  // Generate summary from transcript
  app.post("/api/analyze-transcript", async (req: Request, res: Response) => {
    try {
      const { meetingId } = req.body;
      
      if (!meetingId) {
        return res.status(400).json({ message: "Meeting ID is required" });
      }
      
      const meeting = await storage.getMeeting(parseInt(meetingId));
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      if (!meeting.transcriptText) {
        return res.status(400).json({ message: "Meeting has no transcript to analyze" });
      }
      
      const summaryData = await analyzeTranscript(meeting.transcriptText, meeting);
      
      // Check if a summary already exists
      const existingSummary = await storage.getMeetingSummaryByMeeting(meeting.id);
      let summary;
      
      if (existingSummary) {
        // Update existing summary
        summary = await storage.updateMeetingSummary(existingSummary.id, summaryData);
      } else {
        // Create new summary
        summary = await storage.createMeetingSummary({
          meetingId: meeting.id,
          ...summaryData
        });
      }
      
      res.json(summary);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to analyze transcript" });
    }
  });
  
  // Download meeting summary as DOCX
  app.get("/api/meetings/:id/download", async (req: Request, res: Response) => {
    try {
      const meetingId = parseInt(req.params.id);
      const meeting = await storage.getMeeting(meetingId);
      
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      const summary = await storage.getMeetingSummaryByMeeting(meetingId);
      if (!summary) {
        return res.status(404).json({ message: "Meeting summary not found" });
      }
      
      const decisions = await storage.getDecisionsByMeeting(meetingId);
      const actionItems = await storage.getActionItemsByMeeting(meetingId);
      
      const docxBuffer = await generateDocx(meeting, summary, decisions, actionItems);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=${meeting.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_summary.docx`);
      res.send(docxBuffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to generate document" });
    }
  });
  
  // Ensure uploads directory exists for file uploads
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Setup auth if it's not already configured
  const { ensureAuthenticated } = setupAuth(app);
  
  // Recording upload route
  app.post(
    "/api/upload-recording",
    // Temporarily disabled authentication for testing
    // ensureAuthenticated,
    uploadRecording.single("recording"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        // Use a default user ID for testing
        const userId = req.user ? (req.user as Express.User).id : 1;
        
        // Optional meetingId parameter
        const meetingId = req.body.meetingId ? parseInt(req.body.meetingId) : undefined;
        
        // Save file metadata to database
        const { recording, error } = await saveRecordingToDatabase(
          req.file,
          userId,
          meetingId
        );
        
        if (error) {
          return res.status(500).json({ message: error });
        }
        
        res.status(201).json(recording);
      } catch (error) {
        console.error("Error uploading recording:", error);
        next(error);
      }
    }
  );

  // Transcript upload route
  app.post(
    "/api/upload-transcript",
    // Temporarily disabled authentication for testing
    // ensureAuthenticated,
    uploadTranscript.single("transcript"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        // Use a default user ID for testing
        const userId = req.user ? (req.user as Express.User).id : 1;
        
        // Optional meetingId parameter
        const meetingId = req.body.meetingId ? parseInt(req.body.meetingId) : undefined;
        
        // Save transcript to database
        const result = await saveTranscriptToDatabase(
          req.file,
          userId,
          meetingId
        );
        
        if (!result.success) {
          return res.status(500).json({ message: result.message });
        }
        
        res.status(201).json({
          message: result.message,
          data: result.data
        });
      } catch (error) {
        console.error("Error uploading transcript:", error);
        next(error);
      }
    }
  );
  
  const httpServer = createServer(app);
  
  return httpServer;
}
