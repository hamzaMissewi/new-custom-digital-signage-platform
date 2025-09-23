import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Monitor, Images, List, TrendingUp } from "lucide-react";

interface Stats {
  activeScreens: number;
  mediaAssets: number;
  activePlaylists: number;
  recentActivity: any[];
}

export default function StatsGrid() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['/api/stats'],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="card-shadow">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-8 bg-muted rounded w-16"></div>
                  </div>
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                </div>
                <div className="h-4 bg-muted rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      title: "Active Screens",
      value: stats?.activeScreens || 0,
      change: "+2 from last week",
      changeType: "positive",
      icon: Monitor,
      color: "accent",
    },
    {
      title: "Media Assets",
      value: stats?.mediaAssets || 0,
      change: "89% auto-tagged",
      changeType: "neutral",
      icon: Images,
      color: "primary",
    },
    {
      title: "Active Playlists",
      value: stats?.activePlaylists || 0,
      change: "8 AI-optimized",
      changeType: "neutral",
      icon: List,
      color: "accent",
    },
    {
      title: "Uptime",
      value: "99.8%",
      change: "All systems operational",
      changeType: "positive",
      icon: TrendingUp,
      color: "accent",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="card-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-semibold text-foreground" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 bg-${stat.color}/10 rounded-full flex items-center justify-center`}>
                  <Icon className={`text-${stat.color} text-xl w-6 h-6`} />
                </div>
              </div>
              <p className={`text-sm mt-2 ${
                stat.changeType === 'positive' 
                  ? 'text-accent' 
                  : stat.changeType === 'negative' 
                  ? 'text-destructive' 
                  : 'text-muted-foreground'
              }`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
