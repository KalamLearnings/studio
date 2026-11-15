"use client";

/**
 * Picks the book a story node opens (CM-S11; backend CM-B36). Lists only
 * books with a saved reader source, the rule the backend enforces with
 * `STORY_NODE_BOOK_INVALID`. Each book's source is read with the reader
 * source query the book page uses (`GET /books/admin/:id/reader/source`).
 */

import * as React from "react";
import { useQueries } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBooks } from "@/lib/hooks/useBooks";
import { getReaderSource } from "@/lib/api/bookReader";
import { storyBookChoices } from "@/lib/books/storyNode";

export function StoryBookPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (bookId: string) => void;
}) {
  const books = useBooks();
  const sources = useQueries({
    queries: (books.data ?? []).map((b) => ({
      queryKey: ["book-reader-source", b.id] as const,
      queryFn: () => getReaderSource(b.id),
      staleTime: 60 * 1000,
    })),
  });
  const hasSource = React.useMemo(() => {
    const map = new Map<string, boolean | undefined>();
    (books.data ?? []).forEach((b, i) => {
      const q = sources[i];
      map.set(b.id, q?.data ? q.data.source !== null : undefined);
    });
    return map;
  }, [books.data, sources]);
  const checking = sources.some((q) => q.isLoading);
  const choices = storyBookChoices(books.data ?? [], (id) => hasSource.get(id), value);
  const currentWithoutSource = value !== null && hasSource.get(value) === false;

  return (
    <div className="space-y-1">
      <h4 className="text-sm font-medium">Book</h4>
      {books.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading books…
        </p>
      ) : books.error ? (
        <p className="text-sm text-destructive">Could not load books: {(books.error as Error).message}</p>
      ) : (
        <>
          <Select value={value ?? undefined} onValueChange={onChange}>
            <SelectTrigger className="h-9 w-64">
              <SelectValue placeholder="Pick a book" />
            </SelectTrigger>
            <SelectContent>
              {choices.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.title}
                  {b.title_ar ? ` · ${b.title_ar}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {checking
              ? "Checking which books have a reader source…"
              : choices.length === 0
              ? "No book has a saved reader source yet."
              : "Only books with a saved reader source are listed."}
          </p>
          {currentWithoutSource && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              This book has no saved reader source any more. Pick another book.
            </p>
          )}
        </>
      )}
    </div>
  );
}
