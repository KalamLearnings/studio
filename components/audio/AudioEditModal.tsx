"use client";

import * as React from "react";
import {
  X,
  Save,
  Volume2,
  Play,
  Pause,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagsInput, CategorySelector } from "@/components/media";
import type { AudioAsset, AudioCategory } from "@/lib/types/audio";
import { AUDIO_CATEGORIES } from "@/lib/types/audio";

interface AudioEditModalProps {
  audio: AudioAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    id: string,
    data: {
      displayName?: string;
      category?: AudioCategory;
      tags?: string[];
    }
  ) => Promise<void>;
}

type SaveState = "idle" | "saving" | "success" | "error";

const categoryOptions = Object.entries(AUDIO_CATEGORIES).map(
  ([value, { label, description }]) => ({
    value,
    label,
    description,
  })
);

export function AudioEditModal({
  audio,
  open,
  onOpenChange,
  onSave,
}: AudioEditModalProps) {
  const [displayName, setDisplayName] = React.useState("");
  const [category, setCategory] = React.useState<AudioCategory>("letter_sounds");
  const [tags, setTags] = React.useState<string[]>([]);
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Populate form when audio changes
  React.useEffect(() => {
    if (audio) {
      setDisplayName(audio.displayName || audio.name);
      setCategory(audio.category);
      setTags(audio.tags || []);
      setSaveState("idle");
      setError(null);
      setIsPlaying(false);
    }
  }, [audio]);

  // Cleanup audio on close
  React.useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, [open]);

  const handleTogglePlay = React.useCallback(() => {
    if (!audio?.url) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(audio.url);
      audioRef.current.play().catch(() => {
        setError("Failed to play audio");
      });
      audioRef.current.onended = () => setIsPlaying(false);
      setIsPlaying(true);
    }
  }, [audio?.url, isPlaying]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!audio) return;

    if (!displayName.trim()) {
      setError("Please enter a name for this audio");
      return;
    }

    setSaveState("saving");
    setError(null);

    try {
      await onSave(audio.id, {
        displayName: displayName.trim(),
        category,
        tags,
      });
      setSaveState("success");
      setTimeout(() => {
        onOpenChange(false);
      }, 500);
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Failed to save changes");
    }
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return "Unknown duration";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Audio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Audio Preview */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full flex-shrink-0"
              onClick={handleTogglePlay}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <p className="font-medium truncate">{audio?.name}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDuration(audio?.durationMs)}
                {audio?.fileSize && ` · ${(audio.fileSize / 1024).toFixed(1)} KB`}
              </p>
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="editDisplayName">
              Display Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="editDisplayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter a name for this audio"
            />
          </div>

          {/* Category Selection */}
          <CategorySelector
            categories={categoryOptions}
            value={category}
            onChange={setCategory}
            label="Category"
            columns={3}
          />

          {/* Tags */}
          <TagsInput tags={tags} onChange={setTags} />

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveState === "saving"}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!displayName.trim() || saveState === "saving"}
              className="min-w-[100px]"
            >
              {saveState === "saving" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
