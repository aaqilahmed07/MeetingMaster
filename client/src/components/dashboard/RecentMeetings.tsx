import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getAvatarColor, getInitials, formatDate } from "@/lib/document";
import { downloadMeetingSummary } from "@/lib/document";
import { useState } from "react";
import SummaryModal from "@/components/meetings/SummaryModal";
import { Meeting } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function RecentMeetings() {
  const { data: meetings = [] } = useQuery({
    queryKey: ['/api/meetings'],
  });

  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleViewSummary = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setIsModalOpen(true);
  };

  const handleDownload = async (meeting: Meeting) => {
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

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Recent Meetings</h3>
        <Link href="/meetings" className="text-sm font-medium text-primary-600 hover:text-primary-700">
          View all
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meeting</th>
              <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {meetings.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No meetings found
                </td>
              </tr>
            ) : (
              meetings.slice(0, 3).map((meeting) => (
                <tr key={meeting.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <i className="ri-vidicon-line text-primary-600"></i>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{meeting.title}</div>
                        <div className="text-sm text-gray-500">{meeting.location}</div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(meeting.date)}
                  </td>
                  <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {meeting.duration}
                  </td>
                  <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex -space-x-2 overflow-hidden">
                      {meeting.participants.slice(0, 3).map((participant, index) => (
                        <div 
                          key={index} 
                          className={`inline-block h-6 w-6 rounded-full ${getAvatarColor(participant)} flex items-center justify-center text-xs`}
                        >
                          {getInitials(participant)}
                        </div>
                      ))}
                      {meeting.participants.length > 3 && (
                        <div className="inline-block h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                          +{meeting.participants.length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        className="text-primary-600 hover:text-primary-900"
                        onClick={() => handleViewSummary(meeting)}
                      >
                        <i className="ri-file-text-line"></i>
                      </button>
                      <button 
                        className="text-primary-600 hover:text-primary-900"
                        onClick={() => handleDownload(meeting)}
                      >
                        <i className="ri-download-line"></i>
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <i className="ri-more-2-fill"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
