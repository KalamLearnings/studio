"use client";

import * as React from "react";
import {
  X,
  Save,
  ImageIcon,
  AlertCircle,
  Loader2,
  Upload,
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
import { Badge } from "@/components/ui/badge";  // Used for "New" badge on image
import { TagsInput, CategorySelector } from "@/components/media";
import type { Asset, AssetCategory } from "@/lib/types/assets";
import { ASSET_CATEGORIES } from "@/lib/types/assets";

const categoryOptions = Object.entries(ASSET_CATEGORIES).map(
  ([value, { label, icon }]) => ({
    value,
    label,
    icon,
  })
);

interface AssetEditModalProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: {
    displayName?: string;
    category?: AssetCategory;
    tags?: string[];
    file?: File;
  }) => Promise<void>;
}

type SaveState = "idle" | "saving" | "success" | "error";

export function AssetEditModal({
  asset,
  open,
  onOpenChange,
  onSave,
}: AssetEditModalProps) {
  const [displayName, setDisplayName] = React.useState("");
  const [category, setCategory] = React.useState<AssetCategory>("misc");
  const [tags, setTags] = React.useState<string[]>([]);
  const [newFile, setNewFile] = React.useState<File | null>(null);
  const [newPreview, setNewPreview] = React.useState<string | null>(null);
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Populate form when asset changes
  React.useEffect(() => {
    if (asset) {
      setDisplayName(asset.displayName || asset.name);
      setCategory(asset.category);
      setTags(asset.tags || []);
      setNewFile(null);
      setNewPreview(null);
      setSaveState("idle");
      setError(null);
    }
  }, [asset]);

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setNewFile(null);
        setNewPreview(null);
        setSaveState("idle");
        setError(null);
      }, 200);
    }
  }, [open]);

  const handleFileChange = React.useCallback((selectedFile: File | null) => {
    if (!selectedFile) {
      setNewFile(null);
      setNewPreview(null);
      return;
    }

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Please select a valid image file (JPG, PNG, or WebP)");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError("File size must be less than 10MB");
      return;
    }

    setError(null);
    setNewFile(selectedFile);

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!asset) return;

    if (!displayName.trim()) {
      setError("Please enter a name for this asset");
      return;
    }

    setSaveState("saving");
    setError(null);

    try {
      await onSave(asset.id, {
        displayName: displayName.trim(),
        category,
        tags,
        file: newFile || undefined,
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

  const currentImageUrl = newPreview || asset?.url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Asset</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Preview / Replace */}
          <div className="flex gap-4">
            <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0 border">
              {currentImageUrl ? (
                <img
                  src={currentImageUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {newPreview && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <Badge variant="secondary" className="text-xs">New</Badge>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Replace Image
              </Button>
              {newFile && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground truncate">
                    {newFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleFileChange(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {!newFile && (
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, or WebP up to 10MB
                </p>
              )}
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="editDisplayName">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="editDisplayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter a name for this asset"
            />
          </div>

          {/* Category Selection */}
          <CategorySelector
            categories={categoryOptions}
            value={category}
            onChange={setCategory}
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
