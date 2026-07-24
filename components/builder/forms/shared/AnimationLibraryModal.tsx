"use client";

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
import { Loader2, Search, Upload, Check, Clapperboard } from "lucide-react";
import {
  listAnimations,
  uploadAnimation,
  type AnimationAsset,
} from "@/lib/utils/animationUpload";
import { cn } from "@/lib/utils";

interface AnimationLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAnimation: (url: string) => void;
  currentAnimation?: string;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function AnimationLibraryModal({
  isOpen,
  onClose,
  onSelectAnimation,
  currentAnimation,
}: AnimationLibraryModalProps) {
  const [selectedUrl, setSelectedUrl] = React.useState<string | null>(
    currentAnimation || null
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [animations, setAnimations] = React.useState<AnimationAsset[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadAnimations = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAnimations(await listAnimations());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load animations");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentAnimation || null);
      loadAnimations();
    }
  }, [isOpen, currentAnimation, loadAnimations]);

  const filteredAnimations = React.useMemo(
    () =>
      animations.filter((a) =>
        searchQuery
          ? a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.name.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      ),
    [animations, searchQuery]
  );

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadAnimation(file);
      setAnimations((prev) => [uploaded, ...prev]);
      setSelectedUrl(uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSelect = () => {
    if (selectedUrl) {
      onSelectAnimation(selectedUrl);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Animation</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search animations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload .riv
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".riv"
            className="hidden"
            onChange={handleUpload}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <ScrollArea className="flex-1 min-h-[300px] max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAnimations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clapperboard className="h-8 w-8 mb-2" />
              <p className="text-sm">No animations in library</p>
              <p className="text-xs mt-1">
                Upload a Rive (.riv) file to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 p-1">
              {filteredAnimations.map((animation) => (
                <button
                  key={animation.id}
                  type="button"
                  onClick={() => setSelectedUrl(animation.url)}
                  className={cn(
                    "relative flex flex-col items-start gap-1 rounded-lg border-2 p-4 text-left transition-all",
                    selectedUrl === animation.url
                      ? "border-primary ring-2 ring-primary ring-offset-2"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Clapperboard className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-sm font-medium capitalize truncate w-full">
                    {animation.displayName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(animation.fileSize)}
                  </span>
                  {selectedUrl === animation.url && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
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
          <Button onClick={handleSelect} disabled={!selectedUrl}>
            Select Animation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
