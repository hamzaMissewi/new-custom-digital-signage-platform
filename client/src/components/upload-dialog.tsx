import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Check, AlertCircle, Image, Video, FileText } from "lucide-react";

interface UploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

export default function UploadDialog({ isOpen, onOpenChange }: UploadDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, updateProgress }: { file: File; updateProgress: (progress: number) => void }) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            updateProgress(progress);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });
        
        xhr.open('POST', '/api/media/upload');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.withCredentials = true;
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/media'] });
    },
  });

  const processFile = async (file: File) => {
    const fileId = Math.random().toString(36).substr(2, 9);
    
    // Add file to upload list
    setUploadFiles(prev => [...prev, {
      file,
      id: fileId,
      progress: 0,
      status: 'pending'
    }]);

    // Update status to uploading
    setUploadFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'uploading' as const } : f
    ));

    try {
      await uploadMutation.mutateAsync({
        file,
        updateProgress: (progress) => {
          setUploadFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, progress } : f
          ));
        }
      });

      // Mark as complete
      setUploadFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'complete', progress: 100 } : f
      ));

    } catch (error) {
      let errorMessage = 'Upload failed';
      
      if (isUnauthorizedError(error as Error)) {
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
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setUploadFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'error', error: errorMessage } : f
      ));
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach(file => {
      // Validate file type
      const allowedTypes = /\.(jpeg|jpg|png|gif|mp4|mov|avi|webm|pdf)$/i;
      if (!allowedTypes.test(file.name)) {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive",
        });
        return;
      }

      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `${file.name} is too large. Maximum size is 100MB`,
          variant: "destructive",
        });
        return;
      }

      processFile(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearCompleted = () => {
    setUploadFiles(prev => prev.filter(f => f.status !== 'complete'));
  };

  const clearAll = () => {
    setUploadFiles([]);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'complete':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'uploading':
        return <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      default:
        return null;
    }
  };

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

  const completedCount = uploadFiles.filter(f => f.status === 'complete').length;
  const errorCount = uploadFiles.filter(f => f.status === 'error').length;
  const uploadingCount = uploadFiles.filter(f => f.status === 'uploading').length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Upload Media Files</span>
            {uploadFiles.length > 0 && (
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  {completedCount} completed
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {errorCount} failed
                  </Badge>
                )}
                {uploadingCount > 0 && (
                  <Badge className="text-xs bg-primary text-primary-foreground">
                    {uploadingCount} uploading
                  </Badge>
                )}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Drop files here or click to upload
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Supports images, videos, and PDFs up to 100MB each
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingCount > 0}
              data-testid="button-select-files"
            >
              Select Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => handleFileSelect(e.target.files)}
              accept="image/*,video/*,.pdf"
              multiple
              className="hidden"
            />
          </div>

          {/* Upload List */}
          {uploadFiles.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">
                  Upload Progress ({uploadFiles.length} files)
                </h4>
                <div className="space-x-2">
                  {completedCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCompleted}
                      data-testid="button-clear-completed"
                    >
                      Clear Completed
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    data-testid="button-clear-all"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {uploadFiles.map((uploadFile) => (
                <div key={uploadFile.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(uploadFile.file)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {uploadFile.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(uploadFile.file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(uploadFile.status)}
                      {uploadFile.status !== 'uploading' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadFile.id)}
                          data-testid={`button-remove-file-${uploadFile.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {uploadFile.status === 'uploading' && (
                    <Progress value={uploadFile.progress} className="h-1" />
                  )}

                  {uploadFile.status === 'error' && uploadFile.error && (
                    <p className="text-xs text-red-500">{uploadFile.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {completedCount > 0 && (
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                {completedCount} file{completedCount !== 1 ? 's' : ''} uploaded successfully!
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Files will be automatically tagged with AI for better organization.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
