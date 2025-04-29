import OpenAI from "openai";
import { Meeting } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
let openai: OpenAI;

// Initialize OpenAI only if API key is available
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } else {
    console.warn("OPENAI_API_KEY is not set. OpenAI features will be disabled.");
    // Create a dummy instance that will be replaced when the key is provided
    openai = {} as OpenAI;
  }
} catch (error) {
  console.error("Failed to initialize OpenAI client:", error);
  // Create a dummy instance that will be replaced when the key is provided
  openai = {} as OpenAI;
}

interface SummaryData {
  executiveSummary: string;
  attendees?: {
    name: string;
    role: string;
    contributions: string;
    responsibleFor: string[];
  }[];
  keyDiscussionPoints: {
    topic: string;
    summary: string;
    contributors?: string[];
    insights: string[];
    questions: string[];
    decisions?: {
      decision: string;
      owner: string;
    }[];
  }[];
  followUpRequirements: {
    nextMeeting?: string;
    deferredTopics?: string[];
    resources?: string[];
    taskAssignments?: {
      task: string;
      assignee: string;
    }[];
  };
  sentimentAnalysis: {
    tone: string;
    engagement: string;
    concerns?: string;
  };
  transcriptHighlights: {
    quote: string;
    speaker: string;
    timestamp: string;
    significance?: string;
  }[];
  decisionMakers?: string;
}

export async function analyzeTranscript(
  transcript: string,
  meeting: Meeting
): Promise<SummaryData> {
  // Check if OpenAI API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is not set. Returning placeholder summary.");
    return createPlaceholderSummary("OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.");
  }
  
  try {
    // Check if we have a proper OpenAI instance with the chat completions method
    if (!openai.chat?.completions?.create) {
      throw new Error("OpenAI client is not properly initialized");
    }
    
    const prompt = `
    Analyze the following meeting transcript and extract key information to create a comprehensive meeting summary.
    Pay special attention to the speakers, their roles, and attribute decisions and action items to specific individuals.
    
    Meeting Title: ${meeting.title}
    Date: ${meeting.date}
    Start Time: ${meeting.startTime}
    End Time: ${meeting.endTime}
    Duration: ${meeting.duration}
    Participants: ${meeting.participants.join(', ')}
    Location/Platform: ${meeting.location}
    
    TRANSCRIPT:
    ${transcript}
    
    Please provide the following information in JSON format:
    1. executiveSummary: A concise 2-3 sentence overview of the meeting's purpose and key outcomes. Include the names of key participants.
    
    2. attendees: An array of attendee objects, each with:
       - name: The name/role of the participant (exactly as mentioned in the transcript)
       - role: Their inferred role in the organization
       - contributions: Brief summary of their main contributions
       - responsibleFor: Array of tasks or decisions they're responsible for
    
    3. keyDiscussionPoints: An array of discussion points, each with:
       - topic: The main topic discussed
       - summary: Brief summary of the discussion
       - contributors: Array of speakers who participated in this topic
       - insights: Array of key insights shared, with speaker attribution
       - questions: Array of questions raised, with speaker attribution
       - decisions: Array of decisions made on this topic, with owner attribution
    
    4. followUpRequirements:
       - nextMeeting: Next meeting date/time if scheduled
       - deferredTopics: Array of topics deferred to future discussion
       - resources: Array of resources to be shared after the meeting
       - taskAssignments: Array of tasks with assignee names (from the transcript)
    
    5. sentimentAnalysis:
       - tone: Overall meeting tone (Professional/Collaborative/Tense/etc.)
       - engagement: Engagement level description including who was most/least engaged
       - concerns: Brief description of key concerns raised and by whom
    
    6. transcriptHighlights: Array of up to 5 important quotes, each with:
       - quote: The direct quote
       - speaker: Who said it (exactly as shown in transcript)
       - timestamp: The timestamp from the transcript
       - significance: Why this quote is important
    
    7. decisionMakers: Brief analysis of who appeared to be the key decision makers in the meeting
    
    Respond with valid JSON only, ensuring all speaker attributions match exactly how they appear in the transcript.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Failed to analyze transcript: No content in response");
    }

    const data = JSON.parse(content) as SummaryData;
    return data;
  } catch (error) {
    console.error("Error analyzing transcript:", error);
    return createPlaceholderSummary("Error processing transcript. Please check your API key or try again later.");
  }
}

// Helper function to create a placeholder summary when OpenAI is unavailable
function createPlaceholderSummary(message: string): SummaryData {
  return {
    executiveSummary: "Failed to generate summary. Please provide an OpenAI API key to enable this feature.",
    attendees: [{
      name: "System",
      role: "Notification",
      contributions: "None - OpenAI integration required",
      responsibleFor: ["Providing API key"]
    }],
    keyDiscussionPoints: [{
      topic: "OpenAI Integration Required",
      summary: "The AI-powered analysis features require a valid OpenAI API key.",
      contributors: ["System"],
      insights: [message],
      questions: ["Do you have an OpenAI API key to provide?"],
      decisions: [{
        decision: "Configure OpenAI API key to enable AI features",
        owner: "Administrator"
      }]
    }],
    followUpRequirements: {
      nextMeeting: "Not available",
      deferredTopics: ["AI-powered analysis"],
      resources: ["OpenAI API key"],
      taskAssignments: [{
        task: "Add OpenAI API key to environment variables",
        assignee: "Administrator"
      }]
    },
    sentimentAnalysis: {
      tone: "Not available",
      engagement: "Not available"
    },
    transcriptHighlights: [],
    decisionMakers: "Not available without AI analysis"
  };
}
