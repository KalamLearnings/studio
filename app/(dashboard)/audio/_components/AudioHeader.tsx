"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioHeaderProps {
  onUpload: () => void;
}

export function AudioHeader({ onUpload }: AudioHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Audio</h1>
        <p className="text-muted-foreground">
          Manage audio files and generate text-to-speech
        </p>
      </div>
      <Button onClick={onUpload}>
        <Upload className="mr-2 h-4 w-4" />
        Add New Audio
      </Button>
    </div>
  );
}
