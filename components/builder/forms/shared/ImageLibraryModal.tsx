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
import { Loader2, Search, Upload, Check } from "lucide-react";
import { useAssets } from "@/lib/hooks/useAssets";
import { cn } from "@/lib/utils";

interface ImageLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (url: string) => void;
  currentImage?: string;
}

export function ImageLibraryModal({
  isOpen,
  onClose,
  onSelectImage,
  currentImage,
}: ImageLibraryModalProps) {
  const [selectedUrl, setSelectedUrl] = React.useState<string | null>(
    currentImage || null
  );
  const [searchQuery, setSearchQuery] = React.useState("");

  const { assets, loading, error, refetch } = useAssets();

  // Filter to only image assets (by URL extension)
  const imageAssets = React.useMemo(() => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
    return assets
      .filter((a) =>
        imageExtensions.some((ext) => a.url.toLowerCase().includes(ext))
      )
      .filter((a) =>
        searchQuery
          ? a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.displayName.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      );
  }, [assets, searchQuery]);

  const handleSelect = () => {
    if (selectedUrl) {
      onSelectImage(selectedUrl);
      onClose();
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentImage || null);
      refetch();
    }
  }, [isOpen, currentImage, refetch]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Image</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="flex-1 min-h-[300px] max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">Failed to load images</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          ) : imageAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Upload className="h-8 w-8 mb-2" />
              <p className="text-sm">No images in library</p>
              <p className="text-xs mt-1">Upload images in the Assets section</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3 p-1">
              {imageAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedUrl(asset.url)}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                    selectedUrl === asset.url
                      ? "border-primary ring-2 ring-primary ring-offset-2"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                  {selectedUrl === asset.url && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
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
            Select Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
