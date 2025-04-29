import { type ChatPostMessageArguments, WebClient } from "@slack/web-api";

let slack: WebClient | null = null;

// Initialize Slack client if tokens are provided
if (process.env.SLACK_BOT_TOKEN) {
  slack = new WebClient(process.env.SLACK_BOT_TOKEN);
}

/**
 * Sends a structured message to a Slack channel using the Slack Web API
 * @param message - Structured message to send
 * @returns Promise resolving to the sent message's timestamp
 */
export async function sendSlackMessage(
  message: ChatPostMessageArguments
): Promise<string | undefined> {
  if (!slack) {
    console.warn("Slack client not initialized. Set SLACK_BOT_TOKEN environment variable.");
    return undefined;
  }
  
  try {
    // Send the message
    const response = await slack.chat.postMessage(message);

    // Return the timestamp of the sent message
    return response.ts;
  } catch (error) {
    console.error('Error sending Slack message:', error);
    throw error;
  }
}

/**
 * Sends a follow-up reminder for an action item
 * @param actionItem - Action item to send reminder for
 * @returns Promise resolving to the sent message's timestamp
 */
export async function sendActionItemReminder(
  actionItem: {
    task: string;
    assignee: string;
    deadline: string;
    meetingTitle: string;
  }
): Promise<string | undefined> {
  if (!slack || !process.env.SLACK_CHANNEL_ID) {
    console.warn("Slack client not initialized or channel ID not set.");
    return undefined;
  }
  
  try {
    return await sendSlackMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: `Reminder: Action item "${actionItem.task}" due on ${actionItem.deadline}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Action Item Reminder* ⏰\n*Task:* ${actionItem.task}\n*Assigned to:* ${actionItem.assignee}\n*Due:* ${actionItem.deadline}\n*From meeting:* ${actionItem.meetingTitle}`
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Mark Complete",
                emoji: true
              },
              style: "primary",
              value: JSON.stringify({ type: "complete_action", id: 123 })
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Reschedule",
                emoji: true
              },
              value: JSON.stringify({ type: "reschedule_action", id: 123 })
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error("Error sending action item reminder:", error);
    throw error;
  }
}
