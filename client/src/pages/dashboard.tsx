import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import StatsGrid from "@/components/stats-grid";
import ScreensList from "@/components/screens-list";
import AIInsights from "@/components/ai-insights";
import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Organization</span>
              <span>•</span>
              <span data-testid="text-organization-name">Acme Corp</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/screens">
              <Button className="bg-primary text-primary-foreground hover:opacity-90" data-testid="button-add-screen">
                <Plus className="w-4 h-4 mr-2" />
                Add Screen
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
            </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Stats Grid */}
          <div className="mb-8">
            <StatsGrid />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Screens List */}
            <div className="lg:col-span-2">
              <ScreensList />
            </div>

            {/* AI Insights */}
            <div>
              <AIInsights />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
