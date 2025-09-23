import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Wifi, WifiOff, Play, Pause, SkipForward, Volume2 } from "lucide-react";

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
  items: PlaylistItem[];
}

interface Screen {
  id: string;
  name: string;
  deviceKey: string;
  isOnline: boolean;
  location: string;
}

interface PlayerState {
  currentPlaylist: Playlist | null;
  currentIndex: number;
  isPlaying: boolean;
  timeRemaining: number;
}

export default function Player() {
  const { deviceKey } = useParams();
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentPlaylist: null,
    currentIndex: 0,
    isPlaying: false,
    timeRemaining: 0,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // WebSocket connection for real-time updates
  const { socket, isConnected, sendMessage } = useWebSocket('/ws');

  // Connect player and get initial data
  const { data: playerData, isLoading } = useQuery({
    queryKey: ['/api/player/connect'],
    queryFn: async () => {
      const response = await fetch('/api/player/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceKey }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to connect player');
      }
      
      return response.json();
    },
    enabled: !!deviceKey,
    retry: false,
  });

  // Register with WebSocket server
  useEffect(() => {
    if (socket && deviceKey) {
      sendMessage({
        type: 'PLAYER_REGISTER',
        payload: { deviceKey }
      });
      setConnectionStatus('connected');
    }
  }, [socket, deviceKey, sendMessage]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'LOAD_PLAYLIST') {
          const playlist = data.payload.playlist;
          setPlayerState(prev => ({
            ...prev,
            currentPlaylist: playlist,
            currentIndex: 0,
            isPlaying: true,
            timeRemaining: playlist.items?.[0]?.duration || 10,
          }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket]);

  // Update connection status based on WebSocket
  useEffect(() => {
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');
  }, [isConnected]);

  // Initialize player state from server data
  useEffect(() => {
    if (playerData?.currentPlaylist) {
      setPlayerState(prev => ({
        ...prev,
        currentPlaylist: playerData.currentPlaylist,
        currentIndex: 0,
        isPlaying: false,
        timeRemaining: playerData.currentPlaylist.items?.[0]?.duration || 10,
      }));
    }
  }, [playerData]);

  // Auto-advance playlist items
  useEffect(() => {
    if (!playerState.isPlaying || !playerState.currentPlaylist) return;

    const interval = setInterval(() => {
      setPlayerState(prev => {
        if (prev.timeRemaining <= 1) {
          // Move to next item
          const nextIndex = (prev.currentIndex + 1) % (prev.currentPlaylist?.items.length || 1);
          const nextItem = prev.currentPlaylist?.items[nextIndex];
          
          return {
            ...prev,
            currentIndex: nextIndex,
            timeRemaining: nextItem?.duration || 10,
          };
        }
        
        return {
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [playerState.isPlaying, playerState.currentPlaylist]);

  // Update current time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const togglePlayPause = () => {
    setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const nextItem = () => {
    if (!playerState.currentPlaylist) return;
    
    const nextIndex = (playerState.currentIndex + 1) % playerState.currentPlaylist.items.length;
    const nextItem = playerState.currentPlaylist.items[nextIndex];
    
    setPlayerState(prev => ({
      ...prev,
      currentIndex: nextIndex,
      timeRemaining: nextItem?.duration || 10,
    }));
  };

  const currentItem = playerState.currentPlaylist?.items?.[playerState.currentIndex];
  const progress = currentItem ? ((currentItem.duration - playerState.timeRemaining) / currentItem.duration) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Connecting to player...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen player-screen text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800"></div>
      
      {/* Player Interface */}
      <div className="relative z-10 h-full flex flex-col p-8">
        {/* Status Bar */}
        <div className="flex items-center justify-between text-sm opacity-75 mb-6">
          <div className="flex items-center space-x-4">
            <span>SignageAI Player</span>
            <div className="flex items-center space-x-2">
              {connectionStatus === 'connected' ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">Disconnected</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span data-testid="text-device-key">Device: {deviceKey}</span>
            <span data-testid="text-current-time">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Content Display */}
        <div className="flex-1 flex items-center justify-center">
          {currentItem ? (
            <div className="text-center max-w-4xl mx-auto">
              {currentItem.media.mimeType.startsWith('image/') ? (
                <img
                  src={currentItem.media.url}
                  alt={currentItem.media.originalName}
                  className="w-full max-h-96 mx-auto rounded-lg shadow-2xl mb-6 object-contain"
                  data-testid="current-media-image"
                />
              ) : currentItem.media.mimeType.startsWith('video/') ? (
                <video
                  src={currentItem.media.url}
                  autoPlay
                  muted
                  loop={false}
                  className="w-full max-h-96 mx-auto rounded-lg shadow-2xl mb-6"
                  data-testid="current-media-video"
                />
              ) : (
                <div className="w-96 h-96 bg-gray-700 rounded-lg mx-auto flex items-center justify-center mb-6">
                  <span className="text-4xl">📄</span>
                </div>
              )}
              <h1 className="text-4xl font-bold mb-4" data-testid="current-media-title">
                {currentItem.media.originalName}
              </h1>
              <div className="flex items-center justify-center space-x-4 text-sm opacity-75">
                <span>Item {playerState.currentIndex + 1} of {playerState.currentPlaylist?.items.length}</span>
                <span>•</span>
                <span>{playerState.timeRemaining}s remaining</span>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Monitor className="w-24 h-24 mx-auto mb-6 opacity-50" />
              <h1 className="text-4xl font-bold mb-4">No Content</h1>
              <p className="text-xl opacity-75">Waiting for playlist...</p>
            </div>
          )}
        </div>

        {/* Playlist Progress Bar */}
        {playerState.currentPlaylist && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm opacity-75 mb-2">
              <span data-testid="current-playlist-name">{playerState.currentPlaylist.name}</span>
              <span>
                {playerState.currentIndex + 1} of {playerState.currentPlaylist.items.length} items
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Connection Status Indicator */}
        <div className="absolute top-4 right-4 text-xs opacity-60">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' 
                ? 'bg-green-400 animate-pulse' 
                : 'bg-red-400'
            }`}></div>
            <span>{connectionStatus === 'connected' ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Control Panel (for development/testing) */}
      <div className="absolute bottom-4 left-4 right-4">
        <Card className="bg-black/50 backdrop-blur border-gray-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={togglePlayPause}
                  data-testid="button-play-pause"
                >
                  {playerState.isPlaying ? (
                    <Pause className="w-4 h-4 mr-2" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  {playerState.isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={nextItem}
                  disabled={!playerState.currentPlaylist}
                  data-testid="button-next"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Next
                </Button>
              </div>
              <div className="flex items-center space-x-4 text-white text-sm">
                <Badge variant="secondary">
                  {playerState.isPlaying ? 'Playing' : 'Paused'}
                </Badge>
                <span>Last updated: {connectionStatus === 'connected' ? 'Live' : 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
