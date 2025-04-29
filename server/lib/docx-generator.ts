import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, HeadingLevel, AlignmentType } from "docx";
import { Meeting, MeetingSummary, Decision, ActionItem } from "@shared/schema";

export async function generateDocx(
  meeting: Meeting,
  summary: MeetingSummary,
  decisions: Decision[],
  actionItems: ActionItem[]
): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Header
        new Paragraph({
          text: "Meeting Memory: AI Meeting Assistant",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 200 },
        }),
        
        new Paragraph({
          text: "Meeting Summary",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        
        // Meeting Details
        new Paragraph({
          children: [
            new TextRun({ text: "Meeting Title: ", bold: true }),
            new TextRun({ text: meeting.title }),
            new TextRun({ text: "\t\tDate & Time: ", bold: true }),
            new TextRun({ text: `${meeting.date} ${meeting.startTime} - ${meeting.endTime}` }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "Duration: ", bold: true }),
            new TextRun({ text: meeting.duration }),
            new TextRun({ text: "\t\tParticipants: ", bold: true }),
            new TextRun({ text: meeting.participants.join(", ") }),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "Location/Platform: ", bold: true }),
            new TextRun({ text: meeting.location }),
          ],
          spacing: { after: 300 },
        }),
        
        // Executive Summary
        new Paragraph({
          text: "Executive Summary",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        
        new Paragraph({
          text: summary.executiveSummary,
          spacing: { after: 300 },
        }),
        
        // Key Discussion Points
        new Paragraph({
          text: "Key Discussion Points",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        
        ...summary.keyDiscussionPoints.flatMap((point, index) => [
          // Topic heading
          new Paragraph({
            text: `Topic ${index + 1}: ${point.topic}`,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 100, after: 100 },
          }),
          
          // Brief summary
          new Paragraph({
            children: [
              new TextRun({ text: "Brief summary of discussion", bold: true }),
            ],
            spacing: { after: 100 },
          }),
          
          new Paragraph({
            text: point.summary,
            spacing: { after: 200 },
          }),
          
          // Key insights
          new Paragraph({
            children: [
              new TextRun({ text: "Key insights shared", bold: true }),
            ],
            spacing: { after: 100 },
          }),
          
          ...point.insights.map(insight => new Paragraph({
            text: `• ${insight}`,
            spacing: { after: 100 },
          })),
          
          // Questions raised
          new Paragraph({
            children: [
              new TextRun({ text: "Questions raised", bold: true }),
            ],
            spacing: { after: 100 },
          }),
          
          ...point.questions.map(question => new Paragraph({
            text: `• ${question}`,
            spacing: { after: 100 },
          })),
        ]),
        
        // Decisions Made
        new Paragraph({
          text: "Decisions Made",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        
        // Decisions Table
        new Table({
          width: {
            size: 100,
            type: "pct",
          },
          rows: [
            // Header row
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Decision", bold: true })],
                  width: {
                    size: 40,
                    type: "pct",
                  },
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Owner", bold: true })],
                  width: {
                    size: 20,
                    type: "pct",
                  },
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Timestamp", bold: true })],
                  width: {
                    size: 15,
                    type: "pct",
                  },
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Context", bold: true })],
                  width: {
                    size: 25,
                    type: "pct",
                  },
                }),
              ],
            }),
            
            // Decision rows
            ...decisions.map(decision => new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph(decision.description)],
                }),
                new TableCell({
                  children: [new Paragraph(decision.owner)],
                }),
                new TableCell({
                  children: [new Paragraph(decision.timestamp)],
                }),
                new TableCell({
                  children: [new Paragraph(decision.context)],
                }),
              ],
            })),
          ],
        }),
        
        new Paragraph({ spacing: { after: 300 } }),
        
        // Action Items
        new Paragraph({
          text: "Action Items",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        
        // Action Items Table
        new Table({
          width: {
            size: 100,
            type: "pct",
          },
          rows: [
            // Header row
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Task", bold: true })],
                  width: {
                    size: 30,
                    type: "pct",
                  },
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Assignee", bold: true })],
                  width: {
                    size: 15,
                    type: "pct",
                  },
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Deadline", bold: true })],
                  width: {
                    size: 15,
                    type: "pct",
                  },
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Priority", bold: true })],
                  width: {
                    size: 10,
                    type: "pct",
                  },
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Status", bold: true })],
                  width: {
                    size: 15,
                    type: "pct",
                  },
                }),
                new TableCell({
                  children: [new Paragraph({ text: "Notes", bold: true })],
                  width: {
                    size: 15,
                    type: "pct",
                  },
                }),
              ],
            }),
            
            // Action Item rows
            ...actionItems.map(item => new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph(item.task)],
                }),
                new TableCell({
                  children: [new Paragraph(item.assignee)],
                }),
                new TableCell({
                  children: [new Paragraph(item.deadline)],
                }),
                new TableCell({
                  children: [new Paragraph(item.priority)],
                }),
                new TableCell({
                  children: [new Paragraph(item.status)],
                }),
                new TableCell({
                  children: [new Paragraph(item.notes || "")],
                }),
              ],
            })),
          ],
        }),
        
        new Paragraph({ spacing: { after: 300 } }),
        
        // Follow-up Requirements
        new Paragraph({
          text: "Follow-up Requirements",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        
        summary.followUpRequirements.nextMeeting ? new Paragraph({
          children: [
            new TextRun({ text: "Next meeting date/time: ", bold: true }),
            new TextRun(summary.followUpRequirements.nextMeeting),
          ],
          spacing: { after: 100 },
        }) : new Paragraph({ text: "" }),
        
        summary.followUpRequirements.deferredTopics && summary.followUpRequirements.deferredTopics.length > 0 ? 
          new Paragraph({
            children: [
              new TextRun({ text: "Topics deferred to future discussion:", bold: true }),
            ],
            spacing: { after: 100 },
          }) : new Paragraph({ text: "" }),
        
        ...(summary.followUpRequirements.deferredTopics || []).map(topic => new Paragraph({
          text: `• ${topic}`,
          spacing: { after: 100 },
        })),
        
        summary.followUpRequirements.resources && summary.followUpRequirements.resources.length > 0 ? 
          new Paragraph({
            children: [
              new TextRun({ text: "Resources to be shared after the meeting:", bold: true }),
            ],
            spacing: { after: 100 },
          }) : new Paragraph({ text: "" }),
        
        ...(summary.followUpRequirements.resources || []).map(resource => new Paragraph({
          text: `• ${resource}`,
          spacing: { after: 100 },
        })),
        
        new Paragraph({ spacing: { after: 300 } }),
        
        // Sentiment Analysis
        new Paragraph({
          text: "Sentiment Analysis",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "Meeting tone: ", bold: true }),
            new TextRun(summary.sentimentAnalysis.tone),
          ],
          spacing: { after: 100 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "Engagement level: ", bold: true }),
            new TextRun(summary.sentimentAnalysis.engagement),
          ],
          spacing: { after: 100 },
        }),
        
        summary.sentimentAnalysis.concerns ? new Paragraph({
          children: [
            new TextRun({ text: "Key concerns raised: ", bold: true }),
            new TextRun(summary.sentimentAnalysis.concerns),
          ],
          spacing: { after: 100 },
        }) : new Paragraph({ text: "" }),
        
        new Paragraph({ spacing: { after: 300 } }),
        
        // Transcript Highlights
        new Paragraph({
          text: "Transcript Highlights",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        
        ...summary.transcriptHighlights.map(highlight => new Paragraph({
          children: [
            new TextRun({ text: `"${highlight.quote}"`, italics: true }),
            new TextRun({ text: ` - ${highlight.speaker}, ${highlight.timestamp}` }),
          ],
          spacing: { after: 200 },
        })),
        
        // Footer
        new Paragraph({
          text: `This summary was generated by Meeting Memory AI on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}. Reply to this email with "Help" for assistance or "Feedback" to improve future summaries.`,
          spacing: { before: 300, after: 0 },
          alignment: AlignmentType.CENTER,
        }),
      ],
    }],
  });
  
  return await Packer.toBuffer(doc);
}
