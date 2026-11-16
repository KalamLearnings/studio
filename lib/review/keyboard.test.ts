import { describe, expect, it } from "vitest";
import { BASE_SHORTCUTS, commandForKey, isTypingTarget, mergeShortcuts } from "./keyboard";

const k = (key: string, more: Record<string, boolean> = {}) => ({ key, ...more });
const free = { typing: false };
const typing = { typing: true };

describe("commandForKey", () => {
  it("maps the concept's keys", () => {
    expect(commandForKey(k("j"), free)).toEqual({ type: "next" });
    expect(commandForKey(k("ArrowUp"), free)).toEqual({ type: "prev" });
    expect(commandForKey(k("a"), free)).toEqual({ type: "approve" });
    expect(commandForKey(k("A", { shiftKey: true }), free)).toEqual({ type: "bulkApprove" });
    expect(commandForKey(k("?", { shiftKey: true }), free)).toEqual({ type: "help" });
    expect(commandForKey(k(" "), free)).toEqual({ type: "play" });
    expect(commandForKey(k(" ", { shiftKey: true }), free)).toEqual({ type: "playServed" });
    expect(commandForKey(k("Tab", { shiftKey: true }), free)).toEqual({ type: "prevDecision" });
    expect(commandForKey(k("7"), free)).toEqual({ type: "digit", n: 7 });
    expect(commandForKey(k("z"), free)).toBeNull();
  });
  it("is off while typing, except Escape and Enter", () => {
    expect(commandForKey(k("a"), typing)).toBeNull();
    expect(commandForKey(k("1"), typing)).toBeNull();
    expect(commandForKey(k("Escape"), typing)).toEqual({ type: "escape" });
    expect(commandForKey(k("Enter"), typing)).toEqual({ type: "confirm" });
  });
  it("leaves browser shortcuts alone", () => {
    expect(commandForKey(k("a", { metaKey: true }), free)).toBeNull();
    expect(commandForKey(k("r", { ctrlKey: true }), free)).toBeNull();
  });
});

describe("isTypingTarget", () => {
  it("knows fields", () => {
    expect(isTypingTarget({ tagName: "INPUT" })).toBe(true);
    expect(isTypingTarget({ tagName: "TEXTAREA" })).toBe(true);
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
    expect(isTypingTarget({ tagName: "BUTTON" })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe("mergeShortcuts", () => {
  it("adds lens rows to the groups, new groups before Help, without repeats", () => {
    const merged = mergeShortcuts(BASE_SHORTCUTS, [
      { title: "Decide", rows: [{ label: "Not a real word (spelling)", keys: ["p"] }, { label: "Approve, confirm", keys: ["a"] }] },
      { title: "Context", rows: [{ label: "Open the family", keys: ["f"] }] },
    ]);
    const decide = merged.find((g) => g.title === "Decide")!;
    expect(decide.rows.filter((r) => r.label === "Approve, confirm")).toHaveLength(1);
    expect(decide.rows.at(-1)?.keys).toEqual(["p"]);
    expect(merged.map((g) => g.title)).toEqual(["Move", "Decide", "Context", "Help"]);
    expect(BASE_SHORTCUTS.find((g) => g.title === "Decide")!.rows).toHaveLength(3);
  });
});
