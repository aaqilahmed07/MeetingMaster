import { useQuery } from "@tanstack/react-query";
import { Meeting, MeetingSummary, Decision, ActionItem, Attendee, DecisionDetail, TaskAssignment, DiscussionPoint, FollowUp, Sentiment, TranscriptHighlight } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { downloadMeetingSummary } from "@/lib/document";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { getPriorityClass, getStatusClass } from "@/lib/document";
import MeetingSummaryComponent from "./MeetingSummary";

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

interface SummaryModalProps {
  meeting: Meeting;
  isOpen: boolean;
  onClose: () => void;
}

export default function SummaryModal({ meeting, isOpen, onClose }: SummaryModalProps) {
  const { toast } = useToast();

  const { data: summary } = useQuery<TypedMeetingSummary>({
    queryKey: [`/api/meeting-summaries?meetingId=${meeting.id}`],
    staleTime: 60000, // 1 minute
  });

  const { data: decisions = [] } = useQuery<Decision[]>({
    queryKey: [`/api/decisions?meetingId=${meeting.id}`],
    staleTime: 60000, // 1 minute
  });

  const { data: actionItems = [] } = useQuery<ActionItem[]>({
    queryKey: [`/api/action-items?meetingId=${meeting.id}`],
    staleTime: 60000, // 1 minute
  });

  const handleDownload = async () => {
    try {
      await downloadMeetingSummary(meeting.id);
      toast({
        title: "Download started",
        description: "Your meeting summary is being downloaded.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "There was an error downloading the summary.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  if (!summary) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          aria-describedby="summary-modal-description"
        >
          <DialogHeader>
            <DialogTitle>Meeting Summary</DialogTitle>
            <div id="summary-modal-description" className="sr-only">Meeting summary information and details</div>
          </DialogHeader>
          <div className="p-6 text-center text-gray-500">
            No summary available for this meeting.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        aria-describedby="full-summary-description"
      >
        <DialogHeader className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
          <DialogTitle>Meeting Summary</DialogTitle>
          <div id="full-summary-description" className="sr-only">Detailed meeting summary with decisions and action items</div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-primary-600 border-primary-600"
            >
              <i className="ri-download-line mr-1"></i>
              Download as Word
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <i className="ri-close-line text-xl"></i>
            </Button>
          </div>
        </DialogHeader>
        
        <div className="p-6">
          <MeetingSummaryComponent 
            meeting={meeting}
            summary={summary}
            decisions={decisions}
            actionItems={actionItems}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
