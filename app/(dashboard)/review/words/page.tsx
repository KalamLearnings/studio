"use client";

import * as React from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWordReviewQueue } from "@/lib/hooks/useWordReviewQueue";
import {
  exportDecisionsCsv,
  filterQueue,
  FLAG_LABELS,
  queueCounts,
  type QueueFilter,
  type QueueSlice,
  type ReviewNote,
} from "@/lib/words/review/queue";
import { toast } from "sonner";
import { clearReviewDecision, setReviewDecision } from "@/lib/api/wordReviewDecisions";
import { loadNotes, withNote } from "@/lib/words/review/notes";
import { WordReviewRow } from "./_components/WordReviewRow";

const PAGE = 50;

const STATUS_TABS: Array<{ value: QueueFilter; label: string }> = [
  { value: "todo", label: "To review" },
  { value: "reviewed", label: "Approved" },
  { value: "all", label: "All" },
];

const SLICES: Array<{ value: QueueSlice; label: string }> = [
  { value: "all", label: "Every class" },
  { value: "real_full", label: "Fully vowelled" },
  { value: "real_partial", label: "Partly vowelled" },
  { value: "case_variant", label: "Case-ending variants" },
  { value: "two_letters", label: FLAG_LABELS.two_letters },
  { value: "vowel_permutations", label: FLAG_LABELS.vowel_permutations },
  { value: "unused", label: FLAG_LABELS.unused },
];

export default function WordReviewPage() {
  const { query, rows, setReviewed } = useWordReviewQueue();
  const [status, setStatus] = React.useState<QueueFilter>("todo");
  const [slice, setSlice] = React.useState<QueueSlice>("all");
  const [search, setSearch] = React.useState("");
  const [limit, setLimit] = React.useState(PAGE);
  const [notes, setNotes] = React.useState<ReviewNote[]>([]);

  React.useEffect(() => {
    loadNotes()
      .then(setNotes)
      .catch((e) => toast.error(`Notes could not be loaded: ${e instanceof Error ? e.message : "unknown error"}`));
  }, []);

  const counts = React.useMemo(() => queueCounts(rows), [rows]);
  const shown = React.useMemo(() => filterQueue(rows, { status, slice, search }), [rows, status, slice, search]);
  const noteById = React.useMemo(() => new Map(notes.map((n) => [n.wordId, n])), [notes]);

  const onNote = React.useCallback((wordId: string, note: Omit<ReviewNote, "wordId"> | null) => {
    const full = note ? { ...note, wordId } : null;
    let before: ReviewNote | null = null;
    setNotes((prev) => {
      before = prev.find((n) => n.wordId === wordId) ?? null;
      return withNote(prev, wordId, full);
    });
    // Saved on the server; a failed save puts the previous note back.
    (full ? setReviewDecision(full) : clearReviewDecision(wordId)).catch((e) => {
      setNotes((prev) => withNote(prev, wordId, before));
      toast.error(`The note was not saved: ${e instanceof Error ? e.message : "unknown error"}`);
    });
  }, []);

  const exportCsv = () => {
    const csv = exportDecisionsCsv(rows, notes);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "word-review-decisions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Word review</h1>
          <p className="max-w-2xl text-muted-foreground">
            Real vowelled spellings, most used first. Approve a spelling to add it to the allow-list (it records who
            approved it and when). Pseudo and wrong-harakat notes are saved on the server for all reviewers and can be exported for the
            clean-up run; they change nothing in the bank.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={cn("mr-2 h-4 w-4", query.isFetching && "animate-spin")} /> Reload
          </Button>
          <Button type="button" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export decisions ({counts.reviewed} approved, {notes.length} noted)
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="tablist">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={status === t.value}
            onClick={() => { setStatus(t.value); setLimit(PAGE); }}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              status === t.value ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {t.label} ({counts[t.value]})
          </button>
        ))}
        <select
          aria-label="Class or flag"
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={slice}
          onChange={(e) => { setSlice(e.target.value as QueueSlice); setLimit(PAGE); }}
        >
          {SLICES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <Input
          dir="rtl"
          className="font-arabic w-48"
          placeholder="Search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setLimit(PAGE); }}
        />
      </div>

      {query.isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading the word bank...
        </div>
      )}
      {query.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          The word bank could not be loaded: {query.error instanceof Error ? query.error.message : "unknown error"}
        </p>
      )}
      {!query.isLoading && !query.error && shown.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          {rows.length === 0 ? "Nothing waits for review." : "No word matches this filter."}
        </p>
      )}

      <div className="space-y-3">
        {shown.slice(0, limit).map((row) => (
          <WordReviewRow
            key={row.word.id}
            row={row}
            note={noteById.get(row.word.id)}
            onReviewed={setReviewed}
            onNote={onNote}
          />
        ))}
      </div>
      {shown.length > limit && (
        <div className="text-center">
          <Button type="button" variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
            Show {Math.min(PAGE, shown.length - limit)} more ({shown.length - limit} left)
          </Button>
        </div>
      )}
    </div>
  );
}
