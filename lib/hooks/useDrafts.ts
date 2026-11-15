/** React Query hooks for the AI drafts queue (CM-S9). */

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  approveDraft,
  listNodeDrafts,
  listWordRequests,
  rejectDraft,
  requestNodeDraft,
  setExemplar,
} from '@/lib/api/generation';
import { describeGenerationError } from '@/lib/generation/drafts';

const DRAFTS_KEY = 'generation-drafts';

export function useNodeDrafts(nodeIds: string[]) {
  return useQueries({
    queries: nodeIds.map((nodeId) => ({
      queryKey: [DRAFTS_KEY, nodeId],
      queryFn: () => listNodeDrafts(nodeId),
      staleTime: 30_000,
    })),
  });
}

export function useWordRequests() {
  return useQuery({ queryKey: ['word-requests', 'open'], queryFn: () => listWordRequests('open'), staleTime: 30_000 });
}

export function useDraftActions() {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: [DRAFTS_KEY] });
    void qc.invalidateQueries({ queryKey: ['word-requests'] });
  };
  const onError = (e: unknown) => toast.error(describeGenerationError(e));

  return {
    approve: useMutation({
      mutationFn: approveDraft,
      onSuccess: () => { refresh(); toast.success('Approved. Publish it as usual from the builder.'); },
      onError,
    }),
    reject: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectDraft(id, reason),
      onSuccess: () => { refresh(); toast.success('Rejected.'); },
      onError,
    }),
    exemplar: useMutation({
      mutationFn: ({ id, value }: { id: string; value: boolean }) => setExemplar(id, value),
      onSuccess: (_d, { value }) => {
        refresh();
        void qc.invalidateQueries({ queryKey: ['activities'] });
        void qc.invalidateQueries({ queryKey: ['all-activities'] });
        toast.success(value ? 'Marked as an exemplar.' : 'No longer an exemplar.');
      },
      onError,
    }),
    request: useMutation({
      mutationFn: ({ nodeId, type }: { nodeId: string; type: string }) => requestNodeDraft(nodeId, { type }),
      // The page shows the outcome or the refusal beside the button.
      onSuccess: refresh,
    }),
  };
}
