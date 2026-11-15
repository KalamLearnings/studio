"use client";

import * as React from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import {
  attachConceptPicture,
  createConcept,
  detachConceptPicture,
  getConcept,
  linkFamilyToConcept,
  listConcepts,
  unlinkFamilyFromConcept,
  updateConcept,
} from "@/lib/api/concepts";
import { listWordFamilies } from "@/lib/api/wordFamilies";
import { AssetStatusBadge } from "@/components/assets";
import { PicturePicker } from "@/components/families/PicturePicker";
import { CONCEPT_KINDS, type Concept, type ConceptDetail, type ConceptKind, type WordFamily } from "@/lib/types/wordFamilies";
import { isSlug, slugFromText } from "@/lib/words/family";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const code = (e: unknown) => (e instanceof ApiError ? e.code : undefined);

export default function ConceptsPage() {
  const [concepts, setConcepts] = React.useState<Concept[]>([]);
  const [families, setFamilies] = React.useState<WordFamily[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<ConceptDetail | null>(null);
  const [creating, setCreating] = React.useState(false);

  const reloadList = React.useCallback(async () => {
    const [c, f] = await Promise.all([listConcepts(), listWordFamilies()]);
    setConcepts(c);
    setFamilies(f);
  }, []);

  React.useEffect(() => {
    // The family editor links here with ?concept=<slug>.
    const initial = new URLSearchParams(window.location.search).get("concept");
    if (initial) setSelected(initial);
    reloadList()
      .catch((e) => setError(errText(e, "Failed to load concepts")))
      .finally(() => setLoading(false));
  }, [reloadList]);

  const loadDetail = React.useCallback(async (ref: string) => {
    try {
      setDetail(await getConcept(ref));
    } catch (e) {
      toast.error(errText(e, "Failed to load the concept"));
    }
  }, []);

  React.useEffect(() => {
    setDetail(null);
    if (selected) void loadDetail(selected);
  }, [selected, loadDetail]);

  const q = search.trim().toLowerCase();
  const shown = concepts.filter((c) => !q || c.slug.includes(q) || c.name.en.toLowerCase().includes(q) || (c.name.ar ?? "").includes(search.trim()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Concepts</h1>
          <p className="text-muted-foreground">A concept is a thing (a book, a moon) with its pictures and the word families that name it.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New concept
        </Button>
      </div>

      {error && <div className="rounded-lg border border-destructive/50 p-4 text-center text-destructive">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search slug or name..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ul className="max-h-[70vh] divide-y overflow-y-auto rounded-md border">
              {shown.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(c.slug)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted ${selected === c.slug ? "bg-muted" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{c.name.en}</span>
                      <span className="block truncate text-xs text-muted-foreground">{c.slug}{c.kind ? ` · ${c.kind}` : ""}</span>
                    </span>
                    <span className="font-arabic text-xl" dir="rtl">{c.name.ar ?? ""}</span>
                  </button>
                </li>
              ))}
              {shown.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">No concepts.</li>}
            </ul>
          )}
        </div>

        <div>
          {!selected && <p className="py-10 text-center text-muted-foreground">Pick a concept, or create one.</p>}
          {selected && !detail && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {detail && (
            <ConceptEditor
              key={detail.id + (detail.updated_at ?? "")}
              concept={detail}
              families={families}
              onChanged={async () => {
                await Promise.all([reloadList(), loadDetail(detail.slug)]);
              }}
            />
          )}
        </div>
      </div>

      <CreateConceptDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={async (slug) => {
          setCreating(false);
          await reloadList();
          setSelected(slug);
        }}
      />
    </div>
  );
}

function KindSelect({ value, onChange }: { value: ConceptKind | ""; onChange: (v: ConceptKind | "") => void }) {
  return (
    <select
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value as ConceptKind | "")}
    >
      <option value="">No kind</option>
      {CONCEPT_KINDS.map((k) => (
        <option key={k} value={k}>{k}</option>
      ))}
    </select>
  );
}

function CreateConceptDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (slug: string) => void | Promise<void>;
}) {
  const [en, setEn] = React.useState("");
  const [ar, setAr] = React.useState("");
  const [kind, setKind] = React.useState<ConceptKind | "">("");
  const [slug, setSlug] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const effective = touched ? slug : slugFromText(en) ?? "";

  const save = async () => {
    setBusy(true);
    try {
      await createConcept({ slug: effective, name: { en: en.trim(), ...(ar.trim() ? { ar: ar.trim() } : {}) }, kind: kind || null });
      toast.success("Concept created");
      setEn("");
      setAr("");
      setKind("");
      setSlug("");
      setTouched(false);
      await onCreated(effective);
    } catch (e) {
      toast.error(errText(e, "Failed to create the concept"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New concept</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>English name</Label>
            <Input value={en} onChange={(e) => setEn(e.target.value)} placeholder="book" />
          </div>
          <div className="space-y-1">
            <Label>Arabic name (optional)</Label>
            <Input dir="rtl" value={ar} onChange={(e) => setAr(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Kind</Label>
            <KindSelect value={kind} onChange={setKind} />
          </div>
          <div className="space-y-1">
            <Label>Slug (never changes)</Label>
            <Input value={effective} onChange={(e) => { setSlug(e.target.value); setTouched(true); }} />
            {effective && !isSlug(effective) && <p className="text-xs text-destructive">Use lowercase letters and digits joined by single - or _.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!isSlug(effective) || !en.trim() || busy} onClick={save}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConceptEditor({
  concept,
  families,
  onChanged,
}: {
  concept: ConceptDetail;
  families: WordFamily[];
  onChanged: () => Promise<void>;
}) {
  const [en, setEn] = React.useState(concept.name.en);
  const [ar, setAr] = React.useState(concept.name.ar ?? "");
  const [kind, setKind] = React.useState<ConceptKind | "">(concept.kind ?? "");
  const [busy, setBusy] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const dirty = en !== concept.name.en || ar !== (concept.name.ar ?? "") || kind !== (concept.kind ?? "");
  const linkedIds = new Set(concept.families.map((f) => f.id));

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      await onChanged();
    } catch (e) {
      const c = code(e);
      toast.error(c === "ASSET_MEDIA_MISMATCH" ? "That file is not an image." : c === "ASSET_NOT_LINKABLE" ? "That file cannot be used (retired, quarantined or superseded)." : errText(e, "Save failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">{concept.slug}</h2>
            <span className="text-xs text-muted-foreground">The slug never changes.</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>English name</Label>
              <Input value={en} onChange={(e) => setEn(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1">
              <Label>Arabic name</Label>
              <Input dir="rtl" value={ar} onChange={(e) => setAr(e.target.value)} maxLength={100} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Kind</Label>
            <KindSelect value={kind} onChange={setKind} />
          </div>
          <Button
            disabled={!dirty || !en.trim() || busy}
            onClick={() =>
              run(
                () => updateConcept(concept.slug, { name: { en: en.trim(), ...(ar.trim() ? { ar: ar.trim() } : {}) }, kind: kind || null }),
                "Concept saved"
              )
            }
          >
            Save
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Pictures ({concept.pictures.length})</h3>
            <Button size="sm" variant="outline" onClick={() => setPicking(true)}>Add picture</Button>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {concept.pictures.map((p) => (
              <div key={p.assetId} className="relative rounded-md border p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.label.text ?? ""} className="aspect-square w-full object-contain" />
                <AssetStatusBadge status={p.status} className="mt-1" />
                <button
                  type="button"
                  aria-label="Remove picture"
                  disabled={busy}
                  className="absolute right-1 top-1 rounded-full bg-background/90 p-1 hover:bg-muted"
                  onClick={() => run(() => detachConceptPicture(concept.slug, p.assetId), "Picture removed")}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {concept.pictures.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No picture yet.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h3 className="font-semibold">Word families ({concept.families.length})</h3>
          <ul className="divide-y rounded-md border">
            {concept.families.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 p-3">
                <span className="text-sm">
                  <span className="font-medium">{f.gloss_en ?? f.id}</span> <span className="text-muted-foreground">({f.id})</span>
                </span>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => unlinkFamilyFromConcept(f.id, concept.slug), "Family unlinked")}>
                  Unlink
                </Button>
              </li>
            ))}
            {concept.families.length === 0 && <li className="p-3 text-sm text-muted-foreground">No family names this concept yet.</li>}
          </ul>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value=""
            onChange={(e) => {
              const id = e.target.value;
              if (id) void run(() => linkFamilyToConcept(id, concept.slug), "Family linked");
            }}
          >
            <option value="">Link a word family...</option>
            {families.filter((f) => !linkedIds.has(f.id)).map((f) => (
              <option key={f.id} value={f.id}>{f.gloss_en ?? f.id} ({f.id})</option>
            ))}
          </select>
        </CardContent>
      </Card>

      <PicturePicker
        open={picking}
        onOpenChange={setPicking}
        excludeIds={concept.pictures.map((p) => p.assetId)}
        onPick={(asset) => {
          setPicking(false);
          void run(() => attachConceptPicture(concept.slug, asset.registryId), "Picture added");
        }}
      />
    </div>
  );
}
