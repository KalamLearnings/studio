"use client";

/**
 * The focus frame (CG-3): the item in the middle, every kind of connection in
 * its fixed slot around it, one wire per box. Plain CSS grid and SVG: nothing
 * moves by itself. Under 900 px it is one column, the item first, no wires.
 */

import * as React from "react";
import { Split } from "lucide-react";
import type { Graph } from "@/lib/connections/graph";
import type { NodeKey } from "@/lib/connections/keys";
import { AREAS, type Box, type Neighbourhood } from "@/lib/connections/neighbourhood";
import type { SeveralMeanings } from "@/lib/connections/meanings";
import { familyLabel } from "@/lib/connections/graph";
import { relativeRect, wire } from "@/lib/connections/wires";
import { useEditing } from "./extension";
import { FocusCard } from "./FocusCard";
import { GroupBox } from "./GroupBox";
import { Ar, CONNECTION_COLOR } from "./parts";
import s from "./words.module.css";

interface DrawnWire {
  id: string;
  d: string;
  end: { x: number; y: number };
  color: string;
  dashed: boolean;
  faint: boolean;
}

function useWires(stageRef: React.RefObject<HTMLDivElement>, cardRef: React.RefObject<HTMLElement>, boxes: Box[]) {
  const [wires, setWires] = React.useState<DrawnWire[]>([]);
  const boxesRef = React.useRef(boxes);
  boxesRef.current = boxes;

  const draw = React.useCallback(() => {
    const stage = stageRef.current;
    const card = cardRef.current;
    if (!stage || !card) return;
    const svg = stage.querySelector("svg");
    if (svg && getComputedStyle(svg).display === "none") {
      setWires((w) => (w.length ? [] : w));
      return;
    }
    const sr = stage.getBoundingClientRect();
    const fr = relativeRect(card.getBoundingClientRect(), sr);
    const out: DrawnWire[] = [];
    for (const b of boxesRef.current) {
      const el = stage.querySelector<HTMLElement>(`[data-box="${b.id}"]`);
      if (!el) continue;
      const w = wire(fr, relativeRect(el.getBoundingClientRect(), sr));
      const empty = b.state === "ready" && (b.rows ? !(b.activities?.length || b.books?.length) : b.items.length === 0);
      out.push({ id: b.id, ...w, color: CONNECTION_COLOR[b.kind], dashed: !b.editable || empty, faint: empty });
    }
    // Every render re-measures; only a real change re-renders (no loop).
    setWires((prev) => (JSON.stringify(prev) === JSON.stringify(out) ? prev : out));
  }, [stageRef, cardRef]);

  React.useLayoutEffect(() => {
    draw();
  });

  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(stage);
    for (const el of Array.from(stage.children)) ro.observe(el);
    window.addEventListener("resize", schedule);
    // The Arabic face changes line heights once it loads.
    document.fonts?.ready.then(schedule).catch(() => undefined);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [stageRef, draw]);

  return wires;
}

/** Owner decision 5: one spelling, several words. CG-5 adds the split on each meaning (`splitExtra`). */
function MeaningsNote({ graph, meanings, onOpen, focus }: { graph: Graph; meanings: SeveralMeanings[]; onOpen: (k: NodeKey) => void; focus: NodeKey }) {
  const editing = useEditing();
  return (
    <>
      {meanings.map((m) => (
        <aside
          key={m.skeleton}
          className="mb-4 rounded-lg border px-3 py-2.5 text-[13px]"
          style={{ borderColor: "hsl(37 91% 50% / 0.5)", background: "hsl(37 91% 50% / 0.07)" }}
          aria-label="Suggestion: split by meaning"
        >
          <p className="flex items-start gap-2 font-semibold">
            <Split aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--gap-text)" }} />
            <span>
              <Ar className="text-[19px]">{m.skeleton}</Ar> can be {m.meanings.length} different words.{" "}
              {m.needsSplit ? "Split them into separate families: one family for each word." : "Each word has its own family already."}
            </span>
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 pl-6">
            {m.meanings.map((g, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-1.5">
                {g.words.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className="rounded px-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                    onClick={() => onOpen(`word:${w.id}`)}
                    aria-label={`Spelling ${w.arabic}. Open`}
                  >
                    <Ar className="text-[22px] leading-[1.6]">{w.arabic}</Ar>
                  </button>
                ))}
                <span className="text-xs text-muted-foreground">
                  {g.familyIds.length
                    ? g.familyIds.map((f) => `in "${familyLabel(graph.families.get(f), f)}"`).join(", ")
                    : "no family"}
                </span>
                {editing?.splitExtra?.(m, g, focus)}
              </li>
            ))}
          </ul>
          {m.needsSplit && !editing && (
            <p className="mt-1.5 pl-6 text-xs text-muted-foreground">A curriculum lead or a phrase reviewer can split them here.</p>
          )}
        </aside>
      ))}
    </>
  );
}

export function FocusFrame({
  graph,
  hood,
  onOpen,
  cardRef,
}: {
  graph: Graph;
  hood: Neighbourhood;
  onOpen: (key: NodeKey) => void;
  cardRef: React.RefObject<HTMLElement>;
}) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const wires = useWires(stageRef, cardRef, hood.boxes);
  const byArea = AREAS.map((a) => [a, hood.boxes.filter((b) => b.area === a)] as const).filter(([, bs]) => bs.length);

  return (
    <>
      <MeaningsNote graph={graph} meanings={hood.meanings} onOpen={onOpen} focus={hood.focus} />
      <div ref={stageRef} className={s.stage}>
        <svg className={s.wires} aria-hidden="true">
          {wires.map((w) => (
            <g key={w.id}>
              <path
                d={w.d}
                fill="none"
                stroke={w.color}
                strokeWidth={w.faint ? 1.5 : 2}
                strokeOpacity={w.faint ? 0.45 : 0.8}
                strokeDasharray={w.dashed ? "5 5" : undefined}
              />
              <circle cx={w.end.x} cy={w.end.y} r={3.5} fill={w.color} fillOpacity={w.faint ? 0.45 : 1} />
            </g>
          ))}
        </svg>
        <FocusCard ref={cardRef} graph={graph} focus={hood.focus} />
        {byArea.map(([area, bs]) => (
          <div key={area} className={s.slot} data-area={area}>
            {bs.map((b) => (
              <GroupBox key={`${hood.focus}#${b.id}`} box={b} graph={graph} focus={hood.focus} onOpen={onOpen} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
