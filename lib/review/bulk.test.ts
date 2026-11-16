import { describe, expect, it } from "vitest";
import {
  bulkTargets,
  isRunning,
  pruneChecked,
  runSummary,
  startRun,
  stepRun,
  stopRun,
  toggleChecked,
  type BulkRun,
  type ItemObservation,
} from "./bulk";
import type { InboxItem } from "./inbox";

const item = (id: string, over: Partial<InboxItem> = {}): InboxItem => ({
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
  bulkSafe: true,
  familyId: null,
  data: null,
  ...over,
});

describe("selection", () => {
  it("toggles only bulk-safe items that wait", () => {
    const a = item("a");
    let s = toggleChecked(new Set(), a);
    expect([...s]).toEqual(["spelling:a"]);
    s = toggleChecked(s, a);
    expect(s.size).toBe(0);
    const flagged = item("b", { bulkSafe: false });
    expect(toggleChecked(new Set(), flagged).size).toBe(0);
    const decided = item("c", { state: "approved" });
    expect(toggleChecked(new Set(), decided).size).toBe(0);
    expect(toggleChecked(new Set(), null).size).toBe(0);
  });

  it("never selects a blend, a draft, a phrase or a recording, even if marked safe", () => {
    for (const kind of ["blend", "draft", "phrase", "recording"] as const) {
      expect(toggleChecked(new Set(), item("x", { key: `${kind}:x`, kind })).size).toBe(0);
      expect(bulkTargets([item("x", { key: `${kind}:x`, kind })], new Set([`${kind}:x`]))).toEqual([]);
    }
  });

  it("prunes keys that are gone or decided, and keeps identity when nothing changes", () => {
    const items = [item("a"), item("b", { state: "approved" })];
    const s = new Set(["spelling:a", "spelling:b", "spelling:z"]);
    expect([...pruneChecked(s, items)]).toEqual(["spelling:a"]);
    const kept = new Set(["spelling:a"]);
    expect(pruneChecked(kept, items)).toBe(kept);
  });

  it("returns targets in list order", () => {
    const list = [item("a"), item("b"), item("c", { bulkSafe: false })];
    expect(bulkTargets(list, new Set(["spelling:c", "spelling:b", "spelling:a"])).map((i) => i.id)).toEqual(["a", "b"]);
  });
});

/** A tiny session: items by key, busy keys, errors. */
function session(items: InboxItem[]) {
  const byKey = new Map(items.map((i) => [i.key, i]));
  const busy = new Set<string>();
  const errors = new Map<string, string>();
  const observe = (key: string): ItemObservation => ({ item: byKey.get(key), busy: busy.has(key), error: errors.get(key) });
  return { byKey, busy, errors, observe };
}

function drive(run: BulkRun, s: ReturnType<typeof session>, outcome: (key: string) => "ok" | "fail" | "undo") {
  const sent: string[] = [];
  let r = run;
  for (let guard = 0; guard < 50; guard++) {
    const step = stepRun(r, s.observe);
    r = step.run;
    if (step.type === "finished") break;
    if (step.type === "send") {
      sent.push(step.key);
      // decide(): optimistic and busy.
      s.busy.add(step.key);
      s.byKey.set(step.key, { ...s.byKey.get(step.key)!, state: "approved" });
      continue;
    }
    // wait: the server answers the one in flight.
    const key = r.current!.key;
    s.busy.delete(key);
    const o = outcome(key);
    if (o === "fail") {
      s.errors.set(key, "This word is retired, so it cannot be approved.");
      s.byKey.set(key, { ...s.byKey.get(key)!, state: "todo" });
    }
    if (o === "undo") s.byKey.set(key, { ...s.byKey.get(key)!, state: "todo" });
  }
  return { run: r, sent };
}

describe("the run", () => {
  it("sends one at a time and reports partial failure", () => {
    const items = [item("a"), item("b"), item("c")];
    const s = session(items);
    const { run, sent } = drive(startRun("approve", items), s, (k) => (k === "spelling:b" ? "fail" : "ok"));
    expect(sent).toEqual(["spelling:a", "spelling:b", "spelling:c"]);
    expect(run.done).toEqual(["spelling:a", "spelling:c"]);
    expect(run.failed).toEqual([{ key: "spelling:b", title: "b", reason: "This word is retired, so it cannot be approved." }]);
    expect(isRunning(run)).toBe(false);
    expect(runSummary(run)).toBe("Approved 2 of 3. 1 failed.");
  });

  it("never sends the next while one is in flight", () => {
    const items = [item("a"), item("b")];
    const s = session(items);
    let step = stepRun(startRun("approve", items), s.observe);
    expect(step.type).toBe("send");
    s.busy.add("spelling:a");
    step = stepRun(step.run, s.observe);
    expect(step.type).toBe("wait");
    expect(step.run.current).toEqual({ key: "spelling:a", seen: true });
    expect(runSummary(step.run)).toBe("Approving 1 of 2...");
  });

  it("waits when the session has not shown a just-sent decision yet", () => {
    const items = [item("a")];
    const s = session(items);
    const step = stepRun(startRun("approve", items), s.observe);
    // Not busy yet, still todo, no error: the decision has not reached the session.
    expect(stepRun(step.run, s.observe).type).toBe("wait");
  });

  it("counts an item undone while sending as skipped", () => {
    const items = [item("a"), item("b")];
    const s = session(items);
    const { run } = drive(startRun("approve", items), s, (k) => (k === "spelling:a" ? "undo" : "ok"));
    expect(run.skipped).toEqual(["spelling:a"]);
    expect(run.done).toEqual(["spelling:b"]);
    expect(runSummary(run)).toBe("Approved 1 of 2. 1 skipped.");
  });

  it("skips items that stopped being bulk-safe before their turn", () => {
    const items = [item("a"), item("b")];
    const s = session(items);
    s.byKey.set("spelling:b", { ...items[1], state: "noted_pseudo" });
    const { run, sent } = drive(startRun("approve", items), s, () => "ok");
    expect(sent).toEqual(["spelling:a"]);
    expect(run.skipped).toEqual(["spelling:b"]);
  });

  it("withdraws approvals back to todo", () => {
    const items = [item("a", { state: "approved" }), item("b", { state: "todo" })];
    const s = session(items);
    let r = startRun("withdraw", items);
    let step = stepRun(r, s.observe);
    expect(step.type).toBe("send");
    if (step.type !== "send") return;
    s.busy.add(step.key);
    s.byKey.set(step.key, { ...items[0], state: "todo" });
    s.busy.delete(step.key);
    step = stepRun(step.run, s.observe);
    r = step.run;
    expect(r.done).toEqual(["spelling:a"]);
    // b was never approved, so there is nothing to withdraw.
    expect(r.skipped).toEqual(["spelling:b"]);
    expect(runSummary(r)).toBe("Withdrew 1 of 2. 1 skipped.");
  });

  it("stops: the rest is skipped, the one in flight finishes", () => {
    const items = [item("a"), item("b"), item("c")];
    const s = session(items);
    const step = stepRun(startRun("approve", items), s.observe);
    const stopped = stopRun(step.run);
    expect(stopped.queue).toEqual([]);
    expect(stopped.skipped).toEqual(["spelling:b", "spelling:c"]);
    expect(isRunning(stopped)).toBe(true);
  });
});
