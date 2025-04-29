import { useQuery } from "@tanstack/react-query";
import { Meeting, MeetingSummary } from "@shared/schema";
import { useState } from "react";
import { downloadMeetingSummary } from "@/lib/document";
import SummaryModal from "@/components/meetings/SummaryModal";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function MeetingSummaryPreview() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const { toast } = useToast();

  const { data: meetings = [] } = useQuery({
    queryKey: ['/api/meetings'],
  });

  const { data: summaries = [] } = useQuery({
    queryKey: ['/api/meeting-summaries'],
  });

  // Get the most recent meeting with a summary
  const recentMeetingWithSummary = meetings.length > 0 && summaries.length > 0
    ? meetings.find(meeting => summaries.some(summary => summary.meetingId === meeting.id))
    : null;

  // Get the corresponding summary for the meeting
  const meetingSummary = recentMeetingWithSummary
    ? summaries.find(summary => summary.meetingId === recentMeetingWithSummary.id)
    : null;

  const handleViewFullSummary = () => {
    if (recentMeetingWithSummary) {
      setSelectedMeeting(recentMeetingWithSummary);
      setIsModalOpen(true);
    }
  };

  const handleDownload = async () => {
    if (recentMeetingWithSummary) {
      try {
        await downloadMeetingSummary(recentMeetingWithSummary.id);
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
    }
  };

  if (!recentMeetingWithSummary || !meetingSummary) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Meeting Summary Preview</h3>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm text-center text-gray-500">
          No meeting summaries available
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Meeting Summary Preview</h3>
        <button 
          className="inline-flex items-center px-3 py-1.5 border border-primary-600 text-xs font-medium rounded text-primary-600 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          onClick={handleDownload}
        >
          <i className="ri-download-line mr-1"></i>
          Download as Word
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="border-b border-gray-200 pb-4 mb-4">
          <h4 className="text-xl font-medium text-gray-800">{recentMeetingWithSummary.title}</h4>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium text-gray-700">Date & Time:</span> {recentMeetingWithSummary.date}, {recentMeetingWithSummary.startTime} - {recentMeetingWithSummary.endTime}
            </div>
            <div>
              <span className="font-medium text-gray-700">Duration:</span> {recentMeetingWithSummary.duration}
            </div>
            <div>
              <span className="font-medium text-gray-700">Participants:</span> {recentMeetingWithSummary.participants.length} team members
            </div>
            <div>
              <span className="font-medium text-gray-700">Location:</span> {recentMeetingWithSummary.location}
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 uppercase tracking-wider mb-2">Executive Summary</h5>
          <p className="text-sm text-gray-600">{meetingSummary.executiveSummary}</p>
        </div>

        {/* Key Discussion Points Preview */}
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 uppercase tracking-wider mb-2">Key Discussion Points</h5>
          <ul className="text-sm text-gray-600 space-y-2">
            {meetingSummary.keyDiscussionPoints.slice(0, 3).map((point, index) => (
              <li key={index} className="flex items-start">
                <i className="ri-checkbox-circle-line text-primary-500 mt-0.5 mr-2"></i>
                <span>{point.topic}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* View Full Summary Button */}
        <div className="mt-6 text-center">
          <Button variant="default" onClick={handleViewFullSummary}>
            View Full Summary
          </Button>
        </div>
      </div>

      {isModalOpen && selectedMeeting && (
        <SummaryModal 
          meeting={selectedMeeting} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}
