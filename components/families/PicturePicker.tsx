"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getAssets } from "@/lib/services/assetService";
import type { Asset } from "@/lib/types/assets";

/**
 * Picks an image from the asset library (CM-S4) for a concept. Only active,
 * registered images are offered: a picture links by registry id, so a legacy
 * file not in the registry yet has to be registered in the library first.
 */
export function PicturePicker({
  open,
  onOpenChange,
  excludeIds,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Registry ids already attached. */
  excludeIds: string[];
  onPick: (asset: Asset & { registryId: string }) => void;
}) {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    setError(null);
    getAssets({ status: "active" })
      .then((list) => live && setAssets(list))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Failed to load images"))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const shown = assets.filter(
    (a) =>
      a.registryId !== null &&
      !excludeIds.includes(a.registryId) &&
      (!q || a.displayName.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q)))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pick a picture</DialogTitle>
        </DialogHeader>
        <Input placeholder="Search the image library..." value={query} onChange={(e) => setQuery(e.target.value)} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
            {shown.map((a) => (
              <button
                key={a.id}
                type="button"
                className="rounded-md border p-2 text-left hover:border-primary"
                onClick={() => onPick(a as Asset & { registryId: string })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.displayName} className="aspect-square w-full object-contain" />
                <p className="mt-1 truncate text-xs">{a.displayName}</p>
              </button>
            ))}
            {shown.length === 0 && <p className="col-span-full py-6 text-center text-sm text-muted-foreground">No images to pick.</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
