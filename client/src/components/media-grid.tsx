import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Eye, Plus } from "lucide-react";

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

interface MediaGridProps {
  onMediaSelect?: (media: Media) => void;
  selectedMedia?: string[];
  multiSelect?: boolean;
  className?: string;
}

export default function MediaGrid({ 
  onMediaSelect, 
  selectedMedia = [], 
  multiSelect = false,
  className = ""
}: MediaGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedForPreview, setSelectedForPreview] = useState<Media | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { data: media, isLoading } = useQuery<Media[]>({
    queryKey: ['/api/media'],
  });

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

  const handleMediaClick = (mediaItem: Media) => {
    if (onMediaSelect) {
      onMediaSelect(mediaItem);
    } else {
      setSelectedForPreview(mediaItem);
      setIsPreviewOpen(true);
    }
  };

  const isSelected = (mediaId: string) => {
    return selectedMedia.includes(mediaId);
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search media..."
            className="pl-9"
            disabled
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-muted rounded-lg mb-2"></div>
              <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search media..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="input-search-media"
        />
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredMedia && filteredMedia.length > 0 ? (
          filteredMedia.map((item) => (
            <div
              key={item.id}
              className={`relative group cursor-pointer hover-lift transition-all ${
                isSelected(item.id) ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleMediaClick(item)}
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
                  {onMediaSelect ? (
                    <Button size="sm" className="bg-card text-foreground">
                      <Plus className="w-4 h-4 mr-1" />
                      Select
                    </Button>
                  ) : (
                    <Button size="sm" className="bg-card text-foreground">
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                  )}
                </div>
              </div>

              {isSelected(item.id) && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs text-primary-foreground">✓</span>
                </div>
              )}

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
          ))
        ) : (
          <div className="col-span-full text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-lg mx-auto mb-4 flex items-center justify-center text-2xl">
              📁
            </div>
            <p className="text-muted-foreground">No media files found</p>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedForPreview?.originalName}
            </DialogTitle>
          </DialogHeader>
          {selectedForPreview && (
            <div className="space-y-4">
              <div className="text-center">
                {isImageFile(selectedForPreview.mimeType) ? (
                  <img
                    src={selectedForPreview.url}
                    alt={selectedForPreview.originalName}
                    className="max-w-full max-h-96 mx-auto rounded-lg"
                  />
                ) : isVideoFile(selectedForPreview.mimeType) ? (
                  <video
                    src={selectedForPreview.url}
                    controls
                    className="max-w-full max-h-96 mx-auto rounded-lg"
                  />
                ) : (
                  <div className="w-32 h-32 bg-muted rounded-lg mx-auto flex items-center justify-center text-4xl">
                    {getFileTypeIcon(selectedForPreview.mimeType)}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-foreground mb-2">File Details</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Size:</span> {formatFileSize(selectedForPreview.size)}</p>
                    <p><span className="text-muted-foreground">Type:</span> {selectedForPreview.mimeType}</p>
                    <p><span className="text-muted-foreground">Uploaded:</span> {new Date(selectedForPreview.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-foreground mb-2">Tags</h4>
                  <div className="space-y-2">
                    {selectedForPreview.tags.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Manual Tags</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedForPreview.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedForPreview.aiTags?.tags && selectedForPreview.aiTags.tags.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">AI Tags</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedForPreview.aiTags.tags.map((tag, index) => (
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
