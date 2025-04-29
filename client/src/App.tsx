import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Meetings from "@/pages/meetings";
import ActionItems from "@/pages/action-items";
import Decisions from "@/pages/decisions";
import Summaries from "@/pages/summaries";
import SlackIntegration from "@/pages/slack-integration";
import UploadRecordings from "@/pages/upload-recordings";
import AuthPage from "@/pages/auth-page";
import LandingPage from "@/pages/landing-page";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { useState, useEffect } from "react";
import { cn } from "./lib/utils";
import { Loader2 } from "lucide-react";

// Layout component that wraps all app pages with sidebar and header
function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const [_, navigate] = useLocation();
  
  // Redirect to auth page if user is not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }
  
  if (!user) {
    return null; // Will be redirected by the useEffect hook
  }
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <main className="flex-1 overflow-y-auto">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Always show landing page at root URL for non-logged in users
  if (location === "/" && !isLoading) {
    return <Redirect to={user ? "/app" : "/landing"} />;
  }
  
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/landing" component={LandingPage} />
      <Route path="/auth">
        {() => {
          // If user is already logged in, redirect to app
          if (user && !isLoading) {
            return <Redirect to="/app" />;
          }
          return <AuthPage />;
        }}
      </Route>
      
      {/* App routes - all protected and wrapped in AppLayout */}
      <Route path="/app">
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>
      
      <Route path="/app/meetings">
        <AppLayout>
          <Meetings />
        </AppLayout>
      </Route>
      
      <Route path="/app/action-items">
        <AppLayout>
          <ActionItems />
        </AppLayout>
      </Route>
      
      <Route path="/app/decisions">
        <AppLayout>
          <Decisions />
        </AppLayout>
      </Route>
      
      <Route path="/app/summaries">
        <AppLayout>
          <Summaries />
        </AppLayout>
      </Route>
      
      <Route path="/app/upload-recordings">
        <AppLayout>
          <UploadRecordings />
        </AppLayout>
      </Route>
      
      <Route path="/app/slack-integration">
        <AppLayout>
          <SlackIntegration />
        </AppLayout>
      </Route>
      
      {/* Catch-all route */}
      <Route path="/:rest*">
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="theme">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
