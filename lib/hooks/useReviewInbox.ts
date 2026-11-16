/**
 * The Review inbox (CW-3): composes the existing source hooks into one list
 * of `InboxItem`s, with per-source loading and errors, refetch on focus,
 * optimistic decisions and Undo (the inverse route, or a 5 s hold before a
 * one-way decision is sent; `lib/review/decisions.ts`).
 *
 * Only the sources of the kinds asked for are read: a kind joins Review when
 * its lens is registered (components/review/lenses). To add a source, add its
 * query below with `enabled: wants(<kind>)`, a `SourceState` row, and its
 * normaliser call in `items` (see components/review/README.md).
 */

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listWordFamilies } from "@/lib/api/wordFamilies";
import { useCurriculumLead } from "@/lib/hooks/useCurriculumLead";
import { usePhraseReviewer } from "@/lib/hooks/usePhraseReviewer";
import { useReviewDraftPhraseSources } from "@/lib/hooks/useReviewDraftPhraseSources";
import { useWordReviewQueue, WORD_REVIEW_KEY } from "@/lib/hooks/useWordReviewQueue";
import { getClientForEnv } from "@/lib/supabase/client";
import { useEnvironmentStore } from "@/lib/stores/environmentStore";
import type { WordFamily } from "@/lib/types/wordFamilies";
import { loadNotes, withNote } from "@/lib/words/review/notes";
import type { ReviewNote } from "@/lib/words/review/queue";
import type { DecisionSpec } from "@/lib/review/actions/types";
import type { WordCache } from "@/lib/review/actions/words";
import { DecisionLedger, type Decision } from "@/lib/review/decisions";
import { countInbox, type InboxCounts, type InboxItem, type InboxKind, type ReviewRoles } from "@/lib/review/inbox";
import { wordItems, type BankWord } from "@/lib/review/normalise/words";
import {
  applyOverlays,
  clearSessionError,
  EMPTY_SESSION,
  sessionChanged,
  sessionSubmitted,
  type InboxSession,
} from "@/lib/review/session";

export const WORD_NOTES_KEY = ["word-review-notes"] as const;
export const WORD_FAMILIES_KEY = ["word-families"] as const;

/** Sources are read again on window focus when older than this. */
const FOCUS_REFETCH_AFTER_MS = 30_000;

export interface SourceState {
  id: string;
  /** "Spellings and readings could not be loaded". */
  label: string;
  status: "loading" | "ready" | "error";
  error: string | null;
  updatedAt: number;
  retry: () => void;
}

/** Rows the panes look things up in (family members, other spellings, candidates). */
export interface ReviewBank {
  words: BankWord[];
  wordsById: ReadonlyMap<string, BankWord>;
  families: WordFamily[];
  familiesById: ReadonlyMap<string, WordFamily>;
  familiesStatus: SourceState["status"];
}

export interface ReviewInbox {
  items: InboxItem[];
  sources: SourceState[];
  /** True until every source has answered once. */
  loading: boolean;
  roles: ReviewRoles;
  userId: string | null;
  counts: InboxCounts;
  bank: ReviewBank;
  wordCache: WordCache;
  session: InboxSession;
  decide: (spec: DecisionSpec) => void;
  undo: () => void;
  clearError: (itemKey: string) => void;
  refetchAll: () => void;
  /** The newest time any source was read. */
  updatedAt: number;
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : "unknown error");

function sourceState(
  id: string,
  label: string,
  q: { isPending: boolean; isError: boolean; error: unknown; dataUpdatedAt: number; refetch: () => unknown },
): SourceState {
  return {
    id,
    label,
    status: q.isError ? "error" : q.isPending ? "loading" : "ready",
    error: q.isError ? errorText(q.error) : null,
    updatedAt: q.dataUpdatedAt,
    retry: () => void q.refetch(),
  };
}

function useStaffUserId(): string | null {
  const { environment } = useEnvironmentStore();
  const [id, setId] = React.useState<string | null>(null);
  React.useEffect(() => {
    let live = true;
    getClientForEnv(environment)
      .auth.getUser()
      .then(({ data: { user } }) => live && setId(user?.id ?? null))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [environment]);
  return id;
}

export function useReviewInbox(kinds: readonly InboxKind[]): ReviewInbox {
  const queryClient = useQueryClient();
  const wants = (k: InboxKind) => kinds.includes(k);
  const wantsWords = wants("spelling") || wants("reading");

  // ---- sources (existing hooks first) --------------------------------------------
  const { query: wordsQuery } = useWordReviewQueue();
  const notesQuery = useQuery({ queryKey: WORD_NOTES_KEY, queryFn: loadNotes, enabled: wantsWords, staleTime: 60_000 });
  const familiesQuery = useQuery({ queryKey: WORD_FAMILIES_KEY, queryFn: listWordFamilies, enabled: wantsWords, staleTime: 5 * 60_000 });
  // CW-6 adds `useBlendReviewQueue(wants("blend"))`; each source with a SourceState row below and its normaliser in `items`.
  // CW-7 and CW-8: drafts, word requests, phrases and recordings.
  const draftPhrase = useReviewDraftPhraseSources(kinds);

  const curriculumLead = useCurriculumLead();
  const phraseReviewer = usePhraseReviewer();
  const roles = React.useMemo<ReviewRoles>(() => ({ curriculumLead, phraseReviewer }), [curriculumLead, phraseReviewer]);
  const userId = useStaffUserId();

  const sources = React.useMemo<SourceState[]>(() => {
    const out: SourceState[] = [];
    if (wantsWords) {
      out.push(sourceState("words", "Spellings and readings", wordsQuery));
      out.push(sourceState("notes", "Word notes", notesQuery));
    }
    out.push(...draftPhrase.sources);
    return out;
    // The query objects change identity on every render; their fields are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    wantsWords,
    wordsQuery.status, wordsQuery.dataUpdatedAt, wordsQuery.error,
    notesQuery.status, notesQuery.dataUpdatedAt, notesQuery.error,
    draftPhrase.sources,
  ]);

  // ---- items -----------------------------------------------------------------------
  const words = (wordsQuery.data ?? []) as BankWord[];
  const sourceItems = React.useMemo<InboxItem[]>(() => {
    const out: InboxItem[] = [];
    if (wantsWords && wordsQuery.data) {
      for (const it of wordItems(wordsQuery.data as BankWord[], notesQuery.data ?? [])) if (wants(it.kind)) out.push(it);
    }
    out.push(...draftPhrase.items);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsQuery.data, notesQuery.data, wantsWords, kinds.join(","), draftPhrase.items]);

  const [session, setSession] = React.useState<InboxSession>(EMPTY_SESSION);
  const items = React.useMemo(() => applyOverlays(sourceItems, session.overlays), [sourceItems, session.overlays]);
  const counts = React.useMemo(() => countInbox(items, roles), [items, roles]);

  const families = familiesQuery.data ?? [];
  const bank = React.useMemo<ReviewBank>(
    () => ({
      words,
      wordsById: new Map(words.map((w) => [w.id, w])),
      families,
      familiesById: new Map(families.map((f) => [f.id, f])),
      familiesStatus: familiesQuery.isError ? "error" : familiesQuery.isPending ? "loading" : "ready",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wordsQuery.data, familiesQuery.data, familiesQuery.status],
  );

  // ---- cache writers ----------------------------------------------------------------
  const wordCache = React.useMemo<WordCache>(
    () => ({
      patchWord: (wordId, patch) =>
        queryClient.setQueryData<BankWord[]>(WORD_REVIEW_KEY, (old) => old?.map((w) => (w.id === wordId ? { ...w, ...patch } : w))),
      setNote: (wordId, note) => queryClient.setQueryData<ReviewNote[]>(WORD_NOTES_KEY, (old) => withNote(old ?? [], wordId, note)),
    }),
    [queryClient],
  );

  // ---- decisions ------------------------------------------------------------------
  const specs = React.useRef(new Map<number, DecisionSpec>());
  const submitting = React.useRef<DecisionSpec | null>(null);
  const ledgerRef = React.useRef<DecisionLedger | null>(null);
  if (!ledgerRef.current) {
    ledgerRef.current = new DecisionLedger({
      onChange: (d: Decision) => {
        const fresh = submitting.current;
        if (fresh) {
          submitting.current = null;
          specs.current.set(d.id, fresh);
          setSession((s) => sessionSubmitted(s, d, fresh.optimistic));
          return;
        }
        const spec = specs.current.get(d.id);
        if (!spec) return;
        setSession((s) => sessionChanged(s, d, spec.describeError));
        if (d.status === "failed" && !spec.quiet) {
          toast.dismiss(`decision-${d.id}`);
          toast.error(spec.describeError(d.error));
        }
        if (d.status === "undo_failed") toast.error(`Undo failed: ${spec.describeError(d.error)}`);
      },
    });
  }
  const ledger = ledgerRef.current;

  const undo = React.useCallback(() => {
    void ledger.undo().then((d) => {
      if (d && (d.status === "cancelled" || d.status === "undone" || d.status === "undoing")) toast.dismiss(`decision-${d.id}`);
    });
  }, [ledger]);

  const decide = React.useCallback(
    (spec: DecisionSpec) => {
      submitting.current = spec;
      const d = ledger.submit({ itemKey: spec.item.key, mode: spec.mode, run: spec.run, undo: spec.undo });
      if (spec.quiet) return;
      toast(
        React.createElement(
          "span",
          null,
          spec.message.text,
          spec.message.arabic
            ? React.createElement("span", { lang: "ar", dir: "rtl", className: "font-naskh ms-1.5 text-base [unicode-bidi:isolate]" }, spec.message.arabic)
            : null,
        ),
        { id: `decision-${d.id}`, duration: 5_000, action: { label: "Undo (u)", onClick: () => undo() } },
      );
    },
    [ledger, undo],
  );

  // Held decisions are sent when the page goes away, never dropped.
  React.useEffect(() => {
    const flush = () => ledger.flush();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [ledger]);

  const clearError = React.useCallback((itemKey: string) => setSession((s) => clearSessionError(s, itemKey)), []);

  // ---- refetching ------------------------------------------------------------------
  const refetchAll = React.useCallback(() => {
    if (wantsWords) {
      void wordsQuery.refetch();
      void notesQuery.refetch();
      void familiesQuery.refetch();
    }
    draftPhrase.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsWords, draftPhrase.refetch]);

  const updatedAt = Math.max(0, ...sources.map((s) => s.updatedAt));
  const updatedRef = React.useRef(updatedAt);
  updatedRef.current = updatedAt;
  React.useEffect(() => {
    const onFocus = () => {
      // Never refetch under an open decision: the overlay and the answer would race.
      if (ledger.open().length === 0 && Date.now() - updatedRef.current > FOCUS_REFETCH_AFTER_MS) refetchAll();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [ledger, refetchAll]);

  return {
    items,
    sources,
    loading: sources.length > 0 && sources.every((s) => s.status === "loading"),
    roles,
    userId,
    counts,
    bank,
    wordCache,
    session,
    decide,
    undo,
    clearError,
    refetchAll,
    updatedAt,
  };
}
