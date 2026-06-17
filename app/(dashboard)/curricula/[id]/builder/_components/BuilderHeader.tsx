"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Play,
  Settings,
  MoreVertical,
  Search,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BuilderHeaderProps {
  title: string;
  topicCount: number;
  activityCount: number;
  selectedActivityId?: string;
  activitySearchId: string;
  onActivitySearchIdChange: (value: string) => void;
  onOpenActivityById: () => void;
}

export function BuilderHeader({
  title,
  topicCount,
  activityCount,
  selectedActivityId,
  activitySearchId,
  onActivitySearchIdChange,
  onOpenActivityById,
}: BuilderHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-4">
        <Link href="/curricula">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-semibold">{title}</h1>
          <p className="text-xs text-muted-foreground">
            {topicCount} topics · {activityCount} activities
          </p>
        </div>

        {/* Selected activity ID — click to copy */}
        {selectedActivityId && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(selectedActivityId);
              toast.success("Activity ID copied");
            }}
            title="Click to copy activity ID"
            className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted/70"
          >
            <span className="max-w-[220px] truncate">{selectedActivityId}</span>
            <Copy className="h-3 w-3 shrink-0" />
          </button>
        )}

        {/* Open an activity directly by pasting its ID */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={activitySearchId}
            onChange={(e) => onActivitySearchIdChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onOpenActivityById();
            }}
            placeholder="Open activity by ID…"
            className="h-9 w-64 pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Play className="h-4 w-4 mr-1" />
          Preview
        </Button>
        <Button size="sm">
          <Save className="h-4 w-4 mr-1" />
          Save All
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              Curriculum Settings
            </DropdownMenuItem>
            <DropdownMenuItem>Export</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Publish</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
