import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Monitor } from "lucide-react";
import { Link } from "wouter";

interface Screen {
  id: string;
  name: string;
  location: string;
  deviceKey: string;
  isOnline: boolean;
  lastSeen: string;
  currentPlaylistId?: string;
}

export default function ScreensList() {
  const { data: screens, isLoading } = useQuery<Screen[]>({
    queryKey: ['/api/screens'],
  });

  if (isLoading) {
    return (
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Connected Screens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-8 bg-muted rounded"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-32"></div>
                      <div className="h-3 bg-muted rounded w-24"></div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-6 w-16 bg-muted rounded-full"></div>
                    <div className="w-3 h-3 bg-muted rounded-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Connected Screens</CardTitle>
          <Link href="/screens">
            <Button variant="ghost" size="sm" data-testid="button-view-all-screens">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {screens && screens.length > 0 ? (
            screens.slice(0, 4).map((screen) => (
              <div
                key={screen.id}
                className="flex items-center justify-between p-4 bg-secondary rounded-lg hover-lift cursor-pointer transition-all"
                data-testid={`screen-item-${screen.id}`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-8 bg-muted rounded border-2 border-border flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground" data-testid={`text-screen-name-${screen.id}`}>
                      {screen.name}
                    </h4>
                    <p className="text-sm text-muted-foreground" data-testid={`text-screen-location-${screen.id}`}>
                      {screen.location || 'No location specified'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge 
                    variant={screen.isOnline ? "default" : "secondary"}
                    className={screen.isOnline ? "bg-accent text-accent-foreground" : ""}
                    data-testid={`badge-screen-status-${screen.id}`}
                  >
                    {screen.isOnline ? "Online" : "Offline"}
                  </Badge>
                  <div className={`w-3 h-3 rounded-full ${
                    screen.isOnline ? "status-online" : "status-offline"
                  }`}></div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No screens connected yet</p>
              <Link href="/screens">
                <Button className="mt-4" data-testid="button-add-first-screen">
                  Add Your First Screen
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
