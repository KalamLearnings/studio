"use client";

import * as React from "react";
import { AlertCircle, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRegistryAsset, labelRegistryAsset } from "@/lib/api/assets";
import {
  EMPTY_LABEL,
  isIdentifyingLabel,
  labelProblems,
  normaliseLabel,
  statusAfterLabel,
} from "@/lib/assets/label";
import type { AssetLabel, RegistryAsset } from "@/lib/types/assetRegistry";
import { AssetStatusBadge } from "./AssetStatusBadge";

interface AssetLabelDialogProps {
  /** The registry id (the same id as the `audio_assets` row for audio). */
  assetId: string | null;
  /** Shown in the title (the library display name). */
  name?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLabelled: (asset: RegistryAsset) => void;
}

const FIELDS: { key: keyof AssetLabel; label: string; placeholder: string; dir?: "rtl" }[] = [
  { key: "ownerType", label: "Owner type", placeholder: "letter, word, concept, activity" },
  { key: "ownerId", label: "Owner id", placeholder: "baa, a word id, book" },
  { key: "role", label: "Role", placeholder: "letter_sound, reading, illustration, effect" },
  { key: "locale", label: "Locale", placeholder: "ar, en, fr" },
  { key: "text", label: "Text", placeholder: "The exact spoken text, e.g. بَ", dir: "rtl" },
];

type LoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | { kind: "ready"; asset: RegistryAsset };

/**
 * The label form (CM-S4): says what a file IS. Saved through
 * `PUT /assets/:assetId/label`; a quarantined file whose label identifies it
 * (a role plus an owner or the exact text) becomes active.
 */
export function AssetLabelDialog({
  assetId,
  name,
  open,
  onOpenChange,
  onLabelled,
}: AssetLabelDialogProps) {
  const [state, setState] = React.useState<LoadState>({ kind: "loading" });
  const [draft, setDraft] = React.useState<AssetLabel>(EMPTY_LABEL);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !assetId) return;
    let cancelled = false;
    setState({ kind: "loading" });
    getRegistryAsset(assetId)
      .then((asset) => {
        if (cancelled) return;
        if (!asset) {
          setState({ kind: "missing" });
          return;
        }
        setDraft(asset.label);
        setState({ kind: "ready", asset });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : "Failed to load the asset",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, assetId]);

  const label = normaliseLabel(draft);
  const problems = labelProblems(label);
  const next = state.kind === "ready" ? statusAfterLabel(state.asset.status, label) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.kind !== "ready" || problems.length > 0) return;
    setSaving(true);
    try {
      const asset = await labelRegistryAsset(state.asset.id, label);
      onLabelled(asset);
      toast.success(asset.status === "active" ? "Label saved; the file is active" : "Label saved");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save the label");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Label{name ? `: ${name}` : ""}</DialogTitle>
        </DialogHeader>

        {state.kind === "loading" && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {state.kind === "missing" && (
          <p className="text-sm text-muted-foreground">
            This file is not in the asset registry yet. Files uploaded before the
            registry are added by the backfill; it can be labelled after that.
          </p>
        )}

        {state.kind === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{state.message}</span>
          </div>
        )}

        {state.kind === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Status:</span>
              <span className="capitalize text-foreground">{state.asset.status}</span>
              <AssetStatusBadge status={state.asset.status} />
            </div>

            {FIELDS.map(({ key, label: fieldLabel, placeholder, dir }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`label-${key}`}>{fieldLabel}</Label>
                <Input
                  id={`label-${key}`}
                  value={draft[key] ?? ""}
                  dir={dir}
                  placeholder={placeholder}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                />
              </div>
            ))}

            <p className="text-xs text-muted-foreground">
              A label identifies the file when it has a role and either an owner
              or the exact text.{" "}
              {isIdentifyingLabel(label) ? "This label identifies it." : "This label does not."}
              {next && next !== state.asset.status ? ` Saving makes the file ${next}.` : ""}
            </p>

            {problems.length > 0 && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  {problems.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || problems.length > 0} className="min-w-[100px]">
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Tag className="mr-2 h-4 w-4" />
                )}
                Save label
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
