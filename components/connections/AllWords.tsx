"use client";

/**
 * "All words" (CG-6): the readable whole. One card per word (picture,
 * dictionary form, other spellings), then the loose spellings, the meanings
 * no word names, and the drill spellings.
 */

import * as React from "react";
import type { Graph } from "@/lib/connections/graph";
import { familyLabel } from "@/lib/connections/graph";
import type { AllWords as AllWordsData, CardFlag, FamilyCard } from "@/lib/connections/gaps";
import { nodeKey, type NodeKey } from "@/lib/connections/keys";
import { Ar, Badge, NodeChip, Thumb } from "./parts";
import s from "./words.module.css";

const FLAG: Record<CardFlag, (c: FamilyCard) => string> = {
  "no-meaning": () => "names no meaning",
  "no-picture": () => "no picture",
  readings: (c) => `${c.readings} reading${c.readings > 1 ? "s" : ""} to confirm`,
  "several-meanings": () => "several words in one",
};

function Card({ card, onOpen }: { card: FamilyCard; onOpen: (k: NodeKey) => void }) {
  const key = nodeKey("family", card.family.id);
  const label = familyLabel(card.family);
  return (
    <button type="button" className={s.fcard} onClick={() => onOpen(key)} aria-label={`Word ${label}${card.headword ? `, ${card.headword.arabic}` : ""}. Open`}>
      <span
        className={`row-span-2 grid h-16 w-16 place-items-center rounded-lg bg-muted/60 ${card.picture ? "" : `${s.thumbNone} p-1 text-center text-[10px]`}`}
      >
        {card.picture ? <Thumb url={card.picture.url} alt="" size={60} /> : "no picture"}
      </span>
      <Ar className="block text-right text-[30px] leading-[1.6]">{card.headword?.arabic ?? ""}</Ar>
      <span className="text-right text-xs text-muted-foreground">{label}</span>
      {card.others.length > 0 && (
        <span className="col-span-2 mt-1 flex flex-wrap justify-end gap-x-2.5 gap-y-1 border-t pt-1.5">
          {card.others.map(({ word, readsAs }) => (
            <span key={word.id} className="text-muted-foreground" title={readsAs ? `read as ${readsAs.arabic}` : "spelling"}>
              <Ar className="text-[19px] leading-[1.5]">{word.arabic}</Ar>
              {readsAs && <span className="text-xs"> ↦</span>}
            </span>
          ))}
        </span>
      )}
      {card.flags.length > 0 && (
        <span className="col-span-2 flex flex-wrap gap-1">
          {card.flags.map((f) => (
            <Badge key={f} tone="warn">
              {FLAG[f](card)}
            </Badge>
          ))}
        </span>
      )}
    </button>
  );
}

function Section({ title, n, tone, children }: { title: string; n: number; tone?: "warn" | "ok"; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 mt-6 flex items-baseline gap-2 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title} <Badge tone={tone}>{n}</Badge>
      </h3>
      {children}
    </section>
  );
}

export function AllWords({ graph, data, onOpen }: { graph: Graph; data: AllWordsData; onOpen: (k: NodeKey) => void }) {
  const c = data.counts;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-4">
        <h2 className="text-base font-semibold">All words</h2>
        <span className="text-sm text-muted-foreground">
          {c.families} words · {c.spellings} spellings · {c.meanings} meanings · {c.pictures} pictures
        </span>
      </div>
      <p className="mb-1 text-sm text-muted-foreground">
        Each card is one word: its picture, its dictionary form and its other spellings (↦ marks a spelling read as another). Click a card to open it.
      </p>
      <Section title="Words" n={data.families.length}>
        <div className={s.cards}>
          {data.families.map((card) => (
            <Card key={card.family.id} card={card} onOpen={onOpen} />
          ))}
        </div>
      </Section>
      <Section title="Spellings with no family" n={data.loose.length} tone={data.loose.length ? "warn" : "ok"}>
        <div className="flex flex-wrap gap-2">
          {data.loose.length ? (
            data.loose.map((w) => <NodeChip key={w.id} graph={graph} itemKey={nodeKey("word", w.id)} onOpen={onOpen} />)
          ) : (
            <span className="text-sm text-muted-foreground">None.</span>
          )}
        </div>
      </Section>
      <Section title="Meanings no word names" n={data.orphanMeanings.length} tone={data.orphanMeanings.length ? "warn" : "ok"}>
        <div className="flex flex-wrap gap-2">
          {data.orphanMeanings.length ? (
            data.orphanMeanings.map((m) => <NodeChip key={m.slug} graph={graph} itemKey={nodeKey("concept", m.slug)} onOpen={onOpen} />)
          ) : (
            <span className="text-sm text-muted-foreground">None.</span>
          )}
        </div>
      </Section>
      <Section title="Drill spellings (no family by rule)" n={data.drills.length}>
        <div className="flex flex-wrap gap-2">
          {data.drills.map((w) => (
            <NodeChip key={w.id} graph={graph} itemKey={nodeKey("word", w.id)} onOpen={onOpen} />
          ))}
        </div>
      </Section>
    </div>
  );
}
