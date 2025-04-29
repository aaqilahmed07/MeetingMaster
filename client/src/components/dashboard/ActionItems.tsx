import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ActionItem } from "@shared/schema";
import { useState } from "react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { getPriorityClass } from "@/lib/document";
import { useToast } from "@/hooks/use-toast";

export default function ActionItems() {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const { data: actionItems = [] } = useQuery({
    queryKey: ['/api/action-items'],
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('PUT', `/api/action-items/${id}`, { status: 'Completed' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/action-items'] });
      toast({
        title: "Action item completed",
        description: "The action item has been marked as completed.",
        duration: 3000,
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "There was an error updating the action item.",
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const toggleItemSelection = (id: number) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const handleMarkComplete = (id: number) => {
    markCompleteMutation.mutate(id);
  };

  // Filter pending action items (not completed)
  const pendingItems = actionItems.filter((item: ActionItem) => item.status !== 'Completed')
    .sort((a: ActionItem, b: ActionItem) => {
      // Sort by priority (High > Medium > Low)
      const priorityOrder = { High: 0, Medium: 1, Low: 2 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Pending Action Items</h3>
        <Link href="/action-items" className="text-sm font-medium text-primary-600 hover:text-primary-700">
          View all
        </Link>
      </div>

      <div className="space-y-4">
        {pendingItems.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center text-gray-500">
            No pending action items
          </div>
        ) : (
          pendingItems.slice(0, 3).map((item: ActionItem) => (
            <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                  />
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{item.task}</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityClass(item.priority)}`}>
                      {item.priority}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center text-sm text-gray-500">
                    <span className="truncate">From: Meeting {item.meetingId}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <i className="ri-user-line mr-1 text-gray-400"></i>
                      <span>Assigned to: {item.assignee}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      <i className="ri-calendar-line mr-1 text-gray-400"></i>
                      <span>Due: {item.deadline}</span>
                    </div>
                  </div>
                  {selectedItems.has(item.id) && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => handleMarkComplete(item.id)}
                        className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded-md hover:bg-green-100"
                      >
                        Mark Complete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
