import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import PlaylistForm from "@/components/playlist-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { List, Plus, Search, Play, Edit, Trash2, Monitor, Clock } from "lucide-react";
import { Link } from "wouter";

interface Playlist {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  items?: {
    id: string;
    order: number;
    duration: number;
    media: {
      id: string;
      originalName: string;
      url: string;
      mimeType: string;
    };
  }[];
}

interface Screen {
  id: string;
  name: string;
  deviceKey: string;
  isOnline: boolean;
}

export default function Playlists() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);

  // Redirect if not authenticated
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

  const { data: playlists, isLoading: playlistsLoading } = useQuery<Playlist[]>({
    queryKey: ['/api/playlists'],
    retry: false,
  });

  const { data: screens } = useQuery<Screen[]>({
    queryKey: ['/api/screens'],
    retry: false,
  });

  const broadcastMutation = useMutation({
    mutationFn: async (data: { playlistId: string; screenIds: string[] }) => {
      await apiRequest("POST", "/api/broadcasts", data);
    },
    onSuccess: () => {
      setIsBroadcastOpen(false);
      setSelectedScreens([]);
      toast({
        title: "Success",
        description: "Playlist broadcast successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to broadcast playlist",
        variant: "destructive",
      });
    },
  });

  const filteredPlaylists = playlists?.filter(playlist => 
    playlist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    playlist.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePlaylistCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/playlists'] });
    setIsFormOpen(false);
  };

  const handleBroadcast = () => {
    if (selectedPlaylist && selectedScreens.length > 0) {
      broadcastMutation.mutate({
        playlistId: selectedPlaylist.id,
        screenIds: selectedScreens,
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Playlists</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage content playlists for your screens
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search playlists..."
                className="pl-9 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-playlists"
              />
            </div>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-primary text-primary-foreground hover:opacity-90"
              data-testid="button-create-playlist"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Playlist
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {playlistsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="card-shadow">
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="h-6 bg-muted rounded w-32"></div>
                        <div className="h-6 w-16 bg-muted rounded-full"></div>
                      </div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                      <div className="flex space-x-2 pt-2">
                        <div className="h-8 bg-muted rounded w-20"></div>
                        <div className="h-8 bg-muted rounded w-20"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPlaylists && filteredPlaylists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlaylists.map((playlist) => (
                <Card key={playlist.id} className="card-shadow hover-lift transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <List className="w-5 h-5 text-primary" />
                        <span data-testid={`text-playlist-name-${playlist.id}`}>{playlist.name}</span>
                      </CardTitle>
                      <Badge 
                        variant={playlist.isActive ? "default" : "secondary"}
                        className={playlist.isActive ? "bg-accent text-accent-foreground" : ""}
                        data-testid={`badge-playlist-status-${playlist.id}`}
                      >
                        {playlist.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-playlist-description-${playlist.id}`}>
                          {playlist.description || 'No description provided'}
                        </p>
                        <div className="mt-2 flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{playlist.items?.length || 0} items</span>
                          </div>
                          <span>Created {new Date(playlist.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {playlist.items && playlist.items.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                          <div className="grid grid-cols-4 gap-1">
                            {playlist.items.slice(0, 4).map((item, index) => (
                              <div key={item.id} className="aspect-square bg-muted rounded text-xs flex items-center justify-center">
                                {item.media.mimeType.startsWith('image/') ? '🖼️' : '🎥'}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPlaylist(playlist);
                            setIsDetailsOpen(true);
                          }}
                          data-testid={`button-view-playlist-${playlist.id}`}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          className="bg-accent text-accent-foreground hover:opacity-90"
                          onClick={() => {
                            setSelectedPlaylist(playlist);
                            setIsBroadcastOpen(true);
                          }}
                          data-testid={`button-broadcast-playlist-${playlist.id}`}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Broadcast
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <List className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No playlists yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create your first playlist to organize and schedule content for your digital displays.
              </p>
              <Button
                onClick={() => setIsFormOpen(true)}
                className="bg-primary text-primary-foreground"
                data-testid="button-create-first-playlist"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Playlist
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Create Playlist Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
          </DialogHeader>
          <PlaylistForm onSuccess={handlePlaylistCreated} />
        </DialogContent>
      </Dialog>

      {/* Playlist Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPlaylist?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedPlaylist && (
            <PlaylistForm 
              playlist={selectedPlaylist}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/playlists'] });
                setIsDetailsOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Broadcast Dialog */}
      <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Broadcast Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select screens to broadcast "{selectedPlaylist?.name}" to:
            </p>
            <div className="space-y-2">
              {screens?.filter(screen => screen.isOnline).map((screen) => (
                <label key={screen.id} className="flex items-center space-x-3 p-2 hover:bg-muted rounded">
                  <input
                    type="checkbox"
                    checked={selectedScreens.includes(screen.deviceKey)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedScreens([...selectedScreens, screen.deviceKey]);
                      } else {
                        setSelectedScreens(selectedScreens.filter(id => id !== screen.deviceKey));
                      }
                    }}
                    className="rounded border-input text-primary focus:ring-ring"
                    data-testid={`checkbox-screen-${screen.id}`}
                  />
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{screen.name}</span>
                  <Badge className="bg-accent text-accent-foreground">Online</Badge>
                </label>
              ))}
            </div>
            {screens?.filter(screen => screen.isOnline).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No online screens available for broadcast
              </p>
            )}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsBroadcastOpen(false);
                  setSelectedScreens([]);
                }}
                data-testid="button-cancel-broadcast"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBroadcast}
                disabled={selectedScreens.length === 0 || broadcastMutation.isPending}
                className="bg-accent text-accent-foreground hover:opacity-90"
                data-testid="button-confirm-broadcast"
              >
                {broadcastMutation.isPending ? "Broadcasting..." : "Broadcast"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
