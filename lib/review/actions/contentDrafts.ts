/**
 * The decisions of the Draft meanings and Draft picture labels lenses
 * (CM-DRAFTS). Approving sends the plan's connection ops
 * (`lib/review/draftPlans.ts`) through the gated family, concept and picture
 * routes; Undo sends their inverse (a family or meaning created on the way
 * stays, without its links: nothing is deleted). Skipping is Studio's own:
 * the draft is remembered as skipped in this browser, and Undo forgets it.
 */

import { REAL_CONNECT_API } from "@/lib/connections/connectApi";
import { inverseOps, redoOps, runOps, type ConnectApi, type Op } from "@/lib/connections/ops";
import { connectErrorText } from "@/lib/connections/refusals";
import type { DraftCache } from "@/lib/hooks/useContentDrafts";
import type { InboxItem } from "../inbox";
import type { DraftItem } from "../normalise/drafts";
import type { DecisionSpec } from "./types";

/** The ops each approval sent, by item key, so Undo all (bulk) can send their inverse. */
const sent = new Map<string, Op[]>();

const withState = (state: InboxItem["state"]) => (item: InboxItem) => ({ ...item, state });

const arabicOf = (item: DraftItem) => (item.titleScript === "ar" ? item.title : undefined);

export function approveDraft(item: DraftItem, ops: Op[], cache: DraftCache, api: ConnectApi = REAL_CONNECT_API): DecisionSpec {
  return {
    item,
    mode: "inverse",
    message:
      item.kind === "meaning"
        ? { text: `Meaning "${item.data.draft.gloss_en}" saved for`, arabic: item.title }
        : { text: `Picture connected to ${item.title}` },
    optimistic: withState("approved"),
    run: async () => {
      await runOps(api, ops);
      sent.set(item.key, ops);
      cache.setApplied(item.key, true);
      void cache.libraryChanged();
    },
    undo: async () => {
      await runOps(api, inverseOps(ops));
      sent.delete(item.key);
      cache.setApplied(item.key, false);
      void cache.libraryChanged();
    },
    describeError: (e) => connectErrorText(e),
  };
}

/** Bulk "Undo all": the inverse of what the approval sent. */
export function withdrawDraft(item: DraftItem, cache: DraftCache, api: ConnectApi = REAL_CONNECT_API): DecisionSpec {
  const ops = sent.get(item.key) ?? [];
  return {
    item,
    mode: "inverse",
    message: { text: "Undone:", arabic: arabicOf(item) },
    optimistic: withState("todo"),
    run: async () => {
      await runOps(api, inverseOps(ops));
      sent.delete(item.key);
      cache.setApplied(item.key, false);
      void cache.libraryChanged();
    },
    undo: async () => {
      // A family or meaning the approval created still exists: join it again rather than create it.
      await runOps(api, redoOps(ops));
      sent.set(item.key, ops);
      cache.setApplied(item.key, true);
      void cache.libraryChanged();
    },
    describeError: (e) => connectErrorText(e),
    advance: false,
  };
}

export function skipDraft(item: DraftItem, cache: DraftCache): DecisionSpec {
  return {
    item,
    mode: "inverse",
    message: { text: "Skipped. It stays under Decided:", arabic: arabicOf(item) },
    optimistic: withState("rejected"),
    run: async () => cache.setSkipped(item.key, true),
    undo: async () => cache.setSkipped(item.key, false),
    describeError: () => "The skip could not be saved.",
  };
}

export function showAgainDraft(item: DraftItem, cache: DraftCache): DecisionSpec {
  return {
    item,
    mode: "inverse",
    message: { text: "Back in the drafts:", arabic: arabicOf(item) },
    optimistic: withState("todo"),
    run: async () => cache.setSkipped(item.key, false),
    undo: async () => cache.setSkipped(item.key, true),
    describeError: () => "It could not be shown again.",
    advance: false,
  };
}
