/**
 * The book reader source on the `books` edge function (content model CM-S10).
 * Staff only. Every refusal is an `ApiError` with the backend's code and
 * details (`READER_WORDS_INVALID` issues are read by lib/books/storyWords.ts).
 */

import { fetchWithAuth } from '@/lib/api/client';
import type { ReaderSourceContent, ReaderSourceSaved, ReaderSourceView } from '@/lib/books/readerSource';

const enc = encodeURIComponent;

/** `GET /books/admin/:bookId/reader/source`: the saved source, or null. Writes nothing. */
export async function getReaderSource(bookId: string): Promise<ReaderSourceView> {
  return fetchWithAuth<ReaderSourceView>(`/books/admin/${enc(bookId)}/reader/source`);
}

/**
 * `PUT /books/admin/:bookId/reader/source`: saves the source and queues the
 * translated, narrated editions of every live locale (spends translation and
 * TTS credit). Answers what was queued, not a publication.
 */
export async function saveReaderSource(bookId: string, content: ReaderSourceContent): Promise<ReaderSourceSaved> {
  return fetchWithAuth<ReaderSourceSaved>(`/books/admin/${enc(bookId)}/reader/source`, {
    method: 'PUT',
    body: JSON.stringify(content),
  });
}
