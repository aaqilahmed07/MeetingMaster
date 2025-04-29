import { Meeting, MeetingSummary, Decision, ActionItem, Attendee, DecisionDetail, TaskAssignment, DiscussionPoint, FollowUp, Sentiment, TranscriptHighlight } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPriorityClass, getStatusClass } from "@/lib/document";
import { Separator } from "@/components/ui/separator";

// Define a complete summary interface rather than extending
interface TypedMeetingSummary {
  id: number;
  meetingId: number;
  executiveSummary: string;
  attendees?: Attendee[];
  keyDiscussionPoints: DiscussionPoint[];
  followUpRequirements: FollowUp;
  sentimentAnalysis: Sentiment;
  transcriptHighlights: TranscriptHighlight[];
  decisionMakers: string | null;
  attachments: string[] | null;
  createdAt: Date;
}

interface MeetingSummaryProps {
  meeting: Meeting;
  summary: TypedMeetingSummary;
  decisions: Decision[];
  actionItems: ActionItem[];
}

export default function MeetingSummaryComponent({ 
  meeting, 
  summary, 
  decisions, 
  actionItems 
}: MeetingSummaryProps) {
  return (
    <div>
      {/* Meeting Info */}
      <div className="border-b border-gray-200 pb-6 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">{meeting.title}</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Date & Time</p>
            <p className="font-medium text-gray-900">{meeting.date}, {meeting.startTime} - {meeting.endTime}</p>
          </div>
          <div>
            <p className="text-gray-500">Duration</p>
            <p className="font-medium text-gray-900">{meeting.duration}</p>
          </div>
          <div>
            <p className="text-gray-500">Participants</p>
            <p className="font-medium text-gray-900">{meeting.participants.join(', ')}</p>
          </div>
          <div>
            <p className="text-gray-500">Location/Platform</p>
            <p className="font-medium text-gray-900">{meeting.location}</p>
          </div>
        </div>
      </div>
      
      {/* Executive Summary */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Executive Summary</h3>
        <p className="text-gray-600">{summary.executiveSummary}</p>
      </div>
      
      {/* Attendees and Contributions - New Section */}
      {summary.attendees && summary.attendees.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Attendees and Contributions</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Contributions</TableHead>
                  <TableHead>Responsible For</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.attendees.map((attendee, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{attendee.name}</TableCell>
                    <TableCell>{attendee.role}</TableCell>
                    <TableCell>{attendee.contributions}</TableCell>
                    <TableCell>
                      <ul className="list-disc pl-5">
                        {attendee.responsibleFor.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {summary.decisionMakers && (
            <div className="mt-3 bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-200">
              <span className="font-medium">Key Decision Makers:</span> {summary.decisionMakers}
            </div>
          )}
        </div>
      )}
      
      {/* Key Discussion Points */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Key Discussion Points</h3>
        
        {summary.keyDiscussionPoints.map((point, index) => (
          <div key={index} className="mb-4">
            <h4 className="font-medium text-gray-800 mb-2">{point.topic}</h4>
            <div className="ml-4 space-y-2 text-gray-600">
              <p>Brief summary of discussion:</p>
              <p className="ml-4">{point.summary}</p>
              
              {point.contributors && point.contributors.length > 0 && (
                <div>
                  <p className="text-gray-700 font-medium">Contributors to this topic:</p>
                  <p className="ml-4">{point.contributors.join(', ')}</p>
                </div>
              )}
              
              <p>Key insights shared:</p>
              <ul className="ml-4 list-disc pl-5">
                {point.insights.map((insight, i) => (
                  <li key={i}>
                    {typeof insight === 'string' ? (
                      insight
                    ) : (
                      <>
                        <span className="font-medium">
                          {(insight as any).speaker && `${(insight as any).speaker.split(' ').map((part: string) => part[0]).join('')}: `}
                        </span>
                        {(insight as any).insight || (insight as any).text}
                      </>
                    )}
                  </li>
                ))}
              </ul>
              
              <p>Questions raised:</p>
              <ul className="ml-4 list-disc pl-5">
                {point.questions.map((question, i) => (
                  <li key={i}>
                    {typeof question === 'string' ? (
                      question
                    ) : (
                      <>
                        <span className="font-medium">
                          {(question as any).speaker && `${(question as any).speaker.split(' ').map((part: string) => part[0]).join('')}: `}
                        </span>
                        {(question as any).question || (question as any).text}
                      </>
                    )}
                  </li>
                ))}
              </ul>
              
              {point.decisions && point.decisions.length > 0 && (
                <div>
                  <p className="text-gray-700 font-medium">Decisions made on this topic:</p>
                  <ul className="ml-4 list-disc pl-5">
                    {point.decisions.map((decision, i) => (
                      <li key={i}>
                        <span className="font-medium">{decision.decision}</span>
                        <span className="text-gray-500"> (Owner: {decision.owner})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {index < summary.keyDiscussionPoints.length - 1 && (
              <Separator className="my-4" />
            )}
          </div>
        ))}
      </div>
      
      {/* Decisions Made */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Decisions Made</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Decision</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Context</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decisions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                    No decisions recorded for this meeting
                  </TableCell>
                </TableRow>
              ) : (
                decisions.map((decision) => (
                  <TableRow key={decision.id}>
                    <TableCell className="font-medium">{decision.description}</TableCell>
                    <TableCell>{decision.owner}</TableCell>
                    <TableCell>{decision.context}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Action Items */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Action Items</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actionItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                    No action items recorded for this meeting
                  </TableCell>
                </TableRow>
              ) : (
                actionItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.task}</TableCell>
                    <TableCell>{item.assignee}</TableCell>
                    <TableCell>{item.deadline}</TableCell>
                    <TableCell>
                      <Badge className={getPriorityClass(item.priority)}>
                        {item.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusClass(item.status)}>
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Follow-up Requirements */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Follow-up Requirements</h3>
        <div className="space-y-3 text-gray-600">
          {summary.followUpRequirements.nextMeeting && (
            <div>
              <p className="text-gray-700 font-medium">Next meeting date/time:</p>
              <p>{summary.followUpRequirements.nextMeeting}</p>
            </div>
          )}
          
          {summary.followUpRequirements.deferredTopics && summary.followUpRequirements.deferredTopics.length > 0 && (
            <div>
              <p className="text-gray-700 font-medium">Topics deferred to future discussion:</p>
              <ul className="list-disc pl-5 mt-1">
                {summary.followUpRequirements.deferredTopics.map((topic, i) => (
                  <li key={i}>{topic}</li>
                ))}
              </ul>
            </div>
          )}
          
          {summary.followUpRequirements.resources && summary.followUpRequirements.resources.length > 0 && (
            <div>
              <p className="text-gray-700 font-medium">Resources to be shared:</p>
              <ul className="list-disc pl-5 mt-1">
                {summary.followUpRequirements.resources.map((resource, i) => (
                  <li key={i}>{resource}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Display task assignments if available */}
          {summary.followUpRequirements.taskAssignments && summary.followUpRequirements.taskAssignments.length > 0 && (
            <div>
              <p className="text-gray-700 font-medium">Tasks assigned in the meeting:</p>
              <ul className="list-disc pl-5 mt-1">
                {summary.followUpRequirements.taskAssignments.map((taskAssignment, i) => (
                  <li key={i}>
                    <span className="font-medium">{taskAssignment.task}</span>
                    <span className="text-gray-500"> - Assigned to: {taskAssignment.assignee}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Object.keys(summary.followUpRequirements).length === 0 && (
            <p>No follow-up requirements recorded for this meeting.</p>
          )}
        </div>
      </div>
      
      {/* Sentiment Analysis */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Sentiment Analysis</h3>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Meeting tone</p>
              <p className="font-medium text-gray-800">{summary.sentimentAnalysis.tone}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Engagement level</p>
              <p className="font-medium text-gray-800">{summary.sentimentAnalysis.engagement}</p>
            </div>
            {summary.sentimentAnalysis.concerns && (
              <div>
                <p className="text-gray-500 text-sm">Key concerns raised</p>
                <p className="font-medium text-gray-800">
                  {typeof summary.sentimentAnalysis.concerns === 'string' 
                    ? summary.sentimentAnalysis.concerns 
                    : summary.sentimentAnalysis.concerns.map((concern, i) => (
                      <span key={i}>
                        {typeof concern === 'string' 
                          ? concern 
                          : <>
                              <span className="font-medium">
                                {(concern as any).speaker && `${(concern as any).speaker.split(' ').map((part: string) => part[0]).join('')}: `}
                              </span>
                              {(concern as any).concern || (concern as any).text}
                            </>
                        }
                        {summary.sentimentAnalysis.concerns && typeof summary.sentimentAnalysis.concerns !== 'string' && 
                          i < summary.sentimentAnalysis.concerns.length - 1 ? ', ' : ''}
                      </span>
                    ))
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Transcript Highlights */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Transcript Highlights</h3>
        <div className="space-y-4">
          {summary.transcriptHighlights.length === 0 ? (
            <p className="text-gray-500">No transcript highlights available.</p>
          ) : (
            summary.transcriptHighlights.map((highlight, i) => (
              <div key={i} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <p className="italic text-gray-600">"{highlight.quote}"</p>
                <p className="text-sm text-gray-500 mt-2">- {highlight.speaker}, {highlight.timestamp}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
