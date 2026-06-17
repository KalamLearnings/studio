"use client";

import * as React from "react";
import {
  Upload,
  X,
  ImageIcon,
  CheckCircle2,
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
import { cn } from "@/lib/utils";
import { TagsInput, CategorySelector } from "@/components/media";
import type { AssetCategory, AssetUploadData } from "@/lib/types/assets";
import { ASSET_CATEGORIES } from "@/lib/types/assets";

const categoryOptions = Object.entries(ASSET_CATEGORIES).map(
  ([value, { label, icon }]) => ({
    value,
    label,
    icon,
  })
);

interface AssetUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: AssetUploadData) => Promise<void>;
  defaultCategory?: AssetCategory;
}

type UploadState = "idle" | "uploading" | "success" | "error";

export function AssetUploadModal({
  open,
  onOpenChange,
  onUpload,
  defaultCategory = "misc",
}: AssetUploadModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState("");
  const [category, setCategory] = React.useState<AssetCategory>(defaultCategory);
  const [tags, setTags] = React.useState<string[]>([]);
  const [uploadState, setUploadState] = React.useState<UploadState>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setFile(null);
        setPreview(null);
        setDisplayName("");
        setCategory(defaultCategory);
        setTags([]);
        setUploadState("idle");
        setError(null);
      }, 200);
    }
  }, [open, defaultCategory]);

  const handleFileChange = React.useCallback((selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null);
      setPreview(null);
      setDisplayName("");
      return;
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Please select a valid image file (JPG, PNG, or WebP)");
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError("File size must be less than 10MB");
      return;
    }

    setError(null);
    setFile(selectedFile);

    // Auto-populate display name from filename
    const nameWithoutExtension = selectedFile.name.replace(/\.[^/.]+$/, "");
    setDisplayName(nameWithoutExtension);

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileChange(droppedFile);
      }
    },
    [handleFileChange]
  );

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a file");
      return;
    }

    if (!displayName.trim()) {
      setError("Please enter a name for this asset");
      return;
    }

    setUploadState("uploading");
    setError(null);

    try {
      await onUpload({
        displayName: displayName.trim(),
        file,
        category,
        tags,
      });
      setUploadState("success");
      setTimeout(() => {
        onOpenChange(false);
      }, 1000);
    } catch (err) {
      setUploadState("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Asset</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Drop Zone / Preview */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !file && fileInputRef.current?.click()}
            className={cn(
              "relative rounded-lg border-2 border-dashed transition-all",
              isDragging && "border-primary bg-primary/5",
              file ? "border-muted p-2" : "p-8 cursor-pointer hover:border-primary/50",
              !file && !isDragging && "border-muted-foreground/25"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              className="hidden"
            />

            {preview ? (
              <div className="flex gap-4">
                {/* Image Preview */}
                <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileChange(null);
                    }}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0 py-2">
                  <p className="font-medium truncate">{file?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {file && formatFileSize(file.size)}
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Change image
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium mb-1">
                  Drop your image here, or{" "}
                  <span className="text-primary">browse</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, or WebP up to 10MB
                </p>
              </div>
            )}
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="displayName">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="displayName"
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
              disabled={uploadState === "uploading"}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || !displayName.trim() || uploadState === "uploading"}
              className="min-w-[100px]"
            >
              {uploadState === "uploading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading
                </>
              ) : uploadState === "success" ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Done
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
