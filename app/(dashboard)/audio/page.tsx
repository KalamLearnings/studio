"use client";

import * as React from "react";
import {
  Upload,
  Search,
  Play,
  Pause,
  Volume2,
  MoreVertical,
  Trash2,
  Download,
  Copy,
  Wand2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAudio } from "@/lib/hooks/useAudio";
import {
  AUDIO_CATEGORIES,
  type AudioCategory,
  type AudioAsset,
} from "@/lib/types/audio";
import { AudioInputField } from "@/components/audio/AudioInputField";
import { toast } from "sonner";

const formatDuration = (ms?: number): string => {
  if (!ms) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const AudioRow = React.memo(function AudioRow({
  audio,
  isPlaying,
  onTogglePlay,
  onDelete,
  onCopyUrl,
}: {
  audio: AudioAsset;
  isPlaying: boolean;
  onTogglePlay: (id: string) => void;
  onDelete: (id: string) => void;
  onCopyUrl: (url: string) => void;
}) {
  return (
    <tr className="border-b">
      <td className="p-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onTogglePlay(audio.id)}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{audio.displayName || audio.name}</span>
        </div>
      </td>
      <td className="p-3">
        <span className="rounded-full bg-muted px-2 py-1 text-xs">
          {AUDIO_CATEGORIES[audio.category]?.label || audio.category}
        </span>
      </td>
      <td className="p-3">
        {audio.tags && audio.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {audio.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
              >
                {tag}
              </span>
            ))}
            {audio.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{audio.tags.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </td>
      <td className="p-3 text-muted-foreground">
        {formatDuration(audio.durationMs)}
      </td>
      <td className="p-3 text-muted-foreground">
        {audio.createdAt
          ? new Date(audio.createdAt).toLocaleDateString()
          : "N/A"}
      </td>
      <td className="p-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onCopyUrl(audio.url)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy URL
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={audio.url} download={audio.name}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(audio.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});

export default function AudioPage() {
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const {
    audioAssets,
    loading,
    error,
    selectedCategory,
    searchQuery,
    setCategory,
    setSearchQuery,
    uploadNewAudio,
    removeAudio,
  } = useAudio();

  const handleCategoryChange = React.useCallback(
    (value: string) => {
      setCategory(value === "all" ? undefined : (value as AudioCategory));
    },
    [setCategory]
  );

  const handleCopyUrl = React.useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  }, []);

  const handleDelete = React.useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this audio file?")) return;
      try {
        await removeAudio(id);
        toast.success("Audio deleted");
      } catch {
        toast.error("Failed to delete audio");
      }
    },
    [removeAudio]
  );

  const handleTogglePlay = React.useCallback(
    (id: string) => {
      if (playingId === id) {
        audioRef.current?.pause();
        setPlayingId(null);
      } else {
        const audio = audioAssets.find((a) => a.id === id);
        if (audio?.url) {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          audioRef.current = new Audio(audio.url);
          audioRef.current.play().catch(() => {
            toast.error("Failed to play audio");
          });
          audioRef.current.onended = () => setPlayingId(null);
          setPlayingId(id);
        }
      }
    },
    [playingId, audioAssets]
  );

  const handleUploadSubmit = React.useCallback(
    async (data: Parameters<typeof uploadNewAudio>[0]) => {
      await uploadNewAudio(data);
      toast.success("Audio uploaded successfully");
      setIsUploadDialogOpen(false);
    },
    [uploadNewAudio]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audio</h1>
          <p className="text-muted-foreground">
            Manage audio files and generate text-to-speech
          </p>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Add New Audio
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search audio files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={selectedCategory || "all"}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(AUDIO_CATEGORIES).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 p-4 text-center text-destructive">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Audio List */}
      {!loading && audioAssets.length > 0 && (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left text-sm font-medium w-12"></th>
                <th className="p-3 text-left text-sm font-medium">Name</th>
                <th className="p-3 text-left text-sm font-medium">Category</th>
                <th className="p-3 text-left text-sm font-medium">Tags</th>
                <th className="p-3 text-left text-sm font-medium">Duration</th>
                <th className="p-3 text-left text-sm font-medium">Created</th>
                <th className="p-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {audioAssets.map((audio) => (
                <AudioRow
                  key={audio.id}
                  audio={audio}
                  isPlaying={playingId === audio.id}
                  onTogglePlay={handleTogglePlay}
                  onDelete={handleDelete}
                  onCopyUrl={handleCopyUrl}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && audioAssets.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Volume2 className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No audio files found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery || selectedCategory
              ? "Try adjusting your filters"
              : "Generate or upload audio files to get started"}
          </p>
          {!searchQuery && !selectedCategory && (
            <Button className="mt-4" onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Add New Audio
            </Button>
          )}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Audio</DialogTitle>
          </DialogHeader>
          <AudioInputField
            mode="library"
            onSubmit={handleUploadSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
