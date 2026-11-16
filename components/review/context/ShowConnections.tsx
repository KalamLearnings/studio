"use client";

/**
 * CG-7: "Show connections" opens an item on the Words page
 * (`/words?focus=<key>`), where its family, meaning, pictures, letters and
 * uses are drawn around it. Review's context cards and library views carry it.
 */

import * as React from "react";
import { Network } from "lucide-react";
import { wordsUrlSearch, type NodeKey } from "@/lib/connections/keys";
import { cn } from "@/lib/utils";

export const connectionsHref = (focus: NodeKey) => `/words${wordsUrlSearch({ focus, view: "focus" })}`;

export function ShowConnections({ focus, className, label = "Show connections" }: { focus: NodeKey; className?: string; label?: string }) {
  return (
    <a
      href={connectionsHref(focus)}
      className={cn("inline-flex items-center gap-1 text-[12.5px] normal-case tracking-normal text-primary hover:underline", className)}
    >
      <Network className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </a>
  );
}
