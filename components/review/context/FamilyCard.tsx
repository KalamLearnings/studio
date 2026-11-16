"use client";

/**
 * The Family context card (CW-5): the word's family, its members and their
 * states, the current spelling highlighted. Members come from the `GET /words`
 * rows already loaded (each carries `family_id`); the gloss and headword from
 * `GET /words/families`. `f` opens the family. "Show connections" opens the
 * spelling, or the family, on the Words page (CG-7).
 */

import * as React from "react";
import type { ReviewBank } from "@/lib/hooks/useReviewInbox";
import { awaitsReadsAs } from "@/lib/words/family";
import { cn } from "@/lib/utils";
import { Ar, ContextCard, Kbd, StatusPill } from "../parts";
import { ShowConnections } from "./ShowConnections";

export function familyMembers(bank: ReviewBank, familyId: string) {
  return bank.words
    .filter((w) => w.family_id === familyId && !w.retired_at)
    .sort((a, b) => b.usage_count - a.usage_count || a.arabic.localeCompare(b.arabic));
}

export function FamilyCard({
  familyId,
  currentWordId,
  bank,
  onOpen,
}: {
  familyId: string | null;
  currentWordId: string | null;
  bank: ReviewBank;
  onOpen: (familyId: string | null) => void;
}) {
  if (!familyId) {
    return (
      <ContextCard title="Family">
        <p className="mb-2 text-[12.5px] text-muted-foreground">Not in a family yet.</p>
        <button type="button" className="text-[12.5px] text-primary hover:underline" onClick={() => onOpen(null)}>
          Add to a family <Kbd>f</Kbd>
        </button>
        {currentWordId && (
          <p className="mt-2 border-t pt-2">
            <ShowConnections focus={`word:${currentWordId}`} label="Show this spelling's connections" />
          </p>
        )}
      </ContextCard>
    );
  }
  const family = bank.familiesById.get(familyId);
  const members = familyMembers(bank, familyId);
  return (
    <ContextCard
      title="Family"
      aside={
        <span className="flex items-center gap-3">
          <ShowConnections focus={`family:${familyId}`} label="Connections" />
          <button type="button" className="text-[12.5px] normal-case tracking-normal text-primary hover:underline" onClick={() => onOpen(familyId)}>
            Edit <Kbd>f</Kbd>
          </button>
        </span>
      }
    >
      <div className="mb-1.5 text-[12.5px]">
        <b className="font-semibold">{family?.gloss_en ?? familyId}</b>{" "}
        <span className="font-mono text-xs text-muted-foreground">{familyId}</span>
      </div>
      {bank.familiesStatus === "error" && (
        <p className="mb-1 text-xs text-muted-foreground">The family list could not be loaded; the spellings below are current.</p>
      )}
      <ul className="divide-y divide-border/60">
        {members.map((w) => {
          const reading = awaitsReadsAs({
            id: w.id,
            arabic: w.arabic,
            is_pseudo: !!w.is_pseudo,
            family_id: w.family_id ?? null,
            reads_as_id: w.reads_as_id ?? null,
            retired_at: w.retired_at ?? null,
          });
          return (
            <li
              key={w.id}
              aria-current={w.id === currentWordId ? "true" : undefined}
              className={cn(
                "flex items-center gap-2 py-1.5 text-xs",
                w.id === currentWordId && "-mx-2 rounded-md bg-primary/10 px-2",
              )}
            >
              <Ar className="text-[22px] leading-[1.6]">{w.arabic}</Ar>
              {family?.headword_id === w.id && <StatusPill pill={{ tone: "info", text: "Headword" }} />}
              <span className="flex-1" />
              {w.reviewed_at ? (
                <StatusPill pill={{ tone: "ok", text: "Reviewed" }} />
              ) : reading ? (
                <StatusPill pill={{ tone: "todo", text: "Reading?" }} />
              ) : (
                <StatusPill pill={{ tone: "neutral", text: "Not reviewed" }} />
              )}
            </li>
          );
        })}
      </ul>
      {currentWordId && (
        <p className="mt-2 border-t pt-2">
          <ShowConnections focus={`word:${currentWordId}`} label="Show this spelling's connections" />
        </p>
      )}
    </ContextCard>
  );
}
