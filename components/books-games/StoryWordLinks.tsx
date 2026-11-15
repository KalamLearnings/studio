"use client";

/**
 * StoryWordLinks (content model CM-S10, N11)
 *
 * The Arabic words of a book reader source. Each Arabic-script run that is
 * not a `{{word:<id>}}` token yet is matched to the word bank with the
 * spelling normaliser; the author confirms the match, or creates the missing
 * word (it enters the review queue), and every place with that text becomes a
 * token. Unlinked runs are errors when the backend requires references
 * (`BOOK_WORDS_REQUIRE_REFERENCES`), warnings otherwise. Linked words can be
 * unlinked back to their spelling.
 */

import * as React from "react";
import { AlertTriangle, Check, Link2, Loader2, Plus, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createWord } from "@/lib/api/words";
import { ApiError } from "@/lib/api/client";
import { parseWordSpellingError, plainSpellingIssue } from "@/lib/words/spelling";
import type { Word } from "@/lib/hooks/useWords";
import {
  confirmableGroups,
  linkWordInSource,
  storyPathLabel,
  unlinkWordInSource,
  type UnlinkedGroup,
  type WordLinkSummary,
} from "@/lib/books/storyWords";
import type { ReaderSourceContent } from "@/lib/books/readerSource";

interface StoryWordLinksProps {
  source: ReaderSourceContent;
  onChange: (next: ReaderSourceContent) => void;
  summary: WordLinkSummary<Word>;
  requireReferences: boolean;
  wordsLoading: boolean;
  /** Reloads the word library after a word is created. */
  onWordsChanged: () => Promise<void> | void;
}

function places(paths: string[]): string {
  return paths.map(storyPathLabel).join(", ");
}

function wordLabel(word: Pick<Word, "arabic" | "english">): React.ReactNode {
  return (
    <>
      <span className="font-arabic text-lg" dir="rtl">
        {word.arabic}
      </span>
      {word.english && <span className="text-muted-foreground"> ({word.english})</span>}
    </>
  );
}

function UnlinkedRow({
  group,
  requireReferences,
  onLink,
}: {
  group: UnlinkedGroup<Word>;
  requireReferences: boolean;
  onLink: (runText: string, wordId: string, fromCreate?: boolean) => void;
}) {
  const [english, setEnglish] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string[] | null>(null);
  const { match } = group;

  const create = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const { word, created } = await createWord({ arabic: group.text, english: english.trim() || undefined });
      onLink(group.text, word.id, true);
      toast.success(
        created
          ? `Created "${word.arabic}" and linked it. It is in the word review queue.`
          : `Linked to the existing word "${word.arabic}".`,
      );
    } catch (err) {
      const spelling = parseWordSpellingError(err instanceof ApiError ? err : null);
      if (spelling) setCreateError(spelling.messages);
      else toast.error(err instanceof Error ? err.message : "Could not create the word");
    } finally {
      setCreating(false);
    }
  };

  return (
    <li
      className={cn(
        "space-y-2 rounded-lg border p-3",
        requireReferences ? "border-destructive/40 bg-destructive/5" : "border-amber-500/60 bg-amber-50 dark:bg-amber-950/30",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-arabic text-xl" dir="rtl">
            {group.text}
          </span>
          <Badge variant={requireReferences ? "destructive" : "outline"}>
            {requireReferences ? "Not linked: blocks saving" : "Not linked"}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{places(group.paths)}</span>
      </div>

      {(match.kind === "exact" || match.kind === "reuse") && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            {match.kind === "exact" ? "In the word bank: " : "Same spelling as the word bank word "}
            {wordLabel(match.word)}
          </span>
          <Button size="sm" variant="outline" onClick={() => onLink(group.text, match.word.id)}>
            <Link2 className="mr-2 h-4 w-4" />
            Link
          </Button>
        </div>
      )}

      {match.kind === "new" && (
        <div className="space-y-2 text-sm">
          <p>
            Not in the word bank. It will be created as{" "}
            <span className="font-arabic text-lg" dir="rtl">
              {match.spelling}
            </span>
            {match.changed && " (the spelling is tidied)"} and enter the word review queue.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              placeholder="English meaning (optional)"
              className="h-8 max-w-xs"
              aria-label={`English meaning of ${group.text}`}
            />
            <Button size="sm" onClick={create} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create word and link
            </Button>
          </div>
          {createError && (
            <ul className="list-disc pl-5 text-destructive" role="alert">
              {createError.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {match.kind === "invalid" && (
        <div className="text-sm text-destructive" role="alert">
          <p>This is not a word the word bank can take. Fix the text:</p>
          <ul className="list-disc pl-5">
            {match.issues.map((issue, i) => (
              <li key={i}>{plainSpellingIssue(issue, match.spelling)}</li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export function StoryWordLinks({
  source,
  onChange,
  summary,
  requireReferences,
  wordsLoading,
  onWordsChanged,
}: StoryWordLinksProps) {
  // Keep the latest source for links made after an await (word creation).
  const latest = React.useRef(source);
  latest.current = source;

  const link = (runText: string, wordId: string, fromCreate = false) => {
    onChange(linkWordInSource(latest.current, runText, wordId));
    if (fromCreate) void onWordsChanged();
  };

  const confirmable = confirmableGroups(summary.unlinked);
  const linkAllMatches = () => {
    let next = latest.current;
    for (const g of confirmable) next = linkWordInSource(next, g.text, g.match.word.id);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-medium">Arabic words</h3>
          <p className="text-sm text-muted-foreground">
            Each Arabic word links to a word bank spelling. Linked words keep their exact spelling in every language
            and can be tapped to hear in the v2 reader.
          </p>
        </div>
        {confirmable.length > 1 && (
          <Button size="sm" variant="outline" onClick={linkAllMatches}>
            <Check className="mr-2 h-4 w-4" />
            Link all {confirmable.length} matches
          </Button>
        )}
      </div>

      {wordsLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading the word bank...
        </div>
      ) : (
        <>
          {summary.unlinked.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every Arabic word is linked.</p>
          ) : (
            <>
              {!requireReferences && (
                <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Unlinked words are saved as plain text for now. They will block saving once word links are required.
                </p>
              )}
              <ul className="space-y-2">
                {summary.unlinked.map((group) => (
                  <UnlinkedRow key={group.text} group={group} requireReferences={requireReferences} onLink={link} />
                ))}
              </ul>
            </>
          )}

          {summary.linked.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Linked ({summary.linked.length})</h4>
              <ul className="space-y-1">
                {summary.linked.map(({ wordId, word }) => (
                  <li
                    key={wordId}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm",
                      !word && "border-destructive/40 bg-destructive/5 text-destructive",
                    )}
                  >
                    <span>
                      {word ? wordLabel(word) : `${wordId} is not in the word bank (unknown or retired). Remove it and type the word again to link another.`}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onChange(unlinkWordInSource(latest.current, wordId, word?.arabic ?? ""))}
                      aria-label={word ? `Unlink ${word.arabic}` : `Remove ${wordId}`}
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
