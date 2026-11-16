"use client";

/** The shortcut sheet (`?`, CW-4): the shared keys plus the registered lenses' own. */

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ShortcutGroup } from "@/lib/review/keyboard";
import { Kbd } from "./parts";

export function ShortcutSheet({
  open,
  onOpenChange,
  groups,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: ShortcutGroup[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] max-w-[760px] overflow-auto">
        <DialogHeader>
          <DialogTitle>Keyboard</DialogTitle>
          <DialogDescription>Everything works with the mouse too. Keys are off while you type in a field.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-x-7 gap-y-1 min-[860px]:grid-cols-2">
          {groups.map((g) => (
            <React.Fragment key={g.title}>
              <h3 className="col-span-full mb-0.5 mt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{g.title}</h3>
              <dl className="contents">
                {g.rows.map((r) => (
                  <div key={r.label} className="flex justify-between gap-3 border-b border-border/50 py-[3px] text-[13px]">
                    <dt>{r.label}</dt>
                    <dd className="flex items-center gap-1">
                      {r.keys.map((k, i) =>
                        k === "to" ? (
                          <span key={i} className="text-xs text-muted-foreground">
                            to
                          </span>
                        ) : (
                          <Kbd key={i}>{k}</Kbd>
                        ),
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </React.Fragment>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
