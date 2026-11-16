"use client";

import * as React from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getConcept, listConcepts } from "@/lib/api/concepts";
import { listWordFamilies } from "@/lib/api/wordFamilies";
import type { Concept, ConceptDetail, WordFamily } from "@/lib/types/wordFamilies";
// The editor and the dialog live with Review's library (CW-9); this page stays until CW-12.
import { ConceptEditor } from "@/components/review/library/ConceptEditor";
import { CreateConceptDialog } from "@/components/review/library/CreateDialogs";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

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
