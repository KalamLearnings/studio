"use client";

import { Search, Grid, List, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssetCategory } from "@/lib/types/assets";

const CATEGORIES: { value: AssetCategory | "all"; label: string }[] = [
  { value: "all", label: "All Categories" },
  { value: "letters", label: "Letters" },
  { value: "books", label: "Books" },
  { value: "fruits", label: "Fruits" },
  { value: "animals", label: "Animals" },
  { value: "shapes", label: "Shapes" },
  { value: "colors", label: "Colors" },
  { value: "numbers", label: "Numbers" },
  { value: "misc", label: "Miscellaneous" },
];

interface AssetsFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: AssetCategory | undefined;
  onCategoryChange: (category: AssetCategory | undefined) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export function AssetsFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  viewMode,
  onViewModeChange,
}: AssetsFiltersProps) {
  const handleCategoryChange = (value: string) => {
    onCategoryChange(value === "all" ? undefined : (value as AssetCategory));
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search assets..."
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
          <Filter className="mr-2 h-4 w-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center rounded-md border">
        <Button
          variant={viewMode === "grid" ? "secondary" : "ghost"}
          size="icon"
          className="rounded-r-none"
          onClick={() => onViewModeChange("grid")}
        >
          <Grid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "list" ? "secondary" : "ghost"}
          size="icon"
          className="rounded-l-none"
          onClick={() => onViewModeChange("list")}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
