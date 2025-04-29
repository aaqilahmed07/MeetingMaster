import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

export default function QuickStats() {
  const { data: meetings = [] } = useQuery({
    queryKey: ['/api/meetings'],
    staleTime: 60000, // 1 minute
  });

  const { data: actionItems = [] } = useQuery({
    queryKey: ['/api/action-items'],
    staleTime: 60000, // 1 minute
  });

  const { data: decisions = [] } = useQuery({
    queryKey: ['/api/decisions'],
    staleTime: 60000, // 1 minute
  });

  // Calculate stats
  const totalMeetings = meetings.length;
  const openActions = actionItems.filter(item => item.status !== 'Completed').length;
  const dueToday = actionItems.filter(item => {
    const today = new Date().toISOString().split('T')[0];
    return item.deadline === today && item.status !== 'Completed';
  }).length;
  const totalDecisions = decisions.length;
  const decisionsThisWeek = decisions.filter(decision => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return new Date(decision.createdAt) > oneWeekAgo;
  }).length;

  // Calculate time saved (simplified metric - 30 minutes per meeting)
  const timeSaved = totalMeetings * 30; // in minutes
  const timeSavedHours = Math.floor(timeSaved / 60);
  const timeSavedLastMonth = Math.floor(timeSaved * 0.25);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Meetings */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Meetings</p>
              <p className="text-2xl font-semibold text-gray-800 mt-1">{totalMeetings}</p>
            </div>
            <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center text-primary-500">
              <i className="ri-vidicon-line text-xl"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-500">
            <i className="ri-arrow-up-line mr-1"></i>
            <span>12% from last month</span>
          </div>
        </CardContent>
      </Card>

      {/* Open Action Items */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Open Actions</p>
              <p className="text-2xl font-semibold text-gray-800 mt-1">{openActions}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
              <i className="ri-task-line text-xl"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-amber-500">
            <i className="ri-time-line mr-1"></i>
            <span>{dueToday} due today</span>
          </div>
        </CardContent>
      </Card>

      {/* Decisions Made */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Decisions Made</p>
              <p className="text-2xl font-semibold text-gray-800 mt-1">{totalDecisions}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-500">
              <i className="ri-git-commit-line text-xl"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-500">
            <i className="ri-arrow-up-line mr-1"></i>
            <span>{decisionsThisWeek} this week</span>
          </div>
        </CardContent>
      </Card>

      {/* Time Saved */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Time Saved</p>
              <p className="text-2xl font-semibold text-gray-800 mt-1">{timeSavedHours}h</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-primary-500">
              <i className="ri-time-line text-xl"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-primary-500">
            <i className="ri-arrow-up-line mr-1"></i>
            <span>{Math.floor(timeSavedLastMonth / 60)}h from last month</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
