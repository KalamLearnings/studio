"use client";

/**
 * Search (CG-4): type Arabic (with or without harakat) or English; results
 * grouped by kind. A combobox: arrows move, Enter opens, Escape clears, "/"
 * from anywhere on the page focuses it.
 */

import * as React from "react";
import { Search } from "lucide-react";
import type { Graph } from "@/lib/connections/graph";
import { NODE_KINDS } from "@/lib/connections/kinds";
import { NODE_TYPES, typeOfKey, type NodeKey } from "@/lib/connections/keys";
import { search, type SearchEntry } from "@/lib/connections/search";
import { Kbd } from "@/components/review/parts";
import { Ar, KIND_COLOR, KindIcon, labelOf, Thumb } from "./parts";
import s from "./words.module.css";

export interface SearchBoxHandle {
  focus(): void;
}

export const SearchBox = React.forwardRef<
  SearchBoxHandle,
  { graph: Graph | null; index: SearchEntry[]; onOpen: (key: NodeKey) => void }
>(function SearchBox({ graph, index, onOpen }, ref) {
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();
  React.useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }), []);

  const results = React.useMemo(() => search(index, q, 30), [index, q]);
  // Grouped by kind, in the kinds' order; `order` is the arrow-key order.
  const groups = React.useMemo(
    () => NODE_TYPES.map((t) => [t, results.filter((k) => typeOfKey(k) === t)] as const).filter(([, ks]) => ks.length),
    [results],
  );
  const order = React.useMemo(() => groups.flatMap(([, ks]) => ks), [groups]);
  const shown = open && q.trim().length > 0;
  const optId = (i: number) => `${listId}-o${i}`;

  React.useEffect(() => setSel(0), [q]);
  React.useEffect(() => {
    if (!shown) return;
    document.getElementById(optId(sel))?.scrollIntoView({ block: "nearest" });
  });
  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const choose = (k: NodeKey) => {
    setQ("");
    setOpen(false);
    onOpen(k);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (order.length) setSel((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + order.length) % order.length);
    } else if (e.key === "Enter") {
      const k = order[sel] ?? order[0];
      if (k) {
        e.preventDefault();
        choose(k);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (q) setQ("");
      else inputRef.current?.blur();
      setOpen(false);
    }
  };

  let i = -1;
  return (
    <div ref={boxRef} className={s.search}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Find a word"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={shown && order.length ? optId(sel) : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={graph ? "Find a word, spelling, meaning, picture or letter" : "Loading the word bank..."}
        disabled={!graph}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-9 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      />
      <Kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">/</Kbd>
      <div id={listId} role="listbox" aria-label="Results" className={s.results} hidden={!shown}>
        {shown && order.length === 0 && <p className="px-2 py-3 text-center text-sm text-muted-foreground">Nothing matches.</p>}
        {shown &&
          graph &&
          groups.map(([t, ks]) => (
            <div key={t} role="group" aria-label={NODE_KINDS[t].plural}>
              <div className="mx-2 mb-1 mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" aria-hidden="true">
                {NODE_KINDS[t].plural}
              </div>
              {ks.map((k) => {
                i += 1;
                const idx = i;
                const L = labelOf(graph, k);
                return (
                  <div
                    key={k}
                    id={optId(idx)}
                    role="option"
                    aria-selected={idx === sel}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(k)}
                    onMouseMove={() => setSel(idx)}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 ${idx === sel ? "bg-muted" : ""}`}
                  >
                    <span style={{ color: KIND_COLOR[t] }}>
                      <KindIcon type={t} />
                    </span>
                    {L.img && <Thumb url={L.img} alt="" size={32} />}
                    {L.ar && <Ar className="text-[22px] leading-[1.6]">{L.ar}</Ar>}
                    <span className="truncate text-sm">{L.en}</span>
                  </div>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
});
