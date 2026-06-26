"use client";

import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BuilderHeaderProps {
  title: string;
  topicCount: number;
  activityCount: number;
  activitySearchId: string;
  onActivitySearchIdChange: (value: string) => void;
  onOpenActivityById: () => void;
}

export function BuilderHeader({
  title,
  topicCount,
  activityCount,
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
    </header>
  );
}
