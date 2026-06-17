"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AssetsHeaderProps {
  onUpload: () => void;
}

export function AssetsHeader({ onUpload }: AssetsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Assets</h1>
        <p className="text-muted-foreground">
          Manage images, icons, and media files
        </p>
      </div>
      <Button onClick={onUpload}>
        <Upload className="mr-2 h-4 w-4" />
        Upload Asset
      </Button>
    </div>
  );
}
