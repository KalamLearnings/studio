"use client";

/**
 * Small parts of the Words page: kind colours and icons, chips, badges,
 * thumbnails. Arabic always goes through Review's `<Ar>` (isolated RTL,
 * vowelled Noto Naskh Arabic).
 */

import * as React from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Ar } from "@/components/review/parts";
import type { ConnectionKind } from "@/lib/connections/kinds";
import { NODE_KINDS } from "@/lib/connections/kinds";
import { familyLabel, type Graph } from "@/lib/connections/graph";
import { idOfKey, typeOfKey, type NodeKey, type NodeType } from "@/lib/connections/keys";
import type { ItemFlag } from "@/lib/connections/neighbourhood";
import s from "./words.module.css";

export { Ar };

export const KIND_COLOR: Record<NodeType, string> = {
  word: "var(--k-word)",
  family: "var(--k-family)",
  concept: "var(--k-concept)",
  picture: "var(--k-picture)",
  letter: "var(--k-letter)",
  activity: "var(--k-activity)",
};

export const CONNECTION_COLOR: Record<ConnectionKind, string> = {
  forms: "var(--k-family)",
  readings: "var(--k-word)",
  meaning: "var(--k-concept)",
  pictures: "var(--k-picture)",
  ownPicture: "var(--k-picture)",
  letters: "var(--k-letter)",
  usedIn: "var(--k-activity)",
};

const ICON_PATHS: Record<NodeType, React.ReactNode> = {
  word: <path d="M4 7V5h16v2M9 19h6M12 5v14" />,
  family: (
    <>
      <rect x="3" y="4" width="18" height="5" rx="1" />
      <rect x="5" y="11" width="14" height="4" rx="1" />
      <rect x="7" y="17" width="10" height="3" rx="1" />
    </>
  ),
  concept: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.4 1 2.5h6c0-1.1.3-1.8 1-2.5A6 6 0 0 0 12 3z" />,
  picture: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 17-5-5-9 8" />
    </>
  ),
  letter: <path d="M5 12c0 3 3 5 7 5s7-2 7-5M12 21v.01" />,
  activity: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="m10 8 6 4-6 4z" />
    </>
  ),
};

export function KindIcon({ type, size = 14, className }: { type: NodeType; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      {ICON_PATHS[type]}
    </svg>
  );
}

export const LockIcon = ({ className }: { className?: string }) => (
  <Lock aria-hidden="true" className={cn("inline h-3 w-3 shrink-0 align-[-2px]", className)} />
);

export function Badge({ tone, children }: { tone?: "warn" | "ok"; children: React.ReactNode }) {
  return (
    <span className={s.badge} data-tone={tone}>
      {children}
    </span>
  );
}

/** A storage picture. Asset URLs come from storage, as on the concepts page. */
export function Thumb({ url, alt, size, className }: { url: string; alt: string; size: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- storage URLs, not optimisable here
    <img src={url} alt={alt} width={size} height={size} className={cn("object-contain", className)} style={{ width: size, height: size }} />
  );
}

/** What an item is called, in English and Arabic, for chips, the trail and search rows. */
export interface ItemLabel {
  ar?: string;
  en?: string;
  img?: string;
}

export function labelOf(g: Graph, key: NodeKey): ItemLabel {
  const id = idOfKey(key);
  switch (typeOfKey(key)) {
    case "word": {
      const w = g.words.get(id);
      const fam = w?.familyId ? g.families.get(w.familyId) : undefined;
      return { ar: w?.arabic ?? id, en: fam ? familyLabel(fam) : (w?.english ?? undefined) };
    }
    case "family": {
      const f = g.families.get(id);
      const head = f?.headwordId ? g.words.get(f.headwordId) : undefined;
      return { ar: head?.arabic, en: familyLabel(f, id) };
    }
    case "concept": {
      const c = g.concepts.get(id);
      return { en: c?.name.en ?? id, ar: c?.name.ar };
    }
    case "picture": {
      const p = g.pictures.get(id);
      const c = g.conceptsOfPicture(id)[0];
      return { en: c?.name.en ?? p?.label ?? "Picture", img: p?.url };
    }
    case "letter": {
      const l = g.letters.get(id);
      return { ar: l?.glyph, en: l?.name ?? id };
    }
    default:
      return { en: id };
  }
}

/** The accessible name of an item: "Spelling كِتَاب, book". */
export function ariaName(g: Graph, key: NodeKey): string {
  const L = labelOf(g, key);
  return [NODE_KINDS[typeOfKey(key)].name, L.ar, L.en].filter(Boolean).join(", ");
}

const FLAG_TEXT: Record<ItemFlag, { text: string; tone?: "warn" }> = {
  drill: { text: "drill" },
  "no-reading": { text: "no reading", tone: "warn" },
  "not-reviewed": { text: "not reviewed", tone: "warn" },
};

export interface ChipProps {
  graph: Graph;
  itemKey: NodeKey;
  onOpen: (key: NodeKey) => void;
  head?: boolean;
  tag?: string;
  flags?: readonly ItemFlag[];
  /** Picture chips show their label unless compact. */
  compact?: boolean;
}

/** One item: a button that re-centres the frame on it. */
export function NodeChip({ graph, itemKey, onOpen, head, tag, flags = [], compact }: ChipProps) {
  const type = typeOfKey(itemKey);
  const L = labelOf(graph, itemKey);
  return (
    <button
      type="button"
      className={s.chip}
      style={{ ["--kc" as string]: KIND_COLOR[type] }}
      onClick={() => onOpen(itemKey)}
      aria-label={`${ariaName(graph, itemKey)}${head ? ", dictionary form" : ""}${tag ? `, ${tag}` : ""}. Open`}
      data-node={itemKey}
    >
      <span className={s.dot} aria-hidden="true" />
      {tag && <span className="text-[11px] text-muted-foreground">{tag}</span>}
      {type === "picture" && L.img ? (
        <>
          <Thumb url={L.img} alt="" size={44} className="my-[3px]" />
          {!compact && <span className="truncate text-xs text-muted-foreground">{L.en}</span>}
        </>
      ) : L.ar ? (
        <>
          <Ar className="text-[26px] leading-[1.7]">{L.ar}</Ar>
          {L.en && <span className="text-xs text-muted-foreground">{L.en}</span>}
        </>
      ) : (
        <span className="truncate text-[13px]">{L.en}</span>
      )}
      {head && (
        <span className="text-xs" style={{ color: "var(--k-family)" }} title="Dictionary form" aria-hidden="true">
          ★
        </span>
      )}
      {flags.map((f) => (
        <Badge key={f} tone={FLAG_TEXT[f].tone}>
          {FLAG_TEXT[f].text}
        </Badge>
      ))}
    </button>
  );
}
