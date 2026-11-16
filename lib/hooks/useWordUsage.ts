import { useQuery } from '@tanstack/react-query';
import { getWordUsage } from '@/lib/api/wordUsage';

/** A word's uses (CM-USAGE), loaded when the word is opened. */
export function useWordUsage(wordId: string | null) {
  return useQuery({
    queryKey: ['word-usage', wordId],
    queryFn: () => getWordUsage(wordId as string),
    enabled: !!wordId,
    staleTime: 60_000,
  });
}
