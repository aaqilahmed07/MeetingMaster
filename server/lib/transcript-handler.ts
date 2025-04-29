import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { storage } from '../storage';
import { InsertMeeting } from '@shared/schema';

// Create transcripts directory if it doesn't exist
const transcriptsDir = path.join(process.cwd(), 'uploads', 'transcripts');
if (!fs.existsSync(transcriptsDir)) {
  fs.mkdirSync(transcriptsDir, { recursive: true });
}

// Storage configuration for multer
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, transcriptsDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

// File filter to accept only text and document files
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const acceptedTypes = [
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel'
  ];
  
  // Also check file extension for CSV files since sometimes they're uploaded with incorrect MIME types
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  if (acceptedTypes.includes(file.mimetype) || fileExt === '.csv') {
    cb(null, true);
  } else {
    cb(new Error('Only text, document, and CSV files are allowed!'));
  }
};

// Create multer upload instance
export const uploadTranscript = multer({
  storage: diskStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

// Helper function to save transcript to database
export async function saveTranscriptToDatabase(
  file: Express.Multer.File,
  userId: number,
  meetingId?: number
): Promise<{ success: boolean, message: string, data?: any }> {
  try {
    if (meetingId) {
      // Update existing meeting with transcript info
      const meeting = await storage.getMeeting(meetingId);
      
      if (!meeting) {
        return { 
          success: false, 
          message: "Meeting not found" 
        };
      }
      
      // Read file content for text and CSV files
      let transcriptText: string | null = null;
      const fileExt = path.extname(file.originalname).toLowerCase();
      
      if (file.mimetype === 'text/plain' || ['text/csv', 'application/csv', 'application/vnd.ms-excel'].includes(file.mimetype) || fileExt === '.csv') {
        try {
          const rawContent = fs.readFileSync(file.path, 'utf8');
          
          // Handle CSV files - convert to formatted text
          if (fileExt === '.csv' || file.mimetype.includes('csv') || file.mimetype.includes('excel')) {
            // Simple CSV parsing for transcript format with timestamp, speaker, text
            const lines = rawContent.split('\n');
            let formattedText = '';
            
            // Skip header row if it exists
            const startLine = lines[0].includes('timestamp') || lines[0].includes('speaker') ? 1 : 0;
            
            for (let i = startLine; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              
              // Split by comma, but respect quoted entries
              const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
              
              if (parts.length >= 3) {
                const timestamp = parts[0].replace(/"/g, '').trim();
                const speaker = parts[1].replace(/"/g, '').trim();
                // Join the rest in case the text contains commas
                const text = parts.slice(2).join(',').replace(/"/g, '').trim();
                
                formattedText += `[${timestamp}] ${speaker}: ${text}\n`;
              } else {
                // If line doesn't match expected format, include it as is
                formattedText += `${line}\n`;
              }
            }
            
            transcriptText = formattedText;
          } else {
            // Regular text file
            transcriptText = rawContent;
          }
        } catch (readError) {
          console.error('Error reading transcript file:', readError);
        }
      }
      
      // Update the meeting with transcript info
      const updatedMeeting = await storage.updateMeeting(meetingId, {
        transcriptUrl: file.path,
        transcriptText: transcriptText || undefined
      });
      
      // Try to automatically analyze the transcript
      try {
        if (process.env.OPENAI_API_KEY && transcriptText) {
          // Import the analyzer function
          const { analyzeTranscript } = await import('../lib/openai');
          
          // Analyze the transcript - make sure meeting exists before passing to analyzer
          if (!updatedMeeting) {
            throw new Error("Meeting not found");
          }
          const summaryData = await analyzeTranscript(transcriptText, updatedMeeting);
          
          // Check if a summary already exists
          const existingSummary = await storage.getMeetingSummaryByMeeting(meetingId);
          
          if (existingSummary) {
            // Update existing summary with enhanced data
            await storage.updateMeetingSummary(existingSummary.id, {
              executiveSummary: summaryData.executiveSummary,
              attendees: summaryData.attendees,
              keyDiscussionPoints: summaryData.keyDiscussionPoints,
              followUpRequirements: summaryData.followUpRequirements,
              sentimentAnalysis: summaryData.sentimentAnalysis,
              transcriptHighlights: summaryData.transcriptHighlights,
              decisionMakers: summaryData.decisionMakers
            });
          } else {
            // Create a new summary with enhanced data
            await storage.createMeetingSummary({
              meetingId: meetingId,
              executiveSummary: summaryData.executiveSummary,
              attendees: summaryData.attendees,
              keyDiscussionPoints: summaryData.keyDiscussionPoints,
              followUpRequirements: summaryData.followUpRequirements,
              sentimentAnalysis: summaryData.sentimentAnalysis,
              transcriptHighlights: summaryData.transcriptHighlights,
              decisionMakers: summaryData.decisionMakers
            });
          }
          
          // Extract decisions directly from the enhanced decision field
          if (summaryData.keyDiscussionPoints && summaryData.keyDiscussionPoints.length > 0) {
            for (const point of summaryData.keyDiscussionPoints) {
              // First check for structured decisions
              if (point.decisions && point.decisions.length > 0) {
                for (const decision of point.decisions) {
                  await storage.createDecision({
                    meetingId: meetingId,
                    description: decision.decision,
                    owner: decision.owner,
                    timestamp: new Date().toLocaleTimeString(),
                    context: point.topic
                  });
                }
              } 
              // Fallback to insights if no explicit decisions were found
              else if (point.insights && point.insights.length > 0) {
                // Create decisions from insights that appear to be decisions
                for (const insight of point.insights) {
                  // Handle both string insights and object insights with speaker attribution
                  const insightText = typeof insight === 'string' ? insight : 
                                      ((insight as any).insight || (insight as any).text || '');
                  const speakerName = typeof insight === 'string' ? null : 
                                      ((insight as any).speaker || null);
                  
                  // Only process non-empty insight text
                  if (!insightText) continue;
                  
                  if (insightText.toLowerCase().includes('decide') || 
                      insightText.toLowerCase().includes('agreed') || 
                      insightText.toLowerCase().includes('conclusion') ||
                      insightText.toLowerCase().includes('passed') ||
                      insightText.toLowerCase().includes('requested') ||
                      insightText.toLowerCase().includes('ownership') ||
                      insightText.toLowerCase().includes('priority')) {
                    
                    // Try to find the owner - use speaker name from object if available
                    let owner = 'Team';
                    
                    // If we have a speaker from the object structure, use their initials
                    if (speakerName) {
                      // Extract initials from speaker name (e.g., "John Doe" -> "JD")
                      owner = speakerName.split(' ')
                        .map((part: string) => part[0])
                        .join('')
                        .toUpperCase();
                    }
                    
                    // Look for the speaker in the text if in format "Speaker: text"
                    const speakerMatch = insight.match(/^([^:]+):/);
                    if (speakerMatch && speakerMatch[1]) {
                      owner = speakerMatch[1].trim();
                    } 
                    // Otherwise check if any participant is mentioned
                    else if (meeting.participants && meeting.participants.length > 0) {
                      for (const participant of meeting.participants) {
                        if (insight.includes(participant)) {
                          owner = participant;
                          break;
                        }
                      }
                    }
                    
                    await storage.createDecision({
                      meetingId: meetingId,
                      description: insight,
                      owner: owner,
                      timestamp: new Date().toLocaleTimeString(),
                      context: point.topic
                    });
                  }
                }
              }
            }
          }
          
          // Create action items from taskAssignments if available
          if (summaryData.followUpRequirements && summaryData.followUpRequirements.taskAssignments && 
              summaryData.followUpRequirements.taskAssignments.length > 0) {
            
            for (const task of summaryData.followUpRequirements.taskAssignments) {
              await storage.createActionItem({
                meetingId: meetingId,
                task: task.task,
                assignee: task.assignee,
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Due in 1 week
                status: 'Pending',
                priority: 'Medium',
                notes: 'Auto-generated from meeting analysis'
              });
            }
          }
          // Fallback to resources if no explicit tasks were assigned
          else if (summaryData.followUpRequirements && summaryData.followUpRequirements.resources) {
            for (const resource of summaryData.followUpRequirements.resources) {
              // Try to find an appropriate assignee from the attendees list
              let assignee = 'Unassigned';
              
              if (summaryData.attendees && summaryData.attendees.length > 0) {
                // Assign to someone with relevant responsibilities
                for (const attendee of summaryData.attendees) {
                  if (attendee.responsibleFor && attendee.responsibleFor.some(r => 
                      r.toLowerCase().includes('resource') || 
                      r.toLowerCase().includes('shar') || 
                      r.toLowerCase().includes('document'))) {
                    assignee = attendee.name;
                    break;
                  }
                }
                
                // If no one seems responsible for resources, assign to first person
                if (assignee === 'Unassigned' && summaryData.attendees.length > 0) {
                  assignee = summaryData.attendees[0].name;
                }
              } else if (meeting && meeting.participants && meeting.participants.length > 0) {
                assignee = meeting.participants[0];
              }
              
              await storage.createActionItem({
                meetingId: meetingId,
                task: `Share resource: ${resource}`,
                assignee: assignee,
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Due in 1 week
                status: 'Pending',
                priority: 'Medium',
                notes: 'Auto-generated from meeting analysis'
              });
            }
          }
          
          return {
            success: true,
            message: "Transcript uploaded, linked to meeting, and AI analysis completed",
            data: updatedMeeting
          };
        }
      } catch (analysisError) {
        console.error('Error performing automatic analysis:', analysisError);
        // If analysis fails, we still return success for the transcript upload
      }
      
      return {
        success: true,
        message: "Transcript uploaded and linked to meeting",
        data: updatedMeeting
      };
    } else {
      // Create a new meeting with just the transcript
      let transcriptText: string | null = null;
      const fileExt = path.extname(file.originalname).toLowerCase();
      
      if (file.mimetype === 'text/plain' || ['text/csv', 'application/csv', 'application/vnd.ms-excel'].includes(file.mimetype) || fileExt === '.csv') {
        try {
          const rawContent = fs.readFileSync(file.path, 'utf8');
          
          // Handle CSV files - convert to formatted text
          if (fileExt === '.csv' || file.mimetype.includes('csv') || file.mimetype.includes('excel')) {
            // Simple CSV parsing for transcript format with timestamp, speaker, text
            const lines = rawContent.split('\n');
            let formattedText = '';
            
            // Skip header row if it exists
            const startLine = lines[0].includes('timestamp') || lines[0].includes('speaker') ? 1 : 0;
            
            // Extract participants from CSV
            const participants = new Set<string>();
            
            for (let i = startLine; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              
              // Split by comma, but respect quoted entries
              const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
              
              if (parts.length >= 3) {
                const timestamp = parts[0].replace(/"/g, '').trim();
                const speaker = parts[1].replace(/"/g, '').trim();
                // Join the rest in case the text contains commas
                const text = parts.slice(2).join(',').replace(/"/g, '').trim();
                
                // Add speaker to participants set
                if (speaker && speaker !== 'undefined') {
                  participants.add(speaker);
                }
                
                formattedText += `[${timestamp}] ${speaker}: ${text}\n`;
              } else {
                // If line doesn't match expected format, include it as is
                formattedText += `${line}\n`;
              }
            }
            
            transcriptText = formattedText;
            
            // Create a title based on the CSV filename
            const fileName = path.basename(file.originalname, '.csv');
            const title = fileName.replace(/_/g, ' ').replace(/-/g, ' ');
            
            // Create a meeting with the parsed information
            const newMeeting: InsertMeeting = {
              title: title || `CSV Transcript from ${new Date().toLocaleDateString()}`,
              date: new Date().toISOString().split('T')[0],
              startTime: "00:00",
              endTime: "00:00",
              duration: "Unknown",
              participants: Array.from(participants),
              location: "Imported CSV Transcript",
              createdBy: userId,
              transcriptUrl: file.path,
              transcriptText: transcriptText
            };
            
            // Create the meeting
            const meeting = await storage.createMeeting(newMeeting);
            
            // Try to automatically analyze the transcript
            try {
              if (process.env.OPENAI_API_KEY && meeting.transcriptText) {
                // Import the analyzer function
                const { analyzeTranscript } = await import('../lib/openai');
                
                // Analyze the transcript
                const summaryData = await analyzeTranscript(meeting.transcriptText, meeting);
                
                // Create a meeting summary with enhanced data
                await storage.createMeetingSummary({
                  meetingId: meeting.id,
                  executiveSummary: summaryData.executiveSummary,
                  attendees: summaryData.attendees,
                  keyDiscussionPoints: summaryData.keyDiscussionPoints,
                  followUpRequirements: summaryData.followUpRequirements,
                  sentimentAnalysis: summaryData.sentimentAnalysis,
                  transcriptHighlights: summaryData.transcriptHighlights,
                  decisionMakers: summaryData.decisionMakers
                });
                
                // Extract decisions directly from the enhanced decision field
                if (summaryData.keyDiscussionPoints && summaryData.keyDiscussionPoints.length > 0) {
                  for (const point of summaryData.keyDiscussionPoints) {
                    // First check for structured decisions
                    if (point.decisions && point.decisions.length > 0) {
                      for (const decision of point.decisions) {
                        await storage.createDecision({
                          meetingId: meeting.id,
                          description: decision.decision,
                          owner: decision.owner,
                          timestamp: new Date().toLocaleTimeString(),
                          context: point.topic
                        });
                      }
                    } 
                    // Fallback to insights if no explicit decisions were found
                    else if (point.insights && point.insights.length > 0) {
                      // Create decisions from insights that appear to be decisions
                      for (const insight of point.insights) {
                        // Handle both string insights and object insights with speaker attribution
                        const insightText = typeof insight === 'string' ? insight : 
                                           ((insight as any).insight || (insight as any).text || '');
                        const speakerName = typeof insight === 'string' ? null : 
                                           ((insight as any).speaker || null);
                        
                        // Only process non-empty insight text
                        if (!insightText) continue;
                        
                        if (insightText.toLowerCase().includes('decide') || 
                            insightText.toLowerCase().includes('agreed') || 
                            insightText.toLowerCase().includes('conclusion') ||
                            insightText.toLowerCase().includes('passed') ||
                            insightText.toLowerCase().includes('requested') ||
                            insightText.toLowerCase().includes('ownership') ||
                            insightText.toLowerCase().includes('priority')) {
                          
                          // Try to find the owner - use speaker name from object if available
                          let owner = 'Team';
                          
                          // If we have a speaker from the object structure, use their initials
                          if (speakerName) {
                            // Extract initials from speaker name (e.g., "John Doe" -> "JD")
                            owner = speakerName.split(' ')
                              .map((part: string) => part[0])
                              .join('')
                              .toUpperCase();
                          }
                          
                          // Look for the speaker in the text if in format "Speaker: text"
                          const speakerMatch = insight.match(/^([^:]+):/);
                          if (speakerMatch && speakerMatch[1]) {
                            owner = speakerMatch[1].trim();
                          } 
                          // Otherwise check if any participant is mentioned
                          else if (meeting.participants && meeting.participants.length > 0) {
                            for (const participant of meeting.participants) {
                              if (insight.includes(participant)) {
                                owner = participant;
                                break;
                              }
                            }
                          }
                          
                          await storage.createDecision({
                            meetingId: meeting.id,
                            description: insight,
                            owner: owner,
                            timestamp: new Date().toLocaleTimeString(),
                            context: point.topic
                          });
                        }
                      }
                    }
                  }
                }
                
                // Create action items from taskAssignments if available
                if (summaryData.followUpRequirements && summaryData.followUpRequirements.taskAssignments && 
                    summaryData.followUpRequirements.taskAssignments.length > 0) {
                  
                  for (const task of summaryData.followUpRequirements.taskAssignments) {
                    await storage.createActionItem({
                      meetingId: meeting.id,
                      task: task.task,
                      assignee: task.assignee,
                      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Due in 1 week
                      status: 'Pending',
                      priority: 'Medium',
                      notes: 'Auto-generated from meeting analysis'
                    });
                  }
                }
                // Fallback to resources if no explicit tasks were assigned
                else if (summaryData.followUpRequirements && summaryData.followUpRequirements.resources) {
                  for (const resource of summaryData.followUpRequirements.resources) {
                    // Try to find an appropriate assignee from the attendees list
                    let assignee = 'Unassigned';
                    
                    if (summaryData.attendees && summaryData.attendees.length > 0) {
                      // Assign to someone with relevant responsibilities
                      for (const attendee of summaryData.attendees) {
                        if (attendee.responsibleFor && attendee.responsibleFor.some(r => 
                            r.toLowerCase().includes('resource') || 
                            r.toLowerCase().includes('shar') || 
                            r.toLowerCase().includes('document'))) {
                          assignee = attendee.name;
                          break;
                        }
                      }
                      
                      // If no one seems responsible for resources, assign to first person
                      if (assignee === 'Unassigned' && summaryData.attendees.length > 0) {
                        assignee = summaryData.attendees[0].name;
                      }
                    } else if (meeting.participants && meeting.participants.length > 0) {
                      assignee = meeting.participants[0];
                    }
                    
                    await storage.createActionItem({
                      meetingId: meeting.id,
                      task: `Share resource: ${resource}`,
                      assignee: assignee,
                      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Due in 1 week
                      status: 'Pending',
                      priority: 'Medium',
                      notes: 'Auto-generated from meeting analysis'
                    });
                  }
                }
                
                return {
                  success: true,
                  message: "CSV transcript uploaded, new meeting created, and AI analysis completed",
                  data: meeting
                };
              }
            } catch (analysisError) {
              console.error('Error performing automatic analysis:', analysisError);
              // If analysis fails, we still return success for the meeting creation
            }
            
            return {
              success: true,
              message: "CSV transcript uploaded and new meeting created",
              data: meeting
            };
          } else {
            // Regular text file
            transcriptText = rawContent;
            
            // Create placeholder meeting with transcript
            const newMeeting: InsertMeeting = {
              title: `Transcript from ${new Date().toLocaleDateString()}`,
              date: new Date().toISOString().split('T')[0],
              startTime: "00:00",
              endTime: "00:00",
              duration: "Unknown",
              participants: [],
              location: "Imported Transcript",
              createdBy: userId,
              transcriptUrl: file.path,
              transcriptText: transcriptText
            };
            
            const meeting = await storage.createMeeting(newMeeting);
            
            return {
              success: true,
              message: "Transcript uploaded and new meeting created",
              data: meeting
            };
          }
        } catch (readError) {
          console.error('Error reading transcript file:', readError);
        }
      }
      
      // If we couldn't read the file or it's not a supported type
      return {
        success: false,
        message: "Failed to process the transcript file. Please check the file format and try again."
      };
    }
  } catch (error) {
    console.error('Error saving transcript to database:', error);
    return { 
      success: false, 
      message: 'Failed to save transcript information' 
    };
  }
}