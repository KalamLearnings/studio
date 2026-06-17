"use client";

import { Upload, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  hasFilters: boolean;
  filterMessage?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function MediaEmptyState({
  icon: Icon,
  title,
  description,
  hasFilters,
  filterMessage = "Try adjusting your filters",
  actionLabel = "Upload",
  onAction,
}: MediaEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasFilters ? filterMessage : description}
      </p>
      {!hasFilters && onAction && (
        <Button className="mt-4" onClick={onAction}>
          <Upload className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
