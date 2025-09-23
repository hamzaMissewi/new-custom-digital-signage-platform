import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import MediaGrid from "./media-grid";
import { Bot, Clock, Lightbulb, Trash2, GripVertical } from "lucide-react";

const playlistSchema = z.object({
  name: z.string().min(1, "Playlist name is required"),
  description: z.string().optional(),
});

type PlaylistFormData = z.infer<typeof playlistSchema>;

interface PlaylistItem {
  id: string;
  order: number;
  duration: number;
  media: {
    id: string;
    originalName: string;
    url: string;
    mimeType: string;
  };
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  items?: PlaylistItem[];
}

interface Media {
  id: string;
  originalName: string;
  url: string;
  mimeType: string;
}

interface AIPlaylistSuggestion {
  name: string;
  description: string;
  reasoning: string;
  suggestedItems: {
    mediaType: string;
    duration: number;
    reasoning: string;
  }[];
}

interface PlaylistFormProps {
  playlist?: Playlist;
  onSuccess: () => void;
}

export default function PlaylistForm({ playlist, onSuccess }: PlaylistFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<{media: Media, duration: number}[]>([]);
  const [showMediaGrid, setShowMediaGrid] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIPlaylistSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const form = useForm<PlaylistFormData>({
    resolver: zodResolver(playlistSchema),
    defaultValues: {
      name: playlist?.name || "",
      description: playlist?.description || "",
    },
  });

  // Load existing playlist items if editing
  useEffect(() => {
    if (playlist?.items) {
      setSelectedItems(playlist.items.map(item => ({
        media: item.media,
        duration: item.duration,
      })));
    }
  }, [playlist]);

  const createPlaylistMutation = useMutation({
    mutationFn: async (data: PlaylistFormData) => {
      const response = await apiRequest("POST", "/api/playlists", data);
      return response;
    },
    onSuccess: async (response) => {
      const newPlaylist = await response.json();
      
      // Add items to playlist
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        await apiRequest("POST", `/api/playlists/${newPlaylist.id}/items`, {
          mediaId: item.media.id,
          order: i,
          duration: item.duration,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['/api/playlists'] });
      toast({
        title: "Success",
        description: "Playlist created successfully",
      });
      onSuccess();
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
        description: "Failed to create playlist",
        variant: "destructive",
      });
    },
  });

  const getAISuggestionsMutation = useMutation({
    mutationFn: async (context: { timeOfDay: string; audienceType: string }) => {
      const response = await apiRequest("POST", "/api/ai/suggestions", {
        context: form.getValues("name") || "General playlist",
        timeOfDay: context.timeOfDay,
        audienceType: context.audienceType,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setAiSuggestions(data.suggestions || []);
      setIsLoadingSuggestions(false);
    },
    onError: (error) => {
      setIsLoadingSuggestions(false);
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
        description: "Failed to get AI suggestions",
        variant: "destructive",
      });
    },
  });

  const handleMediaSelect = (media: Media) => {
    setSelectedItems(prev => {
      if (prev.some(item => item.media.id === media.id)) {
        return prev;
      }
      return [...prev, { media, duration: 10 }];
    });
    setShowMediaGrid(false);
  };

  const removeItem = (mediaId: string) => {
    setSelectedItems(prev => prev.filter(item => item.media.id !== mediaId));
  };

  const updateItemDuration = (mediaId: string, duration: number) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.media.id === mediaId ? { ...item, duration } : item
      )
    );
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    setSelectedItems(prev => {
      const items = [...prev];
      const [removed] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, removed);
      return items;
    });
  };

  const getAISuggestions = (timeOfDay: string = "morning", audienceType: string = "general") => {
    setIsLoadingSuggestions(true);
    getAISuggestionsMutation.mutate({ timeOfDay, audienceType });
  };

  const applySuggestion = (suggestion: AIPlaylistSuggestion) => {
    form.setValue("name", suggestion.name);
    form.setValue("description", suggestion.description);
    toast({
      title: "Suggestion Applied",
      description: "You can now add media items to match the suggested playlist structure",
    });
  };

  const onSubmit = (data: PlaylistFormData) => {
    if (selectedItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one media item to the playlist",
        variant: "destructive",
      });
      return;
    }
    
    createPlaylistMutation.mutate(data);
  };

  const totalDuration = selectedItems.reduce((sum, item) => sum + item.duration, 0);
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Playlist Form */}
        <div className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Playlist Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter playlist name..." 
                        {...field}
                        data-testid="input-playlist-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your playlist..."
                        rows={3}
                        {...field}
                        data-testid="input-playlist-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-foreground">Playlist Items ({selectedItems.length})</h4>
                  <div className="text-sm text-muted-foreground">
                    Total: {formatDuration(totalDuration)}
                  </div>
                </div>

                {selectedItems.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {selectedItems.map((item, index) => (
                      <div key={item.media.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                        <div className="w-12 h-8 bg-background rounded flex items-center justify-center text-xs">
                          {item.media.mimeType.startsWith('image/') ? '🖼️' : '🎥'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.media.originalName}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <Input
                              type="number"
                              value={item.duration}
                              onChange={(e) => updateItemDuration(item.media.id, parseInt(e.target.value) || 10)}
                              className="w-16 h-6 text-xs"
                              min={1}
                              max={300}
                            />
                            <span className="text-xs text-muted-foreground">seconds</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.media.id)}
                          data-testid={`button-remove-item-${item.media.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground">No media items added yet</p>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMediaGrid(!showMediaGrid)}
                  className="w-full mb-6"
                  data-testid="button-add-media"
                >
                  {showMediaGrid ? "Hide Media Library" : "Add Media Items"}
                </Button>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="submit"
                    disabled={createPlaylistMutation.isPending || selectedItems.length === 0}
                    data-testid="button-create-playlist"
                  >
                    {createPlaylistMutation.isPending 
                      ? "Creating..." 
                      : playlist 
                        ? "Update Playlist" 
                        : "Create Playlist"
                    }
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>

        {/* AI Recommendations */}
        <div>
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="w-5 h-5 text-primary mr-2" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Get intelligent playlist suggestions based on time and audience.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => getAISuggestions("morning", "business")}
                  disabled={isLoadingSuggestions}
                  data-testid="button-ai-morning"
                >
                  Morning Business
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => getAISuggestions("afternoon", "general")}
                  disabled={isLoadingSuggestions}
                  data-testid="button-ai-afternoon"
                >
                  Afternoon General
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => getAISuggestions("evening", "retail")}
                  disabled={isLoadingSuggestions}
                  data-testid="button-ai-evening"
                >
                  Evening Retail
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => getAISuggestions("lunch", "cafeteria")}
                  disabled={isLoadingSuggestions}
                  data-testid="button-ai-lunch"
                >
                  Lunch Break
                </Button>
              </div>

              {isLoadingSuggestions && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Generating suggestions...</p>
                </div>
              )}

              {aiSuggestions.length > 0 && (
                <div className="space-y-3">
                  {aiSuggestions.map((suggestion, index) => (
                    <div key={index} className="p-3 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/20">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <Lightbulb className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h5 className="text-sm font-medium text-foreground">{suggestion.name}</h5>
                          <p className="text-xs text-muted-foreground mt-1 mb-2">
                            {suggestion.description}
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            {suggestion.reasoning}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => applySuggestion(suggestion)}
                            className="text-primary hover:text-primary/80 p-0 h-auto font-medium"
                            data-testid={`button-apply-suggestion-${index}`}
                          >
                            Use This Template
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Media Selection Grid */}
      {showMediaGrid && (
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Select Media Items</CardTitle>
          </CardHeader>
          <CardContent>
            <MediaGrid onMediaSelect={handleMediaSelect} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
