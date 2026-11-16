"use client";

/**
 * The Suggested links pane. A family proposal ("These look like forms of one
 * word") lists its spellings, why each belongs and where each is now; a
 * picture proposal ("This picture looks like this meaning") shows the picture,
 * the meaning and the evidence. `a` approves through the gated link routes,
 * `r` skips (remembered in this browser; the backend has no dismiss).
 * Only a curriculum lead or a phrase reviewer decides.
 */

import * as React from "react";
import { Check, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FamilyProposal, FamilyProposalMember, PictureProposal } from "@/lib/api/wordProposals";
import { useLinkCache } from "@/lib/hooks/useLinkProposals";
import type { ReviewBank } from "@/lib/hooks/useReviewInbox";
import { approveLink, showAgainLink, skipLink } from "@/lib/review/actions/links";
import { canDecide } from "@/lib/review/inbox";
import { defaultMeaningName, planFamilyProposal, planPictureProposal, type MeaningName } from "@/lib/review/linkPlans";
import { FAMILY_LINK_TEXT, humaniseSlug, PICTURE_LINK_TEXT, type LinkItem } from "@/lib/review/normalise/links";
import { registryPublicUrl } from "@/lib/services/assetRegistryService";
import { slugFromText } from "@/lib/words/family";
import { cn } from "@/lib/utils";
import { usePaneCommands } from "../../commands";
import { ShowConnections } from "../../context/ShowConnections";
import { DecisionBar, GateBar, Hero, NextHint, PaneFrame } from "../../PaneFrame";
import { Ar, ContextCard, KBD_ON_BUTTON, Kbd, PaneCard, Say, StatusPill } from "../../parts";
import type { PaneProps } from "../types";

const REASON_TEXT: Record<FamilyProposalMember["reason"], string> = {
  headword: "the dictionary form",
  case_variant: "the same word with another ending",
  reads_as: "no harakat, read as",
};

const AGREEMENT_TEXT: Record<string, string> = {
  data_only: "From the lesson data only; nobody has looked at the picture yet.",
};

function familyName(bank: ReviewBank, id: string | null): string {
  if (!id) return "in no word yet";
  const f = bank.familiesById.get(id);
  return `in "${f?.gloss_en || id}"`;
}

export function LinkPane(props: PaneProps) {
  const item = props.item as LinkItem;
  return item.data.type === "family" ? (
    <FamilyLinkPane {...props} item={item} proposal={item.data.proposal} />
  ) : (
    <PictureLinkPane {...props} item={item} proposal={item.data.proposal} />
  );
}

/** The decision bar and keys shared by both kinds of proposal. */
function useLinkBar(props: PaneProps & { item: LinkItem }, approve: (() => void) | null, blocked: string | null) {
  const { item, roles, userId, decide, busy, error, clearError } = props;
  const cache = useLinkCache(userId);
  const can = canDecide("phrase", roles);
  const todo = item.state === "todo";
  const skip = () => decide(skipLink(item, cache));

  usePaneCommands((cmd) => {
    if (busy || !can || !todo) return false;
    if (cmd.type === "approve" && approve) {
      approve();
      return true;
    }
    if (cmd.type === "reject") {
      skip();
      return true;
    }
    return false;
  });

  if (!can) {
    return (
      <GateBar item={item} roles={roles} status={item.state === "approved" ? "Connected." : item.state === "rejected" ? "Skipped." : "Suggested."} />
    );
  }
  if (item.state === "approved") return <DecisionBar busy={busy} error={error} onDismissError={clearError} status="Connected. u undoes it." />;
  if (item.state === "rejected") {
    return (
      <DecisionBar
        busy={busy}
        error={error}
        onDismissError={clearError}
        status="Skipped. It is remembered in this browser only."
        actions={
          <Button variant="outline" size="sm" onClick={() => decide(showAgainLink(item, cache))}>
            Show it again
          </Button>
        }
      />
    );
  }
  return (
    <DecisionBar
      busy={busy}
      error={error}
      onDismissError={clearError}
      status={blocked ?? <NextHint />}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={skip}>
            <SkipForward className="me-1.5 h-4 w-4" aria-hidden="true" /> Skip <Kbd className="ms-2">r</Kbd>
          </Button>
          <Button
            size="sm"
            className="bg-success text-success-foreground hover:bg-success/90"
            disabled={!approve}
            onClick={() => approve?.()}
          >
            <Check className="me-1.5 h-4 w-4" aria-hidden="true" /> Connect <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>a</Kbd>
          </Button>
        </>
      }
    />
  );
}

// ---- family ------------------------------------------------------------------------------

function FamilyLinkPane(props: PaneProps & { item: LinkItem; proposal: FamilyProposal }) {
  const { item, proposal: p, bank, roles, userId, now, decide } = props;
  const cache = useLinkCache(userId);
  const needsName = p.slug === null || p.slug_clash;
  const [gloss, setGloss] = React.useState(p.gloss ?? "");
  const [slug, setSlug] = React.useState(needsName ? (p.slug_clash ? "" : (slugFromText(p.gloss) ?? "")) : (p.slug ?? ""));
  const id = React.useId();
  const words = (wid: string) => {
    const w = bank.wordsById.get(wid);
    return w ? { familyId: w.family_id ?? null, readsAsId: w.reads_as_id ?? null } : undefined;
  };
  const plan = planFamilyProposal(p, words, bank.familiesById, needsName ? { slug, gloss: gloss.trim() || null } : { slug: p.slug ?? "", gloss: gloss.trim() || null });
  const approve = plan.ok && item.state === "todo" ? () => decide(approveLink(item, plan.ops, cache)) : null;
  const bar = useLinkBar(props, approve, plan.ok ? null : plan.reason);
  const arabicOf = (wid: string | undefined) => (wid ? (p.members.find((m) => m.id === wid)?.arabic ?? bank.wordsById.get(wid)?.arabic ?? wid) : "");

  const main = (
    <>
      <Hero item={item} roles={roles} userId={userId} now={now} sub={`${FAMILY_LINK_TEXT}. Connecting puts them in one word family.`} />
      <PaneCard title={`Spellings (${p.members.length})`}>
        <ul className="divide-y divide-border/60">
          {p.members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[12.5px]">
              <Ar className="text-[24px] leading-[1.6]">{m.arabic}</Ar>
              <span>
                {REASON_TEXT[m.reason]}
                {m.reason === "reads_as" && m.of && (
                  <>
                    {" "}
                    <Ar className="text-[18px]">{arabicOf(m.of)}</Ar>
                  </>
                )}
              </span>
              <span className="flex-1" />
              <span className="text-xs text-muted-foreground">{familyName(bank, m.family_id)}</span>
              {m.reason === "reads_as" && m.reads_as_id === m.of && <StatusPill pill={{ tone: "ok", text: "reading confirmed" }} />}
            </li>
          ))}
        </ul>
        {p.existing_family_ids.length > 0 && (
          <Say tone="warn">
            Some of these are in a word already ({p.existing_family_ids.join(", ")}). Connecting moves them.
          </Say>
        )}
      </PaneCard>
      <PaneCard title="The word">
        {plan.ok && !plan.create && !needsName ? (
          <p className="text-[12.5px]">
            They join the word <span className="font-mono">{plan.familyId}</span>
            {bank.familiesById.get(plan.familyId)?.gloss_en ? ` ("${bank.familiesById.get(plan.familyId)?.gloss_en}")` : ""}.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`${id}-gloss`}>English meaning</Label>
              <Input
                id={`${id}-gloss`}
                value={gloss}
                disabled={!needsName && !plan.ok}
                onChange={(e) => {
                  setGloss(e.target.value);
                  if (needsName && !p.slug_clash) setSlug(slugFromText(e.target.value) ?? "");
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-slug`}>Id (never changes)</Label>
              <Input id={`${id}-slug`} value={needsName ? slug : (p.slug ?? "")} readOnly={!needsName} onChange={(e) => setSlug(e.target.value)} />
              {p.slug_clash && <p className="text-xs text-muted-foreground">Another suggestion took the id {p.slug} first. Pick another.</p>}
            </div>
            {plan.ok && <p className="col-span-full text-xs text-muted-foreground">{plan.create ? "A new word family is created." : `They join the existing word ${plan.familyId}.`}</p>}
          </div>
        )}
      </PaneCard>
    </>
  );

  const head = p.members.find((m) => m.id === p.headword_id);
  const context = (
    <ContextCard title="Connections">
      <ul className="grid gap-1.5">
        <li>
          <ShowConnections focus={`word:${p.headword_id}`} label={`Show connections of the dictionary form`} />
        </li>
        {head?.family_id && (
          <li>
            <ShowConnections focus={`family:${head.family_id}`} label={`Show the word ${head.family_id}`} />
          </li>
        )}
      </ul>
    </ContextCard>
  );

  return <PaneFrame item={item} main={main} context={context} bar={bar} />;
}

// ---- picture -----------------------------------------------------------------------------

function pictureUrl(p: PictureProposal): string | null {
  if (p.url) return p.url;
  try {
    return registryPublicUrl({ bucket: "curriculum-images", path: p.path });
  } catch {
    return null;
  }
}

function PictureLinkPane(props: PaneProps & { item: LinkItem; proposal: PictureProposal }) {
  const { item, proposal: p, bank, roles, userId, now, decide } = props;
  const cache = useLinkCache(userId);
  const [name, setName] = React.useState<MeaningName>(() => defaultMeaningName(p));
  const id = React.useId();
  const url = React.useMemo(() => pictureUrl(p), [p]);
  const blocked = !p.concept && !name.en.trim() ? "Give the new meaning an English name first." : null;
  const approve = !blocked && item.state === "todo" ? () => decide(approveLink(item, planPictureProposal(p, name), cache)) : null;
  const bar = useLinkBar(props, approve, blocked);
  const meaning = p.concept?.name.en ?? humaniseSlug(p.proposed_slug);

  const main = (
    <>
      <Hero
        item={item}
        roles={roles}
        userId={userId}
        now={now}
        big={
          url ? (
            // eslint-disable-next-line @next/next/no-img-element -- storage URLs, not optimisable here
            <img src={url} alt={`Suggested picture of ${meaning}`} className="h-40 w-40 rounded-lg border bg-background object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">{p.path}</span>
          )
        }
        sub={`${PICTURE_LINK_TEXT}: ${meaning}.`}
      >
        {p.status !== "active" && <Say tone="warn">This file is {p.status}. It can still be connected while it waits for a label.</Say>}
      </Hero>
      <PaneCard title="Meaning">
        {p.concept ? (
          <p className="text-[12.5px]">
            <b className="font-semibold">{p.concept.name.en}</b> {p.concept.name.ar && <Ar>{p.concept.name.ar}</Ar>}{" "}
            <span className="font-mono text-xs text-muted-foreground">{p.concept.slug}</span>
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="col-span-full text-[12.5px] text-muted-foreground">
              No meaning <span className="font-mono">{p.proposed_slug}</span> exists yet. Connecting creates it first.
            </p>
            <div className="space-y-1">
              <Label htmlFor={`${id}-en`}>English name</Label>
              <Input id={`${id}-en`} value={name.en} onChange={(e) => setName({ ...name, en: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-ar`}>Arabic name (optional)</Label>
              <Input id={`${id}-ar`} dir="rtl" lang="ar" value={name.ar ?? ""} onChange={(e) => setName({ ...name, ar: e.target.value })} />
            </div>
          </div>
        )}
      </PaneCard>
      <PaneCard title="Why it is suggested">
        <ul className="grid gap-1 text-[12.5px]">
          <li>{AGREEMENT_TEXT[p.agreement] ?? `Evidence: ${p.agreement.replace(/_/g, " ")}.`}</li>
          {p.evidence.name_stem && (
            <li>
              The file is named <span className="font-mono">{p.evidence.name_stem}</span>.
            </li>
          )}
          <li>
            Used in {p.evidence.activities} {p.evidence.activities === 1 ? "activity" : "activities"}, as the right answer {p.evidence.correct_slots}{" "}
            {p.evidence.correct_slots === 1 ? "time" : "times"}.
          </li>
        </ul>
      </PaneCard>
    </>
  );

  const context = (
    <>
      <ContextCard title="Spellings with these letters">
        {p.library_matches.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground">None in the word bank.</p>
        ) : (
          <ul className="grid gap-1.5">
            {p.library_matches.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-xs">
                <Ar className="text-[20px] leading-[1.6]">{m.arabic}</Ar>
                <span className="flex-1 text-muted-foreground">{familyName(bank, m.family_id)}</span>
                <ShowConnections focus={`word:${m.id}`} label="Connections" />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">A word gets this picture once its family names the meaning.</p>
      </ContextCard>
      {p.concept && (
        <ContextCard title="Meaning">
          <ShowConnections focus={`concept:${p.concept.slug}`} />
        </ContextCard>
      )}
    </>
  );

  return <PaneFrame item={item} main={main} context={context} bar={bar} />;
}
