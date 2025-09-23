import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Upload, Images, Search, Filter, Eye, Download, Trash2 } from "lucide-react";

interface Media {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  tags: string[];
  aiTags?: {
    tags: string[];
    confidence: number;
  };
  createdAt: string;
}

export default function MediaLibrary() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  const { data: media, isLoading: mediaLoading } = useQuery<Media[]>({
    queryKey: ['/api/media'],
    retry: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/media'] });
      toast({
        title: "Success",
        description: "Media uploaded successfully",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
        description: "Failed to upload media",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const filteredMedia = media?.filter(item => 
    item.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.aiTags?.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  const isVideoFile = (mimeType: string) => {
    return mimeType.startsWith('video/');
  };

  const getFileTypeIcon = (mimeType: string) => {
    if (isImageFile(mimeType)) return '🖼️';
    if (isVideoFile(mimeType)) return '🎥';
    return '📄';
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
            <h2 className="text-2xl font-semibold text-foreground">Media Library</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your digital content and assets
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search media..."
                className="pl-9 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-media"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              data-testid="button-upload-media"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept="image/*,video/*,.pdf"
              className="hidden"
            />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {mediaLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted rounded-lg mb-2"></div>
                  <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredMedia && filteredMedia.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredMedia.map((item) => (
                <div
                  key={item.id}
                  className="relative group cursor-pointer hover-lift"
                  onClick={() => {
                    setSelectedMedia(item);
                    setIsPreviewOpen(true);
                  }}
                  data-testid={`media-item-${item.id}`}
                >
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                    {isImageFile(item.mimeType) ? (
                      <img
                        src={item.url}
                        alt={item.originalName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f3f4f6'/><text x='50' y='50' text-anchor='middle' dy='0.3em' fill='%236b7280'>📁</text></svg>`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        {getFileTypeIcon(item.mimeType)}
                      </div>
                    )}
                  </div>
                  
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" className="bg-card text-foreground">
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground truncate" data-testid={`text-media-name-${item.id}`}>
                      {item.originalName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(item.size)}
                    </p>
                    {(item.tags.length > 0 || (item.aiTags?.tags && item.aiTags.tags.length > 0)) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5">
                            {tag}
                          </Badge>
                        ))}
                        {item.aiTags?.tags?.slice(0, 2).map((tag, index) => (
                          <Badge key={`ai-${index}`} className="text-xs px-1.5 py-0.5 bg-primary text-primary-foreground">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Images className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No media files yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Upload your first image, video, or document to get started with your digital signage content.
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-primary text-primary-foreground"
                data-testid="button-upload-first-media"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First File
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMedia?.originalName}
            </DialogTitle>
          </DialogHeader>
          {selectedMedia && (
            <div className="space-y-4">
              <div className="text-center">
                {isImageFile(selectedMedia.mimeType) ? (
                  <img
                    src={selectedMedia.url}
                    alt={selectedMedia.originalName}
                    className="max-w-full max-h-96 mx-auto rounded-lg"
                  />
                ) : isVideoFile(selectedMedia.mimeType) ? (
                  <video
                    src={selectedMedia.url}
                    controls
                    className="max-w-full max-h-96 mx-auto rounded-lg"
                  />
                ) : (
                  <div className="w-32 h-32 bg-muted rounded-lg mx-auto flex items-center justify-center text-4xl">
                    {getFileTypeIcon(selectedMedia.mimeType)}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-foreground mb-2">File Details</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Size:</span> {formatFileSize(selectedMedia.size)}</p>
                    <p><span className="text-muted-foreground">Type:</span> {selectedMedia.mimeType}</p>
                    <p><span className="text-muted-foreground">Uploaded:</span> {new Date(selectedMedia.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-foreground mb-2">Tags</h4>
                  <div className="space-y-2">
                    {selectedMedia.tags.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Manual Tags</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedMedia.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedMedia.aiTags?.tags && selectedMedia.aiTags.tags.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">AI Tags</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedMedia.aiTags.tags.map((tag, index) => (
                            <Badge key={index} className="text-xs bg-primary text-primary-foreground">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <div className="space-x-2">
                  <Button variant="outline" size="sm" data-testid="button-download-media">
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
                <Button variant="destructive" size="sm" data-testid="button-delete-media">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
