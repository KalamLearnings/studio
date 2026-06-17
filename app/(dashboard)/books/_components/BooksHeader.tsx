"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BooksHeaderProps {
  onCreateBook: () => void;
}

export function BooksHeader({ onCreateBook }: BooksHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Books</h1>
        <p className="text-muted-foreground">
          Create and manage reading books for learners
        </p>
      </div>
      <Button onClick={onCreateBook}>
        <Plus className="mr-2 h-4 w-4" />
        Create Book
      </Button>
    </div>
  );
}
