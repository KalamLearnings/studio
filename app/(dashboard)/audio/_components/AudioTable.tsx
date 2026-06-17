"use client";

import * as React from "react";
import {
  Play,
  Pause,
  Volume2,
  MoreVertical,
  Trash2,
  Download,
  Copy,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AUDIO_CATEGORIES, type AudioAsset } from "@/lib/types/audio";

interface AudioTableProps {
  audioAssets: AudioAsset[];
  playingId: string | null;
  onTogglePlay: (id: string) => void;
  onEdit: (audio: AudioAsset) => void;
  onDelete: (id: string) => void;
  onCopyUrl: (url: string) => void;
}

const formatDuration = (ms?: number): string => {
  if (!ms) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const AudioRow = React.memo(function AudioRow({
  audio,
  isPlaying,
  onTogglePlay,
  onEdit,
  onDelete,
  onCopyUrl,
}: {
  audio: AudioAsset;
  isPlaying: boolean;
  onTogglePlay: (id: string) => void;
  onEdit: (audio: AudioAsset) => void;
  onDelete: (id: string) => void;
  onCopyUrl: (url: string) => void;
}) {
  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="p-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onTogglePlay(audio.id)}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{audio.displayName || audio.name}</span>
        </div>
      </td>
      <td className="p-3">
        <span className="rounded-full bg-muted px-2 py-1 text-xs">
          {AUDIO_CATEGORIES[audio.category]?.label || audio.category}
        </span>
      </td>
      <td className="p-3">
        {audio.tags && audio.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {audio.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
              >
                {tag}
              </span>
            ))}
            {audio.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{audio.tags.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </td>
      <td className="p-3 text-muted-foreground">
        {formatDuration(audio.durationMs)}
      </td>
      <td className="p-3 text-muted-foreground">
        {audio.createdAt
          ? new Date(audio.createdAt).toLocaleDateString()
          : "N/A"}
      </td>
      <td className="p-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(audio)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopyUrl(audio.url)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy URL
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={audio.url} download={audio.name}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(audio.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});

export function AudioTable({
  audioAssets,
  playingId,
  onTogglePlay,
  onEdit,
  onDelete,
  onCopyUrl,
}: AudioTableProps) {
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left text-sm font-medium w-12"></th>
            <th className="p-3 text-left text-sm font-medium">Name</th>
            <th className="p-3 text-left text-sm font-medium">Category</th>
            <th className="p-3 text-left text-sm font-medium">Tags</th>
            <th className="p-3 text-left text-sm font-medium">Duration</th>
            <th className="p-3 text-left text-sm font-medium">Created</th>
            <th className="p-3 text-right text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {audioAssets.map((audio) => (
            <AudioRow
              key={audio.id}
              audio={audio}
              isPlaying={playingId === audio.id}
              onTogglePlay={onTogglePlay}
              onEdit={onEdit}
              onDelete={onDelete}
              onCopyUrl={onCopyUrl}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
