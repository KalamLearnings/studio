"use client";

/**
 * Voice Selector
 *
 * Dropdown for choosing the TTS voice used in audio generation.
 * Ported from v1, shadcn-styled.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { VOICES } from "@/lib/constants/voices";

interface VoiceSelectorProps {
  value: string;
  onChange: (voiceId: string) => void;
  label?: string;
  className?: string;
}

export function VoiceSelector({
  value,
  onChange,
  label = "TTS Voice",
  className,
}: VoiceSelectorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <Label className="whitespace-nowrap text-sm text-muted-foreground">
          {label}
        </Label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select a voice" />
        </SelectTrigger>
        <SelectContent>
          {VOICES.map((voice) => (
            <SelectItem key={voice.id} value={voice.id}>
              {voice.name}
              {voice.description ? ` - ${voice.description}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
