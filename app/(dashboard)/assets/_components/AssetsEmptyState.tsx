"use client";

import { Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AssetsEmptyStateProps {
  hasFilters: boolean;
  onUpload: () => void;
}

export function AssetsEmptyState({ hasFilters, onUpload }: AssetsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-medium">No assets found</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting your filters"
          : "Upload your first asset to get started"}
      </p>
      {!hasFilters && (
        <Button className="mt-4" onClick={onUpload}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Asset
        </Button>
      )}
    </div>
  );
}
