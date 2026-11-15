"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Plus, Search, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import {
  createWordFamily,
  getWordFamily,
  listCuratedWords,
  listWordFamilies,
  setWordFamily,
  setWordReadsAs,
  setWordReviewed,
  updateWordFamily,
} from "@/lib/api/wordFamilies";
import { linkFamilyToConcept, loadConceptDetails, unlinkFamilyFromConcept } from "@/lib/api/concepts";
import type { ConceptDetail, CuratedWord, WordFamily, WordFamilyDetail } from "@/lib/types/wordFamilies";
import { NotReviewedBadge } from "@/components/families/NotReviewedBadge";
import { WordPicker } from "@/components/families/WordPicker";
import {
  awaitsReadsAs,
  familyErrorText,
  isSlug,
  joinableWords,
  readsAsCandidates,
  slugFromText,
} from "@/lib/words/family";

const errText = (e: unknown, fallback: string) =>
  e instanceof ApiError ? familyErrorText(e.code, e.message) : e instanceof Error ? e.message : fallback;

export default function FamiliesPage() {
  const [families, setFamilies] = React.useState<WordFamily[]>([]);
  const [words, setWords] = React.useState<CuratedWord[]>([]);
  const [concepts, setConcepts] = React.useState<ConceptDetail[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<WordFamilyDetail | null>(null);
  const [creating, setCreating] = React.useState(false);

  const wordsById = React.useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [f, w] = await Promise.all([listWordFamilies(), listCuratedWords()]);
      setFamilies(f);
      setWords(w);
      loadConceptDetails().then(setConcepts).catch(() => setConcepts([]));
    } catch (e) {
      setError(errText(e, "Failed to load word families"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const loadDetail = React.useCallback(async (id: string) => {
    try {
      setDetail(await getWordFamily(id));
    } catch (e) {
      toast.error(errText(e, "Failed to load the family"));
    }
  }, []);

  React.useEffect(() => {
    setDetail(null);
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  /** Reloads the open family, the list and the spelling pool after a change. */
  const refresh = React.useCallback(async () => {
    const [f, w] = await Promise.all([listWordFamilies(), listCuratedWords()]);
    setFamilies(f);
    setWords(w);
    if (selectedId) await loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const q = search.trim().toLowerCase();
  const shown = families.filter((f) => {
    if (!q) return true;
    const head = f.headword_id ? wordsById.get(f.headword_id)?.arabic ?? "" : "";
    return f.id.includes(q) || (f.gloss_en ?? "").toLowerCase().includes(q) || head.includes(search.trim());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Word families</h1>
          <p className="text-muted-foreground">
            A family groups the spellings of one word under a headword and an English gloss.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New family
        </Button>
      </div>

      {error && <div className="rounded-lg border border-destructive/50 p-4 text-center text-destructive">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search id, gloss or headword..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ul className="max-h-[70vh] divide-y overflow-y-auto rounded-md border">
              {shown.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(f.id)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted ${selectedId === f.id ? "bg-muted" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{f.gloss_en ?? f.id}</span>
                      <span className="block truncate text-xs text-muted-foreground">{f.id}</span>
                    </span>
                    <span className="font-arabic text-xl" dir="rtl">
                      {f.headword_id ? wordsById.get(f.headword_id)?.arabic ?? "" : ""}
                    </span>
                  </button>
                </li>
              ))}
              {shown.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">No families.</li>}
            </ul>
          )}
        </div>

        <div>
          {!selectedId && <p className="py-10 text-center text-muted-foreground">Pick a family, or create one.</p>}
          {selectedId && !detail && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {detail && (
            <FamilyEditor
              key={detail.id + (detail.updated_at ?? "")}
              family={detail}
              pool={words}
              concepts={concepts}
              onChanged={refresh}
              onConceptsChanged={() => loadConceptDetails().then(setConcepts).catch(() => undefined)}
            />
          )}
        </div>
      </div>

      <CreateFamilyDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={async (id) => {
          setCreating(false);
          await refresh();
          setSelectedId(id);
        }}
      />
    </div>
  );
}

function CreateFamilyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void | Promise<void>;
}) {
  const [gloss, setGloss] = React.useState("");
  const [id, setId] = React.useState("");
  const [idTouched, setIdTouched] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const effectiveId = idTouched ? id : slugFromText(gloss) ?? "";
  const valid = isSlug(effectiveId);

  const save = async () => {
    setBusy(true);
    try {
      await createWordFamily({ id: effectiveId, glossEn: gloss.trim() || null });
      toast.success("Family created");
      setGloss("");
      setId("");
      setIdTouched(false);
      await onCreated(effectiveId);
    } catch (e) {
      toast.error(errText(e, "Failed to create the family"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New word family</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>English gloss</Label>
            <Input value={gloss} onChange={(e) => setGloss(e.target.value)} placeholder="book" />
          </div>
          <div className="space-y-1">
            <Label>Id (lowercase letters and digits, never changes)</Label>
            <Input
              value={effectiveId}
              onChange={(e) => {
                setId(e.target.value);
                setIdTouched(true);
              }}
            />
            {effectiveId && !valid && <p className="text-xs text-destructive">Use lowercase letters and digits joined by single - or _.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!valid || busy} onClick={save}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FamilyEditor({
  family,
  pool,
  concepts,
  onChanged,
  onConceptsChanged,
}: {
  family: WordFamilyDetail;
  pool: CuratedWord[];
  concepts: ConceptDetail[];
  onChanged: () => Promise<void>;
  onConceptsChanged: () => void;
}) {
  const [gloss, setGloss] = React.useState(family.gloss_en ?? "");
  const [notes, setNotes] = React.useState(family.notes ?? "");
  const [headword, setHeadword] = React.useState(family.headword_id ?? "");
  const [busy, setBusy] = React.useState(false);
  const dirty =
    gloss !== (family.gloss_en ?? "") || notes !== (family.notes ?? "") || headword !== (family.headword_id ?? "");
  const live = family.members.filter((m) => m.retired_at === null);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      await onChanged();
    } catch (e) {
      toast.error(errText(e, "Save failed"));
    } finally {
      setBusy(false);
    }
  };

  const linked = concepts.filter((c) => c.families.some((f) => f.id === family.id));
  const unlinked = concepts.filter((c) => !linked.includes(c));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">{family.id}</h2>
            <span className="text-xs text-muted-foreground">The id never changes.</span>
          </div>
          <div className="space-y-1">
            <Label>English gloss</Label>
            <Input value={gloss} onChange={(e) => setGloss(e.target.value)} maxLength={200} />
            <p className="text-xs text-muted-foreground">
              The source text for translations into other languages. Arabic is never translated.
            </p>
          </div>
          <div className="space-y-1">
            <Label>Headword (the fully vowelled form shown in a dictionary)</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={headword}
              onChange={(e) => setHeadword(e.target.value)}
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
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Plural, root, gender..." />
          </div>
          <Button
            disabled={!dirty || busy}
            onClick={() =>
              run(
                () =>
                  updateWordFamily(family.id, {
                    glossEn: gloss.trim() || null,
                    notes: notes.trim() || null,
                    headwordId: headword || null,
                  }),
                "Family saved"
              )
            }
          >
            Save
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h3 className="font-semibold">Spellings ({family.members.length})</h3>
          <ul className="divide-y rounded-md border">
            {family.members.map((m) => (
              <SpellingRow
                key={m.id}
                word={m}
                pool={pool}
                busy={busy}
                isHeadword={family.headword_id === m.id}
                onReviewed={(reviewed) => run(() => setWordReviewed(m.id, reviewed), reviewed ? "Marked reviewed" : "Review withdrawn")}
                onReadsAs={(target) => run(() => setWordReadsAs(m.id, target), target ? "Reading saved" : "Reading cleared")}
                onRemove={() => run(() => setWordFamily(m.id, null), "Removed from the family")}
              />
            ))}
            {family.members.length === 0 && <li className="p-3 text-sm text-muted-foreground">No spellings yet.</li>}
          </ul>
          <Label>Add a spelling</Label>
          <WordPicker
            words={joinableWords(pool, family.id)}
            onPick={(w) =>
              run(
                () => setWordFamily(w.id, family.id),
                w.family_id ? `Moved ${w.arabic} here from ${w.family_id}` : "Spelling added"
              )
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h3 className="font-semibold">Concept and picture</h3>
          <p className="text-sm text-muted-foreground">
            A family gets its picture through the concept it names. Pictures are chosen on the concept.
          </p>
          <ul className="divide-y rounded-md border">
            {linked.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 p-3">
                <span className="flex items-center gap-3">
                  {c.pictures[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.pictures[0].url} alt="" className="h-10 w-10 object-contain" />
                  )}
                  <Link href={`/concepts?concept=${encodeURIComponent(c.slug)}`} className="text-sm font-medium underline">
                    {c.name.en}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {c.pictures.length === 0 ? "no picture yet" : `${c.pictures.length} picture${c.pictures.length === 1 ? "" : "s"}`}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => run(() => unlinkFamilyFromConcept(family.id, c.slug).then(onConceptsChanged), "Concept unlinked")}
                >
                  Unlink
                </Button>
              </li>
            ))}
            {linked.length === 0 && <li className="p-3 text-sm text-muted-foreground">No concept linked.</li>}
          </ul>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value=""
            onChange={(e) => {
              const slug = e.target.value;
              if (slug) void run(() => linkFamilyToConcept(family.id, slug).then(onConceptsChanged), "Concept linked");
            }}
          >
            <option value="">Link a concept...</option>
            {unlinked.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name.en} ({c.slug})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>
    </div>
  );
}

function SpellingRow({
  word,
  pool,
  busy,
  isHeadword,
  onReviewed,
  onReadsAs,
  onRemove,
}: {
  word: CuratedWord;
  pool: CuratedWord[];
  busy: boolean;
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
    <li className="space-y-2 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-arabic text-2xl" dir="rtl">{word.arabic}</span>
          <span className="text-xs text-muted-foreground">{word.id}</span>
          {isHeadword && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">Headword</span>}
          {retired && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Retired</span>}
          <NotReviewedBadge word={word} />
          {awaiting && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Reading not confirmed</span>}
        </div>
        {!retired && (
          <div className="flex gap-2">
            {word.reviewed_at === null ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onReviewed(true)}>Mark reviewed</Button>
            ) : (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onReviewed(false)}>Withdraw review</Button>
            )}
            <Button size="sm" variant="ghost" disabled={busy} onClick={onRemove}>Remove</Button>
          </div>
        )}
      </div>

      {!retired && (word.reads_as_id || awaiting) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          {word.reads_as_id ? (
            <>
              <span>Read as</span>
              <span className="font-arabic text-xl" dir="rtl">{readsAsWord?.arabic ?? word.reads_as_id}</span>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onReadsAs(null)}>Clear</Button>
            </>
          ) : candidates.length > 0 ? (
            <>
              <span>Read as</span>
              <select
                className="h-9 rounded-md border border-input bg-background px-2"
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
              >
                <option value="">Pick the vowelled spelling...</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>{c.arabic} ({c.id})</option>
                ))}
              </select>
              <Button size="sm" disabled={!choice || busy} onClick={() => onReadsAs(choice)}>Confirm reading</Button>
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
