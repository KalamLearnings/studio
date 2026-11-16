/**
 * The focus frame's wires (CG-3): one curve from the item in the middle to
 * each box, attached to the nearest side. Pure geometry over rects measured
 * relative to the stage; the frame draws them as SVG (decoration, aria-hidden).
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Wire {
  d: string;
  /** Where the wire meets the box (the dot). */
  end: { x: number; y: number };
}

/** The y of a box's heading, where a side wire lands. */
const HEAD = 20;

export function wire(focus: Rect, box: Rect): Wire {
  const fl = focus.x;
  const fr = focus.x + focus.w;
  const ft = focus.y;
  const fb = focus.y + focus.h;
  const clampY = (y: number) => Math.min(Math.max(y, ft + HEAD), fb - HEAD);
  let x1: number;
  let y1: number;
  let x2: number;
  let y2: number;
  if (box.x + box.w < fl) {
    // Left of the item: from its left side to the box's right edge, at the heading.
    x1 = fl;
    y1 = clampY(box.y + HEAD);
    x2 = box.x + box.w;
    y2 = box.y + HEAD;
  } else if (box.x > fr) {
    x1 = fr;
    y1 = clampY(box.y + HEAD);
    x2 = box.x;
    y2 = box.y + HEAD;
  } else if (box.y + box.h < ft) {
    // Above: from the top centre to the box's bottom centre.
    x1 = focus.x + focus.w / 2;
    y1 = ft;
    x2 = box.x + box.w / 2;
    y2 = box.y + box.h;
  } else {
    // Below: from the bottom, as near the box as the card allows, to the box's top.
    x1 = Math.min(Math.max(box.x + box.w / 2, fl + 24), fr - 24);
    y1 = fb;
    x2 = box.x + 40 > x1 ? box.x + 40 : Math.min(x1, box.x + box.w - 40);
    y2 = box.y;
  }
  const horizontal = Math.abs(x2 - x1) > Math.abs(y2 - y1);
  const r = (n: number) => Math.round(n * 10) / 10;
  const d = horizontal
    ? `M${r(x1)},${r(y1)} C${r((x1 + x2) / 2)},${r(y1)} ${r((x1 + x2) / 2)},${r(y2)} ${r(x2)},${r(y2)}`
    : `M${r(x1)},${r(y1)} C${r(x1)},${r((y1 + y2) / 2)} ${r(x2)},${r((y1 + y2) / 2)} ${r(x2)},${r(y2)}`;
  return { d, end: { x: r(x2), y: r(y2) } };
}

/** A measured rect (`getBoundingClientRect`) relative to the stage's. */
export const relativeRect = (
  r: { left: number; top: number; width: number; height: number },
  stage: { left: number; top: number },
): Rect => ({ x: r.left - stage.left, y: r.top - stage.top, w: r.width, h: r.height });
