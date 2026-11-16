import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DecisionLedger, type Decision } from "./decisions";
import type { InboxItem } from "./inbox";
import { applyOverlays, clearSessionError, EMPTY_SESSION, sessionChanged, sessionSubmitted, type InboxSession } from "./session";

const item = (id: string): InboxItem => ({
  key: `spelling:${id}`,
  kind: "spelling",
  id,
  title: id,
  titleScript: "ar",
  state: "todo",
  context: "",
  usage: 0,
  waitingSince: null,
  searchText: "",
  bulkSafe: false,
  familyId: null,
  data: null,
});
const approve = (it: InboxItem): InboxItem => ({ ...it, state: "approved" });
const describe_ = (e: unknown) => (e instanceof Error ? e.message : "failed");

/** Drives a real ledger and folds its events into a session, as the hook does. */
function harness() {
  let session: InboxSession = EMPTY_SESSION;
  const ledger = new DecisionLedger({
    timers: { now: () => Date.now(), setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) },
    onChange: (d: Decision) => {
      if (d.status === "held" || (d.status === "sending" && !session.overlays.some((o) => o.decisionId === d.id))) {
        session = sessionSubmitted(session, d, approve);
      } else session = sessionChanged(session, d, describe_);
    },
  });
  return { ledger, get: () => session };
}

describe("optimistic decisions", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const items = [item("a"), item("b")];

  it("shows a decision at once and keeps it once the server agrees", async () => {
    const h = harness();
    h.ledger.submit({ itemKey: "spelling:a", mode: "inverse", run: () => Promise.resolve(), undo: () => Promise.resolve() });
    expect(applyOverlays(items, h.get().overlays)[0].state).toBe("approved");
    expect(h.get().busy["spelling:a"]).toBe("sending");
    expect(h.get().decidedHere.has("spelling:a")).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(h.get().overlays).toEqual([]);
    expect(h.get().busy).toEqual({});
  });

  it("rolls back and shows the reason when the server refuses", async () => {
    const h = harness();
    h.ledger.submit({ itemKey: "spelling:a", mode: "hold", run: () => Promise.reject(new Error("This word is retired")) });
    expect(applyOverlays(items, h.get().overlays)[0].state).toBe("approved");
    await vi.advanceTimersByTimeAsync(5000);
    expect(applyOverlays(items, h.get().overlays)[0].state).toBe("todo");
    expect(h.get().errors["spelling:a"]).toBe("This word is retired");
    expect(h.get().decidedHere.has("spelling:a")).toBe(false);
    expect(clearSessionError(h.get(), "spelling:a").errors).toEqual({});
  });

  it("drops a held decision on undo", async () => {
    const h = harness();
    const run = vi.fn().mockResolvedValue(undefined);
    h.ledger.submit({ itemKey: "spelling:b", mode: "hold", run });
    expect(h.get().busy["spelling:b"]).toBe("held");
    await h.ledger.undo();
    expect(applyOverlays(items, h.get().overlays)[1].state).toBe("todo");
    expect(h.get().busy).toEqual({});
    await vi.advanceTimersByTimeAsync(6000);
    expect(run).not.toHaveBeenCalled();
  });

  it("shows an inverse undo at once and reports a failed one", async () => {
    const h = harness();
    h.ledger.submit({ itemKey: "spelling:a", mode: "inverse", run: () => Promise.resolve(), undo: () => Promise.reject(new Error("no")) });
    await vi.advanceTimersByTimeAsync(0);
    await h.ledger.undo();
    expect(h.get().errors["spelling:a"]).toBe("Undo failed: no");
  });

  it("applies several overlays on one item in order", () => {
    const rename = (it: InboxItem) => ({ ...it, title: "new" });
    const s = sessionSubmitted(sessionSubmitted(EMPTY_SESSION, { id: 1, itemKey: "spelling:a", status: "held" }, rename), { id: 2, itemKey: "spelling:a", status: "sending" }, approve);
    expect(applyOverlays(items, s.overlays)[0]).toMatchObject({ title: "new", state: "approved" });
    expect(applyOverlays(items, [])).toBe(items);
  });
});
