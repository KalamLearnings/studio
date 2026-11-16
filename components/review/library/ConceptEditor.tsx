"use client";

/**
 * The concept editor's sections (CM-S5; details, pictures, family links),
 * composed by the Concept sub-view in Review's pane (`LibraryPane`), which
 * puts Save in the decision bar. The old `/concepts` page is gone (CG-8).
 *
 * Pictures and links save at once; the details save with Save. Details stay
 * with every staff member; pictures and family links need a curriculum lead
 * or phrase reviewer (`useCanConnect`).
 */

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AssetStatusBadge } from "@/components/assets";
import { PicturePicker } from "@/components/families/PicturePicker";
import { ApiError } from "@/lib/api/client";
import { CONCEPT_KINDS, type ConceptDetail, type ConceptKind, type WordFamily } from "@/lib/types/wordFamilies";
import { useLibraryApi } from "./api";
import { ConnectLocked, useCanConnect } from "./access";
import type { useEditorRun } from "./FamilyEditor";

const code = (e: unknown) => (e instanceof ApiError ? e.code : undefined);

export function describeConceptError(e: unknown): string {
  const c = code(e);
  if (c === "ASSET_MEDIA_MISMATCH") return "That file is not an image.";
  if (c === "ASSET_NOT_LINKABLE") return "That file cannot be used (retired, quarantined or superseded).";
  return e instanceof Error ? e.message : "Save failed";
}

export function KindSelect({
  value,
  onChange,
  id,
}: {
  value: ConceptKind | "";
  onChange: (v: ConceptKind | "") => void;
  id?: string;
}) {
  return (
    <select
      id={id}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value as ConceptKind | "")}
    >
      <option value="">No kind</option>
      {CONCEPT_KINDS.map((k) => (
        <option key={k} value={k}>
          {k}
        </option>
      ))}
    </select>
  );
}

// ---- details --------------------------------------------------------------------------

export interface ConceptForm {
  en: string;
  setEn: (v: string) => void;
  ar: string;
  setAr: (v: string) => void;
  kind: ConceptKind | "";
  setKind: (v: ConceptKind | "") => void;
  dirty: boolean;
  valid: boolean;
  save: () => Promise<void>;
}

/** The details' draft state and Save. Remount (key on `updated_at`) to reset it after a save. */
export function useConceptForm(concept: ConceptDetail, run: ReturnType<typeof useEditorRun>["run"]): ConceptForm {
  const api = useLibraryApi();
  const [en, setEn] = React.useState(concept.name.en);
  const [ar, setAr] = React.useState(concept.name.ar ?? "");
  const [kind, setKind] = React.useState<ConceptKind | "">(concept.kind ?? "");
  const dirty = en !== concept.name.en || ar !== (concept.name.ar ?? "") || kind !== (concept.kind ?? "");
  const save = () =>
    run(
      () => api.updateConcept(concept.slug, { name: { en: en.trim(), ...(ar.trim() ? { ar: ar.trim() } : {}) }, kind: kind || null }),
      "Concept saved",
    );
  return { en, setEn, ar, setAr, kind, setKind, dirty, valid: !!en.trim(), save };
}

export function ConceptDetailsFields({ form }: { form: ConceptForm }) {
  const id = React.useId();
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${id}-en`}>English name</Label>
          <Input id={`${id}-en`} value={form.en} onChange={(e) => form.setEn(e.target.value)} maxLength={100} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-ar`}>Arabic name</Label>
          <Input id={`${id}-ar`} dir="rtl" lang="ar" value={form.ar} onChange={(e) => form.setAr(e.target.value)} maxLength={100} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${id}-kind`}>Kind</Label>
        <KindSelect id={`${id}-kind`} value={form.kind} onChange={form.setKind} />
      </div>
    </div>
  );
}

// ---- pictures -------------------------------------------------------------------------

export function ConceptPictures({
  concept,
  busy,
  run,
  picking,
  setPicking,
}: {
  concept: ConceptDetail;
  busy: boolean;
  run: ReturnType<typeof useEditorRun>["run"];
  picking: boolean;
  setPicking: (open: boolean) => void;
}) {
  const api = useLibraryApi();
  const canConnect = useCanConnect();
  return (
    <>
      {!canConnect && <ConnectLocked className="mb-2">Pictures are read only.</ConnectLocked>}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {concept.pictures.map((p) => (
          <div key={p.assetId} className="relative rounded-md border p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- asset URLs come from storage */}
            <img src={p.url} alt={p.label.text ?? ""} className="aspect-square w-full object-contain" />
            <AssetStatusBadge status={p.status} className="mt-1" />
            {canConnect && <button
              type="button"
              aria-label="Remove picture"
              disabled={busy}
              className="absolute right-1 top-1 rounded-full bg-background/90 p-1 hover:bg-muted"
              onClick={() => run(() => api.detachConceptPicture(concept.slug, p.assetId), "Picture removed")}
            >
              <X className="h-3 w-3" />
            </button>}
          </div>
        ))}
        {concept.pictures.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No picture yet.</p>}
      </div>
      <PicturePicker
        open={picking && canConnect}
        onOpenChange={setPicking}
        excludeIds={concept.pictures.map((p) => p.assetId)}
        onPick={(asset) => {
          setPicking(false);
          void run(() => api.attachConceptPicture(concept.slug, asset.registryId), "Picture added");
        }}
      />
    </>
  );
}

// ---- family links ---------------------------------------------------------------------

export function ConceptFamilies({
  concept,
  families,
  busy,
  run,
  onOpenFamily,
}: {
  concept: ConceptDetail;
  families: readonly WordFamily[];
  busy: boolean;
  run: ReturnType<typeof useEditorRun>["run"];
  /** Opens a family in place (Review only). */
  onOpenFamily?: (id: string) => void;
}) {
  const api = useLibraryApi();
  const canConnect = useCanConnect();
  const linkedIds = new Set(concept.families.map((f) => f.id));
  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-md border">
        {concept.families.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 p-3">
            <span className="min-w-0 text-sm">
              {onOpenFamily ? (
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => onOpenFamily(f.id)}>
                  {f.gloss_en ?? f.id}
                </button>
              ) : (
                <span className="font-medium">{f.gloss_en ?? f.id}</span>
              )}{" "}
              <span className="text-muted-foreground">({f.id})</span>
            </span>
            {canConnect && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => api.unlinkFamilyFromConcept(f.id, concept.slug), "Family unlinked")}>
                Unlink
              </Button>
            )}
          </li>
        ))}
        {concept.families.length === 0 && <li className="p-3 text-sm text-muted-foreground">No family names this concept yet.</li>}
      </ul>
      {!canConnect && <ConnectLocked />}
      {canConnect && <select
        aria-label="Link a word family"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value=""
        disabled={busy}
        onChange={(e) => {
          const id = e.target.value;
          if (id) void run(() => api.linkFamilyToConcept(id, concept.slug), "Family linked");
        }}
      >
        <option value="">Link a word family...</option>
        {families
          .filter((f) => !linkedIds.has(f.id))
          .map((f) => (
            <option key={f.id} value={f.id}>
              {f.gloss_en ?? f.id} ({f.id})
            </option>
          ))}
      </select>}
    </div>
  );
}
