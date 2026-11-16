import { describe, expect, it } from "vitest";
import { relativeRect, wire } from "./wires";

const focus = { x: 400, y: 200, w: 300, h: 300 };

describe("wire", () => {
  it("leaves the left side for a box on the left, landing at its heading", () => {
    const w = wire(focus, { x: 0, y: 220, w: 300, h: 100 });
    expect(w.end).toEqual({ x: 300, y: 240 });
    expect(w.d.startsWith("M400,240 C")).toBe(true);
  });
  it("leaves the right side for a box on the right", () => {
    expect(wire(focus, { x: 800, y: 300, w: 200, h: 100 }).end).toEqual({ x: 800, y: 320 });
  });
  it("keeps a side wire on the card when the box sits higher", () => {
    expect(wire(focus, { x: 0, y: 0, w: 300, h: 100 }).d.startsWith("M400,220 ")).toBe(true);
  });
  it("goes up from the top centre to a box above", () => {
    const w = wire(focus, { x: 450, y: 0, w: 200, h: 120 });
    expect(w.end).toEqual({ x: 550, y: 120 });
    expect(w.d.startsWith("M550,200 C550,160")).toBe(true);
  });
  it("goes down to a box below", () => {
    expect(wire(focus, { x: 420, y: 560, w: 260, h: 100 }).end).toEqual({ x: 550, y: 560 });
    // A box below and to the left (the letters) is reached from the side, as in the concept.
    expect(wire(focus, { x: 0, y: 560, w: 300, h: 100 }).end).toEqual({ x: 300, y: 580 });
  });
});

describe("relativeRect", () => {
  it("measures from the stage", () => {
    expect(relativeRect({ left: 110, top: 220, width: 30, height: 40 }, { left: 100, top: 200 })).toEqual({ x: 10, y: 20, w: 30, h: 40 });
  });
});
