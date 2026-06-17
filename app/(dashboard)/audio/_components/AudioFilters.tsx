"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUDIO_CATEGORIES, type AudioCategory } from "@/lib/types/audio";

interface AudioFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: AudioCategory | undefined;
  onCategoryChange: (category: AudioCategory | undefined) => void;
}

export function AudioFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
}: AudioFiltersProps) {
  const handleCategoryChange = (value: string) => {
    onCategoryChange(value === "all" ? undefined : (value as AudioCategory));
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search audio files..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <Select
        value={selectedCategory || "all"}
        onValueChange={handleCategoryChange}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {Object.entries(AUDIO_CATEGORIES).map(([key, { label }]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
