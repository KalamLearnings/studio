"use client";

/**
 * ReaderSourceEditor (content model CM-S10, N11)
 *
 * Edits a book's reader source, the English source the v2 reader's
 * translated and narrated editions are generated from
 * (`GET`/`PUT /books/admin/:bookId/reader/source`). v1's pages (`book_pages`,
 * the Pages tab) are separate and untouched; they can seed a first draft.
 *
 * Arabic words in the text are linked to word bank spellings in the
 * StoryWordLinks panel. Unlinked words are errors when the backend requires
 * references, warnings otherwise; the save answers the server's own check,
 * shown at each location.
 */

import * as React from "react";
import { BookOpen, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { useBook, useBookPages } from "@/lib/hooks/useBooks";
import { useWords } from "@/lib/hooks/useWords";
import { useReaderSource, useSaveReaderSource } from "@/lib/hooks/useReaderSource";
import { ReaderPageFields } from "@/components/books-games/ReaderPageFields";
import { StoryWordLinks } from "@/components/books-games/StoryWordLinks";
import {
  displayStoryText,
  issuesByPath,
  parseStoryWordsError,
  parseStoryWordWarnings,
  plainStoryWordIssue,
  storyPathLabel,
  wordLinkSummary,
  type StoryWordIssue,
} from "@/lib/books/storyWords";
import {
  blankPage,
  blankSource,
  draftFromV1Pages,
  newPageId,
  newRevision,
  pageLabel,
  pageProblems,
  prepareSource,
  sourceChanged,
  type ReaderPage,
  type ReaderSourceContent,
} from "@/lib/books/readerSource";

interface ServerIssues {
  /** true: the save was refused (READER_WORDS_INVALID); false: saved with warnings. */
  refused: boolean;
  issues: StoryWordIssue[];
}

export function ReaderSourceEditor({ bookId }: { bookId: string }) {
  const { data: view, isLoading, error } = useReaderSource(bookId);
  const { data: book } = useBook(bookId);
  const { data: v1Pages } = useBookPages(bookId);
  const { words, loading: wordsLoading, refetch: refetchWords } = useWords();
  const save = useSaveReaderSource(bookId);

  const [draft, setDraft] = React.useState<ReaderSourceContent | null>(null);
  const [server, setServer] = React.useState<ServerIssues | null>(null);

  // Start from the saved source once it loads; a local draft is kept across refetches.
  React.useEffect(() => {
    if (view?.source && !draft) setDraft(view.source.content);
  }, [view, draft]);

  const requireReferences = view?.require_word_references ?? false;
  const saved = view?.source?.content ?? null;

  const spelling = React.useMemo(() => new Map(words.map((w) => [w.id, w.arabic])), [words]);
  const spellingOf = React.useCallback((id: string) => spelling.get(id), [spelling]);
  const summary = React.useMemo(
    () => (draft ? wordLinkSummary(draft, words, requireReferences) : null),
    [draft, words, requireReferences],
  );
  const problems = React.useMemo(() => (draft ? pageProblems(draft) : []), [draft]);
  const serverByPath = React.useMemo(() => issuesByPath(server?.issues ?? []), [server]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
        Could not load the reader source: {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  if (!draft) {
    const title = book?.title ?? "";
    const hasV1 = (v1Pages?.length ?? 0) > 0;
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <BookOpen className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm font-medium">No reader source yet</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          The reader source is the English text the v2 reader&apos;s editions are translated and narrated from.
          The v1 pages stay as they are.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!hasV1}
            onClick={() => setDraft(draftFromV1Pages(title, v1Pages ?? []))}
          >
            Start from the v1 pages
          </Button>
          <Button size="sm" onClick={() => setDraft(blankSource(title))}>
            Start blank
          </Button>
        </div>
      </div>
    );
  }

  const changed = !saved || sourceChanged(draft, saved);
  const blocked = problems.length > 0 || !summary || summary.blocking || wordsLoading;
  const edition = draft.edition;

  const setPages = (pages: ReaderPage[]) => setDraft({ ...draft, edition: { ...edition, pages } });
  const updatePage = (i: number, page: ReaderPage) => setPages(edition.pages.map((p, j) => (j === i ? page : p)));
  const movePage = (i: number, delta: -1 | 1) => {
    const pages = [...edition.pages];
    const [page] = pages.splice(i, 1);
    pages.splice(i + delta, 0, page);
    setPages(pages);
  };

  const handleSave = () => {
    if (
      !confirm(
        "Saving queues translation and narration of this book for every live language, which uses paid services. Continue?",
      )
    ) {
      return;
    }
    const content = prepareSource(draft, newRevision());
    save.mutate(content, {
      onSuccess: (res) => {
        setDraft(content);
        const warnings = parseStoryWordWarnings(res.warnings);
        setServer(warnings.length ? { refused: false, issues: warnings } : null);
        toast.success(
          `Saved. ${res.queued} of ${res.locales.length} editions queued (${res.locales.join(", ")}).`,
        );
      },
      onError: (err) => {
        const issues = parseStoryWordsError(err instanceof ApiError ? err : null);
        if (issues) {
          setServer({ refused: true, issues });
          toast.error("Not saved: some Arabic words are not linked to the word bank.");
        } else {
          toast.error(err instanceof Error ? err.message : "Could not save the reader source");
        }
      },
    });
  };

  const titleIssues = serverByPath.get("edition.title") ?? [];
  const bookProblems = problems.filter((p) => !p.path.startsWith("edition.pages["));
  const otherServer = (server?.issues ?? []).filter(
    (i) => i.path !== "edition.title" && !/^edition\.pages\[\d+\]\.(text|illustration\.alt)$/.test(i.path),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">Reader source (v2)</h3>
          <p className="text-sm text-muted-foreground">
            English source text. Saving queues the translated and narrated editions; they publish when ready.
            {view?.source && ` Last saved source ${view.source.source_hash.slice(0, 8)}.`}
          </p>
        </div>
        <Button onClick={handleSave} disabled={!changed || blocked || save.isPending}>
          {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save source
        </Button>
      </div>

      {server && server.issues.length > 0 && (
        <div
          className={
            server.refused
              ? "rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              : "rounded-md border border-amber-500/60 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
          }
          role="alert"
        >
          <p className="font-medium">
            {server.refused ? "The last save was refused:" : "Saved with Arabic text kept as plain text:"}
          </p>
          <ul className="mt-1 list-disc pl-5">
            {server.issues.map((issue, i) => (
              <li key={i}>
                {storyPathLabel(issue.path)}: {plainStoryWordIssue(issue, spellingOf)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reader-title">Title</Label>
            <Input
              id="reader-title"
              value={edition.title}
              onChange={(e) => setDraft({ ...draft, edition: { ...edition, title: e.target.value } })}
              dir="auto"
            />
            {displayStoryText(edition.title, spellingOf) !== edition.title && (
              <p className="text-sm text-muted-foreground" dir="auto">
                {displayStoryText(edition.title, spellingOf)}
              </p>
            )}
            {[...bookProblems.map((p) => `${pageLabel(p.path)}: ${p.message}`), ...titleIssues.map((i) => plainStoryWordIssue(i, spellingOf))].map(
              (m) => (
                <p key={m} className="text-sm text-destructive" role="alert">
                  {m}
                </p>
              ),
            )}
          </div>

          {edition.pages.map((page, i) => (
            <ReaderPageFields
              key={page.id}
              page={page}
              index={i}
              count={edition.pages.length}
              onChange={(p) => updatePage(i, p)}
              onMove={(delta) => movePage(i, delta)}
              onRemove={() => setPages(edition.pages.filter((_, j) => j !== i))}
              spellingOf={spellingOf}
              problems={problems.filter((p) => p.path === `edition.pages[${i}]`)}
              serverIssues={serverByPath}
            />
          ))}
          <Button variant="outline" size="sm" onClick={() => setPages([...edition.pages, blankPage(newPageId(edition.pages))])}>
            <Plus className="mr-2 h-4 w-4" />
            Add page
          </Button>

          {draft.assessment && (
            <p className="text-sm text-muted-foreground">
              Comprehension questions: {draft.assessment.questions.length}, kept as saved. Their Arabic words are
              linked here too.
            </p>
          )}
          {otherServer.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-destructive" role="alert">
              {otherServer.map((issue, i) => (
                <li key={i}>
                  {storyPathLabel(issue.path)}: {plainStoryWordIssue(issue, spellingOf)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          {summary && (
            <StoryWordLinks
              source={draft}
              onChange={(next) => setDraft(next)}
              summary={summary}
              requireReferences={requireReferences}
              wordsLoading={wordsLoading}
              onWordsChanged={refetchWords}
            />
          )}
        </div>
      </div>
    </div>
  );
}
