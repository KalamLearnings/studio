"use client";

import type { Book } from "@/lib/api/books";
import { BookCard } from "./BookCard";

interface BooksGridProps {
  books: Book[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (book: Book) => void;
}

export function BooksGrid({
  books,
  onEdit,
  onDelete,
  onToggleActive,
}: BooksGridProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {books.map((book, index) => (
        <BookCard
          key={book.id}
          book={book}
          colorIndex={index}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
}
