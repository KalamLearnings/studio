"use client";

/**
 * Who may change connections in Review's library (owner decision 3,
 * 2026-11-16): a curriculum lead or a phrase reviewer. The backend refuses
 * everyone else (403 `PHRASE_REVIEWER_REQUIRED`) on a spelling's family and
 * reading, a family's create and edit, family to meaning links and pictures.
 * Concept details and Mark reviewed stay with every staff member. The
 * workspace provides it from the inbox's roles; it is false until they load.
 */

import * as React from "react";
import { Lock } from "lucide-react";
import { CONNECT_ROLE_TEXT } from "@/lib/connections/kinds";
import { cn } from "@/lib/utils";

export const ConnectAccessContext = React.createContext(false);
export const useCanConnect = () => React.useContext(ConnectAccessContext);

/** The plain reason, where a connection control would be. */
export function ConnectLocked({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <p className={cn("flex items-start gap-1.5 text-xs text-muted-foreground", className)}>
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {children ? <>{children} </> : null}
        {CONNECT_ROLE_TEXT}
      </span>
    </p>
  );
}
