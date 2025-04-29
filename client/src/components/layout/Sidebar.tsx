import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();

  const routes = [
    {
      name: "Dashboard",
      path: "/app",
      icon: "ri-dashboard-line",
    },
    {
      name: "Meetings",
      path: "/app/meetings",
      icon: "ri-video-chat-line",
    },
    {
      name: "Upload Recordings",
      path: "/app/upload-recordings",
      icon: "ri-upload-cloud-line",
    },
    {
      name: "Action Items",
      path: "/app/action-items",
      icon: "ri-task-line",
    },
    {
      name: "Decisions",
      path: "/app/decisions",
      icon: "ri-git-commit-line",
    },
    {
      name: "Summaries",
      path: "/app/summaries",
      icon: "ri-file-text-line",
    },
    {
      name: "Slack Integration",
      path: "/app/slack-integration",
      icon: "ri-slack-line",
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "w-full md:w-64 bg-white border-r border-gray-200 md:h-screen transition-all duration-300 ease-in-out",
          open
            ? "fixed inset-0 z-50 md:relative md:z-0"
            : "fixed -left-full md:left-0 md:relative"
        )}
      >
        {/* Logo Section */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center">
            <i className="ri-pulse-line text-primary-500 text-2xl mr-2"></i>
            <h1 className="text-xl font-semibold text-gray-900">Meeting Memory</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">by Aaqil Ahmed</p>
        </div>

        {/* Mobile close button */}
        <button
          className="md:hidden absolute top-4 right-4 text-gray-500"
          onClick={() => setOpen(false)}
        >
          <i className="ri-close-line text-xl"></i>
        </button>

        {/* Main Navigation */}
        <nav className="p-4">
          <ul>
            {routes.map((route) => (
              <li key={route.path} className="mb-1">
                <Link
                  href={route.path}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors",
                    (location === route.path || 
                     (route.path === "/app" && location === "/app/")) &&
                      "bg-primary-50 text-primary-600"
                  )}
                >
                  <i className={`${route.icon} mr-3 text-lg`}></i>
                  <span>{route.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 w-full border-t border-gray-200 p-4 md:block hidden">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
              A
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">Aaqil Ahmed</p>
              <p className="text-xs text-gray-500">admin@meetingmemory.com</p>
            </div>
            <button className="ml-auto text-gray-400 hover:text-gray-500">
              <i className="ri-settings-4-line"></i>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
