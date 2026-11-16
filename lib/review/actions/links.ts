/**
 * The decisions of the Suggested links lens. Approving sends the plan's
 * connection ops (`lib/review/linkPlans.ts`) through the gated link routes;
 * Undo sends their inverse (a family or meaning created on the way stays,
 * without its links: nothing is deleted). Skipping is Studio's own: the
 * proposal is remembered as skipped in this browser, and Undo forgets it.
 */

import { REAL_CONNECT_API } from "@/lib/connections/connectApi";
import { inverseOps, redoOps, runOps, type Op } from "@/lib/connections/ops";
import { connectErrorText } from "@/lib/connections/refusals";
import type { LinkCache } from "@/lib/hooks/useLinkProposals";
import type { LinkItem } from "../normalise/links";
import type { DecisionSpec } from "./types";

/** The ops each approval sent, by item key, so Undo all (bulk) can send their inverse. */
const applied = new Map<string, Op[]>();

const withState = (state: LinkItem["state"]) => (item: LinkItem | import("../inbox").InboxItem) => ({ ...item, state });

export function approveLink(item: LinkItem, ops: Op[], cache: LinkCache, message?: { text: string; arabic?: string }): DecisionSpec {
  return {
    item,
    mode: "inverse",
    message:
      message ??
      (item.data.type === "family"
        ? { text: "Connected as forms of one word:", arabic: item.title }
        : { text: `Picture connected to ${item.titleScript === "ar" ? "" : item.title}`.trim(), arabic: item.titleScript === "ar" ? item.title : undefined }),
    optimistic: withState("approved"),
    run: async () => {
      await runOps(REAL_CONNECT_API, ops);
      applied.set(item.key, ops);
      cache.setApplied(item.id, true);
      void cache.libraryChanged();
    },
    undo: async () => {
      await runOps(REAL_CONNECT_API, inverseOps(ops));
      applied.delete(item.key);
      cache.setApplied(item.id, false);
      void cache.libraryChanged();
    },
    describeError: (e) => connectErrorText(e),
  };
}

/** Bulk "Undo all": the inverse of what the approval sent. */
export function withdrawLink(item: LinkItem, cache: LinkCache): DecisionSpec {
  const ops = applied.get(item.key) ?? [];
  return {
    item,
    mode: "inverse",
    message: { text: "Connection undone:", arabic: item.title },
    optimistic: withState("todo"),
    run: async () => {
      await runOps(REAL_CONNECT_API, inverseOps(ops));
      applied.delete(item.key);
      cache.setApplied(item.id, false);
      void cache.libraryChanged();
    },
    undo: async () => {
      // A family or meaning the approval created still exists: join it again rather than create it.
      await runOps(REAL_CONNECT_API, redoOps(ops));
      applied.set(item.key, ops);
      cache.setApplied(item.id, true);
      void cache.libraryChanged();
    },
    describeError: (e) => connectErrorText(e),
    advance: false,
  };
}

export function skipLink(item: LinkItem, cache: LinkCache): DecisionSpec {
  return {
    item,
    mode: "inverse",
    message: { text: "Skipped. It stays under Decided:", arabic: item.titleScript === "ar" ? item.title : undefined },
    optimistic: withState("rejected"),
    run: async () => cache.setSkipped(item.id, true),
    undo: async () => cache.setSkipped(item.id, false),
    describeError: () => "The skip could not be saved.",
  };
}

export function showAgainLink(item: LinkItem, cache: LinkCache): DecisionSpec {
  return {
    item,
    mode: "inverse",
    message: { text: "Back in Suggested links:", arabic: item.titleScript === "ar" ? item.title : undefined },
    optimistic: withState("todo"),
    run: async () => cache.setSkipped(item.id, false),
    undo: async () => cache.setSkipped(item.id, true),
    describeError: () => "It could not be shown again.",
    advance: false,
  };
}
