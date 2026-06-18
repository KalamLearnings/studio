"use client";

/**
 * AudioPicker
 *
 * Dialog to pick a pre-recorded audio clip from the library.
 * Returns the selected audio's public URL. Ported from v1, shadcn-styled.
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Music, Check, Play } from "lucide-react";
import { useAudio } from "@/lib/hooks/useAudio";
import { cn } from "@/lib/utils";

interface AudioPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  currentUrl?: string | null;
}

export function AudioPicker({
  isOpen,
  onClose,
  onSelect,
  currentUrl,
}: AudioPickerProps) {
  const [selectedUrl, setSelectedUrl] = React.useState<string | null>(
    currentUrl || null
  );
  const { audioAssets, loading, error, searchQuery, setSearchQuery, refetch } =
    useAudio({ autoLoad: false });

  React.useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentUrl || null);
      refetch();
    }
  }, [isOpen, currentUrl, refetch]);

  const handleConfirm = () => {
    if (selectedUrl) {
      onSelect(selectedUrl);
      onClose();
    }
  };

  const handlePreview = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    new Audio(url).play().catch(() => {
      /* ignore playback errors */
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle>Select Audio</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search audio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">Failed to load audio</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          ) : audioAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Music className="mb-2 h-8 w-8" />
              <p className="text-sm">No audio in library</p>
              <p className="mt-1 text-xs">Upload audio in the Audio section</p>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {audioAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedUrl(asset.url)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2 text-left transition-all",
                    selectedUrl === asset.url
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                    onClick={(e) => handlePreview(e, asset.url)}
                  >
                    <Play className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {asset.displayName || asset.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {asset.category}
                      {asset.durationMs
                        ? ` - ${(asset.durationMs / 1000).toFixed(1)}s`
                        : ""}
                    </div>
                  </div>
                  {selectedUrl === asset.url && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedUrl}>
            Select Audio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
