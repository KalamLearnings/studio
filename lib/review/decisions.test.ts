import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DecisionLedger, type Decision, type DecisionStatus } from "./decisions";

const timers = () => ({
  now: () => Date.now(),
  setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  clearTimeout: (h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>),
});

describe("DecisionLedger", () => {
  let log: Array<[number, DecisionStatus]>;
  let ledger: DecisionLedger;
  beforeEach(() => {
    vi.useFakeTimers();
    log = [];
    ledger = new DecisionLedger({ holdMs: 5000, timers: timers(), onChange: (d: Decision) => log.push([d.id, d.status]) });
  });
  afterEach(() => vi.useRealTimers());

  it("holds a one-way decision for 5 s, then sends it", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    ledger.submit({ itemKey: "draft:1", mode: "hold", run });
    await vi.advanceTimersByTimeAsync(4999);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(log.map(([, s]) => s)).toEqual(["held", "sending", "done"]);
  });

  it("cancels a held decision on undo, so nothing is sent", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    ledger.submit({ itemKey: "draft:1", mode: "hold", run });
    await vi.advanceTimersByTimeAsync(2000);
    const undone = await ledger.undo();
    expect(undone?.status).toBe("cancelled");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(run).not.toHaveBeenCalled();
  });

  it("sends an inverse decision at once and its inverse on undo", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const undo = vi.fn().mockResolvedValue(undefined);
    ledger.submit({ itemKey: "spelling:1", mode: "inverse", run, undo });
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(1);
    const d = await ledger.undo();
    expect(undo).toHaveBeenCalledTimes(1);
    expect(d?.status).toBe("undone");
  });

  it("waits for an inverse decision still being sent before undoing it", async () => {
    let finish: () => void = () => undefined;
    const run = vi.fn(() => new Promise<void>((r) => (finish = r)));
    const undo = vi.fn().mockResolvedValue(undefined);
    ledger.submit({ itemKey: "spelling:1", mode: "inverse", run, undo });
    const pending = ledger.undo();
    expect(undo).not.toHaveBeenCalled();
    finish();
    await pending;
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it("undoes the newest decision first, and only inside the window", async () => {
    const a = { itemKey: "a", mode: "inverse" as const, run: vi.fn().mockResolvedValue(undefined), undo: vi.fn().mockResolvedValue(undefined) };
    const b = { ...a, itemKey: "b", undo: vi.fn().mockResolvedValue(undefined) };
    ledger.submit(a);
    await vi.advanceTimersByTimeAsync(3000);
    ledger.submit(b);
    await ledger.undo();
    expect(b.undo).toHaveBeenCalled();
    expect(a.undo).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2500);
    expect(ledger.undoable()).toBeNull();
    expect(await ledger.undo()).toBeNull();
  });

  it("reports a failed send and a failed undo", async () => {
    const err = new Error("no");
    ledger.submit({ itemKey: "x", mode: "hold", run: vi.fn().mockRejectedValue(err) });
    await vi.advanceTimersByTimeAsync(5000);
    expect(log.at(-1)).toEqual([1, "failed"]);
    ledger.submit({ itemKey: "y", mode: "inverse", run: vi.fn().mockResolvedValue(undefined), undo: vi.fn().mockRejectedValue(err) });
    await vi.advanceTimersByTimeAsync(0);
    const d = await ledger.undo();
    expect(d?.status).toBe("undo_failed");
    expect(d?.error).toBe(err);
  });

  it("flushes held decisions when the page closes", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    ledger.submit({ itemKey: "x", mode: "hold", run });
    ledger.flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(1);
    expect(ledger.open()).toEqual([]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("refuses an inverse decision without an undo", () => {
    expect(() => ledger.submit({ itemKey: "x", mode: "inverse", run: vi.fn() })).toThrow();
  });
});
