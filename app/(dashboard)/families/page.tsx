"use client";

import * as React from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getWordFamily, listCuratedWords, listWordFamilies } from "@/lib/api/wordFamilies";
import { loadConceptDetails } from "@/lib/api/concepts";
import type { ConceptDetail, CuratedWord, WordFamily, WordFamilyDetail } from "@/lib/types/wordFamilies";
// The editor and the dialog live with Review's library (CW-9); this page stays until CW-12.
import { CreateFamilyDialog } from "@/components/review/library/CreateDialogs";
import { FamilyEditor, familyErrText as errText } from "@/components/review/library/FamilyEditor";

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
