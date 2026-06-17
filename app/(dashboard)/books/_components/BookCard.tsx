"use client";

import * as React from "react";
import {
  MoreVertical,
  Trash2,
  Edit,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import type { Book } from "@/lib/api/books";

const LEVEL_COLORS: Record<number, string> = {
  1: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  2: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  3: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const LEVEL_LABELS: Record<number, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced",
};

const COVER_COLORS = [
  "bg-amber-500",
  "bg-indigo-500",
  "bg-green-500",
  "bg-rose-500",
  "bg-purple-500",
  "bg-blue-500",
  "bg-teal-500",
];

interface BookCardProps {
  book: Book;
  colorIndex: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (book: Book) => void;
}

export const BookCard = React.memo(function BookCard({
  book,
  colorIndex,
  onEdit,
  onDelete,
  onToggleActive,
}: BookCardProps) {
  const coverColor = COVER_COLORS[colorIndex % COVER_COLORS.length];

  return (
    <Card className="group overflow-hidden">
      {/* Book Cover */}
      <div
        className={`relative h-40 cursor-pointer ${book.image_url ? "" : coverColor}`}
        onClick={() => onEdit(book.id)}
      >
        {book.image_url ? (
          <img
            src={book.image_url}
            alt={book.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <BookOpen className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2 font-arabic text-xl" dir="rtl">
                {book.title_ar || book.title}
              </p>
            </div>
          </div>
        )}
        <div className="absolute right-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(book.id)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(book.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{book.title}</CardTitle>
          <Switch
            checked={book.is_active}
            onCheckedChange={() => onToggleActive(book)}
            aria-label="Toggle active"
          />
        </div>
        <CardDescription className="line-clamp-2">
          {book.synopsis || "No description"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {book.page_count || 0} pages
          </span>
          {book.difficulty_level && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                LEVEL_COLORS[book.difficulty_level] || LEVEL_COLORS[1]
              }`}
            >
              {LEVEL_LABELS[book.difficulty_level] || "Beginner"}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
