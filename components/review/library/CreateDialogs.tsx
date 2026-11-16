"use client";

/**
 * New family and New concept (CM-S5), moved here from the old pages (CW-9).
 * Both create through the API and hand the new id or slug to `onCreated`,
 * which opens it. A new family is a connection write (`POST /words/families`,
 * curriculum lead or phrase reviewer); a new concept is for every staff member.
 */

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ConceptKind } from "@/lib/types/wordFamilies";
import { isSlug, slugFromText } from "@/lib/words/family";
import { useLibraryApi } from "./api";
import { KindSelect } from "./ConceptEditor";
import { familyErrText } from "./FamilyEditor";
import { ConnectLocked, useCanConnect } from "./access";

const SLUG_HINT = "Use lowercase letters and digits joined by single - or _.";

export function CreateFamilyDialog({
  open,
  onOpenChange,
  onCreated,
  initialGloss = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void | Promise<void>;
  /** Prefills the gloss (a word's English, when created from a word). */
  initialGloss?: string;
}) {
  const api = useLibraryApi();
  const canConnect = useCanConnect();
  const [gloss, setGloss] = React.useState(initialGloss);
  const [id, setId] = React.useState("");
  const [idTouched, setIdTouched] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const effectiveId = idTouched ? id : (slugFromText(gloss) ?? "");
  const valid = isSlug(effectiveId);
  const fid = React.useId();

  React.useEffect(() => {
    if (open) setGloss((g) => g || initialGloss);
  }, [open, initialGloss]);

  const save = async () => {
    if (!valid || busy || !canConnect) return;
    setBusy(true);
    try {
      await api.createWordFamily({ id: effectiveId, glossEn: gloss.trim() || null });
      toast.success("Family created");
      setGloss("");
      setId("");
      setIdTouched(false);
      await onCreated(effectiveId);
    } catch (e) {
      toast.error(familyErrText(e, "Failed to create the family"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New word family</DialogTitle>
          <DialogDescription>A family groups the spellings of one word under a headword and an English gloss.</DialogDescription>
        </DialogHeader>
        {!canConnect ? (
          <ConnectLocked />
        ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor={`${fid}-gloss`}>English gloss</Label>
            <Input id={`${fid}-gloss`} value={gloss} onChange={(e) => setGloss(e.target.value)} placeholder="book" autoFocus />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${fid}-id`}>Id (lowercase letters and digits, never changes)</Label>
            <Input
              id={`${fid}-id`}
              value={effectiveId}
              onChange={(e) => {
                setId(e.target.value);
                setIdTouched(true);
              }}
            />
            {effectiveId && !valid && <p className="text-xs text-destructive">{SLUG_HINT}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CreateConceptDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (slug: string) => void | Promise<void>;
}) {
  const api = useLibraryApi();
  const [en, setEn] = React.useState("");
  const [ar, setAr] = React.useState("");
  const [kind, setKind] = React.useState<ConceptKind | "">("");
  const [slug, setSlug] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const effective = touched ? slug : (slugFromText(en) ?? "");
  const valid = isSlug(effective) && !!en.trim();
  const fid = React.useId();

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await api.createConcept({ slug: effective, name: { en: en.trim(), ...(ar.trim() ? { ar: ar.trim() } : {}) }, kind: kind || null });
      toast.success("Concept created");
      setEn("");
      setAr("");
      setKind("");
      setSlug("");
      setTouched(false);
      await onCreated(effective);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create the concept");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New concept</DialogTitle>
          <DialogDescription>A concept is a thing (a book, a moon) with its pictures and the word families that name it.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor={`${fid}-en`}>English name</Label>
            <Input id={`${fid}-en`} value={en} onChange={(e) => setEn(e.target.value)} placeholder="book" autoFocus />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${fid}-ar`}>Arabic name (optional)</Label>
            <Input id={`${fid}-ar`} dir="rtl" lang="ar" value={ar} onChange={(e) => setAr(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${fid}-kind`}>Kind</Label>
            <KindSelect id={`${fid}-kind`} value={kind} onChange={setKind} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${fid}-slug`}>Slug (never changes)</Label>
            <Input
              id={`${fid}-slug`}
              value={effective}
              onChange={(e) => {
                setSlug(e.target.value);
                setTouched(true);
              }}
            />
            {effective && !isSlug(effective) && <p className="text-xs text-destructive">{SLUG_HINT}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
