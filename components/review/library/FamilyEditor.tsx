"use client";

/**
 * The family editor's sections (CM-S5; details, spellings, concept links),
 * composed by the Family sub-view in Review's pane (`LibraryPane`), which
 * puts Save in the decision bar. The old `/families` page is gone (CG-8).
 *
 * Every spelling action saves at once; the details save with Save. Changing
 * a family, a spelling's family or reading, or a concept link needs a
 * curriculum lead or phrase reviewer (`useCanConnect`); Mark reviewed does not.
 */

import * as React from "react";
import { Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NotReviewedBadge } from "@/components/families/NotReviewedBadge";
import { WordPicker } from "@/components/families/WordPicker";
import { ApiError } from "@/lib/api/client";
import type { ConceptDetail, CuratedWord, WordFamilyDetail } from "@/lib/types/wordFamilies";
import { awaitsReadsAs, familyErrorText, joinableWords, readsAsCandidates } from "@/lib/words/family";
import { cn } from "@/lib/utils";
import { useLibraryApi } from "./api";
import { ConnectLocked, useCanConnect } from "./access";
import { connectionsHref } from "../context/ShowConnections";

export const familyErrText = (e: unknown, fallback: string) =>
  e instanceof ApiError ? familyErrorText(e.code, e.message) : e instanceof Error ? e.message : fallback;

/** Runs one save: a toast for the outcome, then `onChanged`. */
export function useEditorRun(onChanged: () => Promise<void> | void, describe: (e: unknown) => string) {
  const [busy, setBusy] = React.useState(false);
  const run = React.useCallback(
    async (fn: () => Promise<unknown>, done: string) => {
      setBusy(true);
      try {
        await fn();
        toast.success(done);
        await onChanged();
      } catch (e) {
        toast.error(describe(e));
      } finally {
        setBusy(false);
      }
    },
    [onChanged, describe],
  );
  return { busy, run };
}

export const describeFamilyError = (e: unknown) => familyErrText(e, "Save failed");

// ---- details --------------------------------------------------------------------------

export interface FamilyForm {
  gloss: string;
  setGloss: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  headword: string;
  setHeadword: (v: string) => void;
  dirty: boolean;
  save: () => Promise<void>;
}

/** The details' draft state and Save. Remount (key on `updated_at`) to reset it after a save. */
export function useFamilyForm(family: WordFamilyDetail, run: ReturnType<typeof useEditorRun>["run"]): FamilyForm {
  const api = useLibraryApi();
  const [gloss, setGloss] = React.useState(family.gloss_en ?? "");
  const [notes, setNotes] = React.useState(family.notes ?? "");
  const [headword, setHeadword] = React.useState(family.headword_id ?? "");
  const dirty = gloss !== (family.gloss_en ?? "") || notes !== (family.notes ?? "") || headword !== (family.headword_id ?? "");
  const save = () =>
    run(
      () =>
        api.updateWordFamily(family.id, {
          glossEn: gloss.trim() || null,
          notes: notes.trim() || null,
          headwordId: headword || null,
        }),
      "Family saved",
    );
  return { gloss, setGloss, notes, setNotes, headword, setHeadword, dirty, save };
}

export function FamilyDetailsFields({ family, form }: { family: WordFamilyDetail; form: FamilyForm }) {
  const live = family.members.filter((m) => m.retired_at === null);
  const id = React.useId();
  // The details save through `PATCH /words/families/:id`, a connection route.
  const readOnly = !useCanConnect();
  return (
    <div className="space-y-4">
      {readOnly && <ConnectLocked>The details are read only.</ConnectLocked>}
      <div className="space-y-1">
        <Label htmlFor={`${id}-gloss`}>English gloss</Label>
        <Input id={`${id}-gloss`} readOnly={readOnly} value={form.gloss} onChange={(e) => form.setGloss(e.target.value)} maxLength={200} />
        <p className="text-xs text-muted-foreground">The source text for translations into other languages. Arabic is never translated.</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${id}-head`}>Headword (the fully vowelled form shown in a dictionary)</Label>
        <select
          id={`${id}-head`}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={form.headword}
          disabled={readOnly}
          onChange={(e) => form.setHeadword(e.target.value)}
        >
          <option value="">None</option>
          {live.map((m) => (
            <option key={m.id} value={m.id}>
              {m.arabic} ({m.id})
            </option>
          ))}
        </select>
        {live.length === 0 && <p className="text-xs text-muted-foreground">Add a spelling below first.</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${id}-notes`}>Notes</Label>
        <Textarea id={`${id}-notes`} readOnly={readOnly} value={form.notes} onChange={(e) => form.setNotes(e.target.value)} maxLength={2000} placeholder="Plural, root, gender..." />
      </div>
    </div>
  );
}

// ---- spellings ------------------------------------------------------------------------

export function FamilySpellings({
  family,
  pool,
  busy,
  run,
  onWordChanged,
  currentWordId,
}: {
  family: WordFamilyDetail;
  pool: readonly CuratedWord[];
  busy: boolean;
  run: ReturnType<typeof useEditorRun>["run"];
  /** The server's row after a spelling change, so a caller can patch its own copy. */
  onWordChanged?: (word: CuratedWord) => void;
  /** Highlights the spelling the reviewer came from. */
  currentWordId?: string | null;
}) {
  const api = useLibraryApi();
  const canConnect = useCanConnect();
  const patch = (w: CuratedWord) => onWordChanged?.(w);
  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-md border">
        {family.members.map((m) => (
          <SpellingRow
            key={m.id}
            word={m}
            pool={pool}
            busy={busy}
            canConnect={canConnect}
            current={m.id === currentWordId}
            isHeadword={family.headword_id === m.id}
            onReviewed={(reviewed) => run(() => api.setWordReviewed(m.id, reviewed).then(patch), reviewed ? "Marked reviewed" : "Review withdrawn")}
            onReadsAs={(target) => run(() => api.setWordReadsAs(m.id, target).then(patch), target ? "Reading saved" : "Reading cleared")}
            onRemove={() => run(() => api.setWordFamily(m.id, null).then(patch), "Removed from the family")}
          />
        ))}
        {family.members.length === 0 && <li className="p-3 text-sm text-muted-foreground">No spellings yet.</li>}
      </ul>
      {canConnect ? (
        <>
          <Label>Add a spelling</Label>
          <WordPicker
            words={joinableWords(pool, family.id)}
            onPick={(w) =>
              run(() => api.setWordFamily(w.id, family.id).then(patch), w.family_id ? `Moved ${w.arabic} here from ${w.family_id}` : "Spelling added")
            }
          />
          <p className="text-xs text-muted-foreground">Adding a spelling that is in another family moves it here, and says so.</p>
        </>
      ) : (
        <ConnectLocked>Adding, moving or removing spellings and confirming readings is read only.</ConnectLocked>
      )}
    </div>
  );
}

function SpellingRow({
  word,
  pool,
  busy,
  canConnect,
  current,
  isHeadword,
  onReviewed,
  onReadsAs,
  onRemove,
}: {
  word: CuratedWord;
  pool: readonly CuratedWord[];
  busy: boolean;
  canConnect: boolean;
  current: boolean;
  isHeadword: boolean;
  onReviewed: (reviewed: boolean) => void;
  onReadsAs: (target: string | null) => void;
  onRemove: () => void;
}) {
  const candidates = React.useMemo(() => readsAsCandidates(word, pool), [word, pool]);
  const readsAsWord = word.reads_as_id ? pool.find((w) => w.id === word.reads_as_id) : undefined;
  const [choice, setChoice] = React.useState("");
  const awaiting = awaitsReadsAs(word);
  const retired = word.retired_at !== null;

  return (
    <li className={cn("space-y-2 p-3", current && "bg-primary/10")} aria-current={current ? "true" : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-arabic text-2xl" dir="rtl" lang="ar">
            {word.arabic}
          </span>
          <span className="text-xs text-muted-foreground">{word.id}</span>
          {isHeadword && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">Headword</span>}
          {retired && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Retired</span>}
          <NotReviewedBadge word={word} />
          {awaiting && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-[hsl(30_80%_35%)] dark:text-warning">Reading not confirmed</span>}
        </div>
        {!retired && (
          <div className="flex gap-2">
            {word.reviewed_at === null ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onReviewed(true)}>
                Mark reviewed
              </Button>
            ) : (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onReviewed(false)}>
                Withdraw review
              </Button>
            )}
            {canConnect && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={onRemove}>
                Remove
              </Button>
            )}
          </div>
        )}
      </div>

      {!retired && (word.reads_as_id || awaiting) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Volume2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {word.reads_as_id ? (
            <>
              <span>Read as</span>
              <span className="font-arabic text-xl" dir="rtl" lang="ar">
                {readsAsWord?.arabic ?? word.reads_as_id}
              </span>
              {canConnect && (
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => onReadsAs(null)}>
                  Clear
                </Button>
              )}
            </>
          ) : !canConnect ? (
            <span className="text-muted-foreground">Reading not confirmed yet.</span>
          ) : candidates.length > 0 ? (
            <>
              <span>Read as</span>
              <select
                aria-label={`Reading of ${word.arabic}`}
                className="h-9 rounded-md border border-input bg-background px-2"
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
              >
                <option value="">Pick the vowelled spelling...</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.arabic} ({c.id})
                  </option>
                ))}
              </select>
              <Button size="sm" disabled={!choice || busy} onClick={() => onReadsAs(choice)}>
                Confirm reading
              </Button>
            </>
          ) : (
            <span className="text-muted-foreground">
              No fully vowelled spelling with the same letters exists yet. Add one to the library, then confirm the reading.
            </span>
          )}
        </div>
      )}
    </li>
  );
}

// ---- concept links --------------------------------------------------------------------

export function FamilyConceptLinks({
  family,
  concepts,
  busy,
  run,
  onConceptsChanged,
  onOpenConcept,
}: {
  family: WordFamilyDetail;
  /** Every concept with its families; null while they load. */
  concepts: readonly ConceptDetail[] | null;
  busy: boolean;
  run: ReturnType<typeof useEditorRun>["run"];
  onConceptsChanged: () => Promise<unknown> | void;
  /** Opens a concept in place; without it the name links to the old concepts page. */
  onOpenConcept?: (slug: string) => void;
}) {
  const api = useLibraryApi();
  const canConnect = useCanConnect();
  const list = concepts ?? [];
  const linked = list.filter((c) => c.families.some((f) => f.id === family.id));
  const unlinked = list.filter((c) => !linked.includes(c));
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">A family gets its picture through the concept it names. Pictures are chosen on the concept.</p>
      <ul className="divide-y rounded-md border">
        {linked.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 p-3">
            <span className="flex min-w-0 items-center gap-3">
              {c.pictures[0] && (
                // eslint-disable-next-line @next/next/no-img-element -- asset URLs come from storage
                <img src={c.pictures[0].url} alt="" className="h-10 w-10 shrink-0 object-contain" />
              )}
              {onOpenConcept ? (
                <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => onOpenConcept(c.slug)}>
                  {c.name.en}
                </button>
              ) : (
                <a href={connectionsHref(`concept:${c.slug}`)} className="text-sm font-medium underline">
                  {c.name.en}
                </a>
              )}
              <span className="text-xs text-muted-foreground">
                {c.pictures.length === 0 ? "no picture yet" : `${c.pictures.length} picture${c.pictures.length === 1 ? "" : "s"}`}
              </span>
            </span>
            {canConnect && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => run(() => api.unlinkFamilyFromConcept(family.id, c.slug).then(onConceptsChanged), "Concept unlinked")}
              >
                Unlink
              </Button>
            )}
          </li>
        ))}
        {concepts === null && <li className="p-3 text-sm text-muted-foreground">Loading concepts...</li>}
        {concepts !== null && linked.length === 0 && <li className="p-3 text-sm text-muted-foreground">No concept linked.</li>}
      </ul>
      {!canConnect && <ConnectLocked />}
      {canConnect && <select
        aria-label="Link a concept"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value=""
        disabled={busy || concepts === null}
        onChange={(e) => {
          const slug = e.target.value;
          if (slug) void run(() => api.linkFamilyToConcept(family.id, slug).then(onConceptsChanged), "Concept linked");
        }}
      >
        <option value="">Link a concept...</option>
        {unlinked.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.name.en} ({c.slug})
          </option>
        ))}
      </select>}
    </div>
  );
}
