import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Bot, Lightbulb, Clock, Activity } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  metadata: any;
  createdAt: string;
}

export default function AIInsights() {
  const { data: stats } = useQuery<{ recentActivity: AuditLog[] }>({
    queryKey: ['/api/stats'],
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'upload':
      case 'create':
        return '🟢';
      case 'update':
        return '🔵';
      case 'broadcast':
        return '📡';
      default:
        return '⚪';
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bot className="w-5 h-5 text-primary mr-2" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Optimal Schedule Detected</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Peak audience engagement expected at 11:30 AM and 3:00 PM today.
                </p>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-primary hover:text-primary/80 p-0 h-auto font-medium"
                  data-testid="button-apply-schedule-suggestion"
                >
                  Apply Suggestion
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-accent/10 to-primary/10 rounded-lg border border-accent/20">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Content Performance</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  "Welcome Banner v2" shows 34% higher engagement than v1.
                </p>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-accent hover:text-accent/80 p-0 h-auto font-medium"
                  data-testid="button-update-playlist-suggestion"
                >
                  Update Playlist
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground" data-testid={`activity-${activity.id}`}>
                      {activity.action === 'upload' && 'New media uploaded: '}
                      {activity.action === 'create' && `New ${activity.entityType} created: `}
                      {activity.action === 'broadcast' && 'Playlist pushed to screens: '}
                      {activity.action === 'update' && `${activity.entityType} updated: `}
                      <span className="font-medium">
                        {activity.metadata?.name || activity.metadata?.filename || 'Unknown'}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
