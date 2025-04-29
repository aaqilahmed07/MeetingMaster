import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Loader2, User } from "lucide-react";

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();

  // Get the current page title based on the path
  const getTitle = () => {
    switch (location) {
      case "/app":
        return "Dashboard";
      case "/app/meetings":
        return "Meetings";
      case "/app/action-items":
        return "Action Items";
      case "/app/decisions":
        return "Decisions";
      case "/app/summaries":
        return "Meeting Summaries";
      case "/app/upload-recordings":
        return "Upload Recordings";
      case "/app/slack-integration":
        return "Slack Integration";
      default:
        return "Dashboard";
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate("/landing");
      }
    });
  };

  return (
    <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="mr-2 text-gray-600 md:hidden"
          aria-label="Toggle sidebar"
        >
          <i className="ri-menu-line text-xl"></i>
        </button>
        <h2 className="text-lg font-medium text-gray-800">{getTitle()}</h2>
      </div>
      <div className="flex items-center space-x-4">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-medium">
                  {user.fullName?.charAt(0) || user.username?.charAt(0) || 'U'}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-normal">
                  <div className="font-medium">{user.fullName || user.username}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="text-red-600 focus:text-red-600"
              >
                {logoutMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Logging out...</span>
                  </>
                ) : (
                  <>
                    <i className="ri-logout-box-line mr-2"></i>
                    <span>Logout</span>
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
