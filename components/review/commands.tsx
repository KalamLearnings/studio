"use client";

/**
 * How a pane receives keyboard commands. The workspace owns one key listener;
 * the open pane registers a handler with `usePaneCommands`, and that handler
 * sees every command first.
 */

import * as React from "react";
import type { CommandHandler } from "./lenses/types";

type Registry = React.MutableRefObject<CommandHandler | null>;

export const PaneCommandContext = React.createContext<Registry | null>(null);

/** Registers `handler` for as long as the pane is mounted; always calls its latest version. */
export function usePaneCommands(handler: CommandHandler): void {
  const registry = React.useContext(PaneCommandContext);
  const latest = React.useRef(handler);
  latest.current = handler;
  React.useEffect(() => {
    if (!registry) return;
    const fn: CommandHandler = (cmd) => latest.current(cmd);
    registry.current = fn;
    return () => {
      if (registry.current === fn) registry.current = null;
    };
  }, [registry]);
}
