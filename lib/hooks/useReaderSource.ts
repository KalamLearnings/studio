/**
 * React Query hooks for a book's reader source (content model CM-S10).
 * The save mutation leaves errors to the caller: a `READER_WORDS_INVALID`
 * refusal is shown at its locations, not as a toast.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getReaderSource, saveReaderSource } from '@/lib/api/bookReader';
import type { ReaderSourceContent } from '@/lib/books/readerSource';

const key = (bookId: string | null) => ['book-reader-source', bookId] as const;

export function useReaderSource(bookId: string | null) {
  return useQuery({
    queryKey: key(bookId),
    queryFn: () => getReaderSource(bookId!),
    enabled: !!bookId,
    staleTime: 60 * 1000,
  });
}

export function useSaveReaderSource(bookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: ReaderSourceContent) => saveReaderSource(bookId, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(bookId) }),
  });
}
