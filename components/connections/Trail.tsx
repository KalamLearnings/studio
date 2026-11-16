"use client";

/** The breadcrumb of the places opened (CG-1). Backspace or Alt+Left goes one back. */

import * as React from "react";
import type { Graph } from "@/lib/connections/graph";
import { typeOfKey, type NodeKey } from "@/lib/connections/keys";
import { existsInGraph } from "@/lib/connections/neighbourhood";
import { Ar, KIND_COLOR, KindIcon, labelOf } from "./parts";

export function Trail({ graph, trail, focus, onOpen }: { graph: Graph; trail: NodeKey[]; focus: NodeKey | null; onOpen: (k: NodeKey) => void }) {
  const shown = trail.filter((k) => existsInGraph(graph, k));
  return (
    <nav aria-label="Where you have been" className="mb-2.5 flex min-h-[30px] flex-wrap items-center gap-1">
      <ol className="contents">
        {shown.map((k, i) => {
          const L = labelOf(graph, k);
          const t = typeOfKey(k);
          const current = k === focus;
          return (
            <li key={k} className="flex items-center gap-1">
              {i > 0 && (
                <span aria-hidden="true" className="text-muted-foreground/60">
                  ›
                </span>
              )}
              <button
                type="button"
                onClick={() => onOpen(k)}
                aria-current={current ? "location" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-0.5 text-sm hover:border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${current ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <span style={{ color: KIND_COLOR[t] }}>
                  <KindIcon type={t} size={12} />
                </span>
                {L.ar ? <Ar className="text-[17px] leading-[1.4]">{L.ar}</Ar> : <span>{L.en}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
