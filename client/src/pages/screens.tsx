import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Monitor, Plus, Settings, Eye } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const screenSchema = z.object({
  name: z.string().min(1, "Screen name is required"),
  location: z.string().optional(),
});

type ScreenFormData = z.infer<typeof screenSchema>;

interface Screen {
  id: string;
  name: string;
  location: string;
  deviceKey: string;
  isOnline: boolean;
  lastSeen: string;
  currentPlaylistId?: string;
}

export default function Screens() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const { data: screens, isLoading: screensLoading } = useQuery<Screen[]>({
    queryKey: ['/api/screens'],
    retry: false,
  });

  const form = useForm<ScreenFormData>({
    resolver: zodResolver(screenSchema),
    defaultValues: {
      name: "",
      location: "",
    },
  });

  const createScreenMutation = useMutation({
    mutationFn: async (data: ScreenFormData) => {
      await apiRequest("POST", "/api/screens", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screens'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Screen created successfully",
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
        description: "Failed to create screen",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ScreenFormData) => {
    createScreenMutation.mutate(data);
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
            <h2 className="text-2xl font-semibold text-foreground">Screens</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your digital signage displays
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:opacity-90" data-testid="button-add-screen">
                <Plus className="w-4 h-4 mr-2" />
                Add Screen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Screen</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Screen Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Main Lobby Display" 
                            {...field}
                            data-testid="input-screen-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g., Building A - Main Lobby"
                            {...field}
                            data-testid="input-screen-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel-screen"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createScreenMutation.isPending}
                      data-testid="button-create-screen"
                    >
                      {createScreenMutation.isPending ? "Creating..." : "Create Screen"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {screensLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="card-shadow">
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="h-6 bg-muted rounded w-32"></div>
                        <div className="h-6 w-16 bg-muted rounded-full"></div>
                      </div>
                      <div className="h-4 bg-muted rounded w-24"></div>
                      <div className="h-8 bg-muted rounded w-20"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : screens && screens.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {screens.map((screen) => (
                <Card key={screen.id} className="card-shadow hover-lift transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <Monitor className="w-5 h-5 text-primary" />
                        <span data-testid={`text-screen-name-${screen.id}`}>{screen.name}</span>
                      </CardTitle>
                      <Badge 
                        variant={screen.isOnline ? "default" : "secondary"}
                        className={screen.isOnline ? "bg-accent text-accent-foreground" : ""}
                        data-testid={`badge-screen-status-${screen.id}`}
                      >
                        {screen.isOnline ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-screen-location-${screen.id}`}>
                          {screen.location || 'No location specified'}
                        </p>
                        <div className="mt-2 flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            screen.isOnline ? "status-online" : "status-offline"
                          }`}></div>
                          <p className="text-xs text-muted-foreground">
                            {screen.isOnline 
                              ? "Connected" 
                              : screen.lastSeen 
                                ? `Last seen ${new Date(screen.lastSeen).toLocaleDateString()}`
                                : "Never connected"
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Device Key</p>
                        <code className="text-xs font-mono bg-background px-2 py-1 rounded" data-testid={`text-device-key-${screen.id}`}>
                          {screen.deviceKey}
                        </code>
                      </div>

                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          data-testid={`button-view-screen-${screen.id}`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          data-testid={`button-settings-screen-${screen.id}`}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Monitor className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No screens yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Get started by adding your first digital signage screen. You'll receive a device key to connect your display.
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground" data-testid="button-add-first-screen">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Screen
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
