"use client";

/**
 * AudioPickerField Component
 *
 * Reusable audio selection field with picker modal.
 * Combines FormField + AudioPicker + status styling.
 */

import * as React from "react";
import { useState } from "react";
import { Volume2, X, Play, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AudioPicker } from "@/components/audio/AudioPicker";
import type { AudioAsset } from "@/lib/types/audio";

interface AudioPickerFieldProps {
  label?: string;
  hint?: string;
  value?: string | null; // audioUrl
  audioId?: string | null;
  onChange: (audioUrl: string | undefined, audioId?: string) => void;
  required?: boolean;
  className?: string;
}

export function AudioPickerField({
  label = "Audio",
  hint,
  value,
  audioId,
  onChange,
  required = false,
  className,
}: AudioPickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const hasAudio = !!value;

  const handleSelect = (url: string) => {
    onChange(url, audioId || undefined);
  };

  const handleClear = () => {
    onChange(undefined, undefined);
  };

  const handlePlayPreview = () => {
    if (!value) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current = new Audio(value);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border p-3 transition-all",
          hasAudio
            ? "border-primary/50 bg-primary/5"
            : required
            ? "border-amber-300 bg-amber-50"
            : "border-border bg-muted/30"
        )}
      >
        {hasAudio ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handlePlayPreview}
            >
              {isPlaying ? (
                <Volume2 className="h-4 w-4 text-primary animate-pulse" />
              ) : (
                <Play className="h-4 w-4 text-primary" />
              )}
            </Button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary truncate">
                Audio Selected
              </p>
              <p className="text-xs text-muted-foreground truncate">{value}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            {required && (
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            <p
              className={cn(
                "flex-1 text-sm",
                required ? "text-amber-700" : "text-muted-foreground"
              )}
            >
              {required ? "Audio required" : "No audio selected"}
            </p>
          </>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPicker(true)}
        >
          <Volume2 className="h-4 w-4 mr-1" />
          {hasAudio ? "Change" : "Select"}
        </Button>
      </div>

      <AudioPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleSelect}
        currentUrl={value}
      />
    </div>
  );
}
