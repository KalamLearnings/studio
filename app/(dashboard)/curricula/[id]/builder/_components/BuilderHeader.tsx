"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Play,
  Settings,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
}

export function BuilderHeader({ title, topicCount, activityCount }: BuilderHeaderProps) {
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
