"use client";

/**
 * The picture picker (CG-5, B-5): searches the asset registry's images on
 * the server (`GET /assets?media=image&status=active,quarantined&q=`), one
 * page at a time. A picture already on the meaning is greyed.
 */

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { RegistryAsset } from "@/lib/types/assetRegistry";
import { cn } from "@/lib/utils";
import { Badge } from "../parts";
import { useWordsEditApi } from "./api";

const nameOf = (a: RegistryAsset) => a.library?.displayName || a.label?.text || a.path.split("/").pop() || a.id;

export function PictureSearch({
  open,
  onOpenChange,
  title,
  excludeIds,
  onPick,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  excludeIds: readonly string[];
  onPick: (asset: RegistryAsset) => void;
  busy?: boolean;
}) {
  const api = useWordsEditApi();
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<RegistryAsset[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const seq = React.useRef(0);

  const load = React.useCallback(
    async (query: string, from: string | null) => {
      const n = ++seq.current;
      setLoading(true);
      setError(null);
      try {
        const page = await api.searchPictures(query, from);
        if (n !== seq.current) return;
        setItems((prev) => (from ? [...prev, ...page.items] : page.items));
        setCursor(page.next_cursor);
      } catch (e) {
        if (n === seq.current) setError(e instanceof Error ? e.message : "The pictures could not be loaded.");
      } finally {
        if (n === seq.current) setLoading(false);
      }
    },
    [api],
  );

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => void load(q, null), q ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [open, q, load]);
  React.useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Pictures from the asset library, newest first. Only active and quarantined images can be linked.</DialogDescription>
        </DialogHeader>
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or label..." aria-label="Search pictures" />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}{" "}
            <button type="button" className="underline" onClick={() => void load(q, null)}>
              Try again
            </button>
          </p>
        )}
        <ul className="grid max-h-[55vh] grid-cols-3 gap-2.5 overflow-y-auto sm:grid-cols-4" aria-label="Pictures" aria-busy={loading}>
          {items.map((a) => {
            const taken = excludeIds.includes(a.id);
            return (
              <li key={a.id}>
                <button
                  type="button"
                  aria-disabled={taken || busy}
                  onClick={() => !taken && !busy && onPick(a)}
                  className={cn(
                    "w-full rounded-md border p-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                    taken ? "cursor-not-allowed opacity-50" : "hover:border-primary",
                  )}
                  aria-label={`${nameOf(a)}${a.status !== "active" ? `, ${a.status}` : ""}${taken ? ". Already a picture of this meaning" : ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- storage URLs */}
                  <img src={a.url} alt="" className="aspect-square w-full object-contain" />
                  <span className="mt-1 block truncate text-xs">{nameOf(a)}</span>
                  {a.status !== "active" && <Badge tone="warn">{a.status}</Badge>}
                  {taken && <span className="block text-[11px] text-muted-foreground">already here</span>}
                </button>
              </li>
            );
          })}
          {!loading && !error && items.length === 0 && (
            <li className="col-span-full py-6 text-center text-sm text-muted-foreground">No picture matches.</li>
          )}
        </ul>
        <div className="flex items-center justify-center gap-2">
          {loading && <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin text-muted-foreground" />}
          {cursor && !loading && (
            <Button variant="outline" size="sm" onClick={() => void load(q, cursor)}>
              Load more
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
