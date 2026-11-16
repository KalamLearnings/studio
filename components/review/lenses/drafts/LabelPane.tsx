"use client";

/**
 * The Draft picture labels pane (CM-DRAFTS). Shows the picture, the drafted
 * meaning and word, and the confidence. Approving creates the meaning when
 * it does not exist, attaches the picture to it, and has the word's family
 * name it, starting the family first when the word has none. Always one at a
 * time: a person looks at each picture.
 */

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DraftAgreement, PictureLabelDraft } from "@/lib/api/contentDrafts";
import type { Pill } from "@/lib/review/inbox";
import type { Op } from "@/lib/connections/ops";
import { useDraftCache } from "@/lib/hooks/useContentDrafts";
import { approveDraft } from "@/lib/review/actions/contentDrafts";
import { defaultFamilyId, defaultLabelName, planLabelDraft } from "@/lib/review/draftPlans";
import { LABEL_DRAFT_TEXT, type LabelItem } from "@/lib/review/normalise/drafts";
import { registryPublicUrl } from "@/lib/services/assetRegistryService";
import type { ConceptName } from "@/lib/types/wordFamilies";
import { ShowConnections } from "../../context/ShowConnections";
import { Hero, PaneFrame } from "../../PaneFrame";
import { Ar, ContextCard, PaneCard, Say, StatusPill } from "../../parts";
import type { PaneProps } from "../types";
import { canDecideDraft, confidencePill, DraftBar } from "./DraftBar";

const AGREEMENT_PILL: Record<DraftAgreement, Pill> = {
  yes: { tone: "ok", text: "Lesson data agrees" },
  partial: { tone: "info", text: "Lesson data partly agrees" },
  no: { tone: "no", text: "Lesson data names something else" },
  no_data: { tone: "neutral", text: "No lesson data names it" },
};

function pictureUrl(d: PictureLabelDraft): string | null {
  if (d.url) return d.url;
  if (!d.path) return null;
  try {
    return registryPublicUrl({ bucket: "curriculum-images", path: d.path });
  } catch {
    return null;
  }
}

/** One plain line per step the approval sends. */
function stepText(o: Op): React.ReactNode {
  switch (o.op) {
    case "createConcept":
      return (
        <>
          Create the meaning <b className="font-semibold">{o.name.en}</b> <span className="font-mono text-xs">{o.slug}</span>
        </>
      );
    case "attachPicture":
      return <>Attach the picture to it</>;
    case "createFamily":
      return (
        <>
          Start the word <span className="font-mono text-xs">{o.familyId}</span> (&ldquo;{o.gloss}&rdquo;)
        </>
      );
    case "linkConcept":
      return (
        <>
          Have the word <span className="font-mono text-xs">{o.familyId}</span> name this meaning
        </>
      );
    default:
      return o.op;
  }
}

export function LabelPane(props: PaneProps) {
  const item = props.item as LabelItem;
  const d = item.data.draft;
  const { bank, roles, userId, now, decide } = props;
  const cache = useDraftCache(userId);
  const editable = canDecideDraft(props);
  const id = React.useId();
  const [name, setName] = React.useState<ConceptName>(() => defaultLabelName(d));
  const suggestedId = defaultFamilyId(d.concept_slug, d.concept_en, bank.familiesById) ?? "";
  const [familyId, setFamilyId] = React.useState<string | null>(null);
  const plan = planLabelDraft(d, bank.familiesById, { name, familyId: familyId ?? suggestedId });
  const approve = plan.ok && item.state === "todo" ? () => decide(approveDraft(item, plan.ops, cache)) : null;
  const url = React.useMemo(() => pictureUrl(d), [d]);
  const word = d.word?.arabic ?? d.arabic;

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
            <img src={url} alt={`Drafted picture of ${d.concept_en}`} className="h-40 w-40 rounded-lg border bg-background object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">{d.path ?? d.asset_id}</span>
          )
        }
        sub={`${LABEL_DRAFT_TEXT}: ${d.concept_en}.`}
      >
        {d.status && d.status !== "active" && <Say tone="warn">This file is {d.status}. It can still be connected while it waits for a label.</Say>}
        {d.status === null && <Say tone="warn">This picture is not in the asset registry.</Say>}
      </Hero>
      <PaneCard title="Meaning">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusPill pill={confidencePill(d.confidence, d.confidence_score)} />
          {d.agrees_with_data !== null && <StatusPill pill={AGREEMENT_PILL[d.agrees_with_data]} />}
          <span className="text-xs text-muted-foreground">from {d.source}</span>
        </div>
        {d.concept ? (
          <p className="text-[12.5px]">
            <b className="font-semibold">{d.concept.name.en}</b> {d.concept.name.ar && <Ar>{d.concept.name.ar}</Ar>}{" "}
            <span className="font-mono text-xs text-muted-foreground">{d.concept.slug}</span>
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="col-span-full text-[12.5px] text-muted-foreground">
              No meaning <span className="font-mono">{d.concept_slug}</span> exists yet. Approving creates it first.
            </p>
            {editable ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor={`${id}-en`}>English name</Label>
                  <Input id={`${id}-en`} value={name.en} onChange={(e) => setName({ ...name, en: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${id}-ar`}>Arabic name (optional)</Label>
                  <Input id={`${id}-ar`} dir="rtl" lang="ar" value={name.ar ?? ""} onChange={(e) => setName({ ...name, ar: e.target.value })} />
                </div>
              </>
            ) : (
              <p className="col-span-full text-[12.5px]">
                <b className="font-semibold">{d.concept_en}</b> {d.arabic && <Ar>{d.arabic}</Ar>}
              </p>
            )}
          </div>
        )}
        {d.note && <p className="mt-2 text-xs text-muted-foreground">Note: {d.note}</p>}
      </PaneCard>
      <PaneCard title="Word">
        {d.word_id ? (
          <div className="grid gap-2 text-[12.5px]">
            <p>
              {word ? <Ar className="text-[22px] leading-[1.6]">{word}</Ar> : <span className="font-mono">{d.word_id}</span>}{" "}
              {d.family ? (
                <span className="text-muted-foreground">
                  in the word <span className="font-mono">{d.family.id}</span>
                  {d.family_concepts.includes(d.concept_slug) ? ", which names this meaning already." : "."}
                </span>
              ) : (
                <span className="text-muted-foreground">is in no word yet. Approving starts one with it as the dictionary form.</span>
              )}
            </p>
            {!d.family && editable && d.word && !d.word.is_pseudo && (
              <div className="max-w-sm space-y-1">
                <Label htmlFor={`${id}-slug`}>Id of the new word (never changes)</Label>
                <Input id={`${id}-slug`} value={familyId ?? suggestedId} onChange={(e) => setFamilyId(e.target.value)} />
              </div>
            )}
          </div>
        ) : (
          <p className="text-[12.5px] text-muted-foreground">
            {d.needs_word ? (
              <>
                No word in the bank names this yet{d.arabic ? <> (<Ar>{d.arabic}</Ar>)</> : null}. Approving connects the picture only; add the word on the
                Words page.
              </>
            ) : (
              "The draft names no word. Approving connects the picture only."
            )}
          </p>
        )}
      </PaneCard>
      {plan.ok && item.state === "todo" && (
        <PaneCard title="Approving will">
          <ol className="grid list-decimal gap-1 ps-5 text-[12.5px]">
            {plan.ops.map((o, i) => (
              <li key={i}>{stepText(o)}</li>
            ))}
          </ol>
        </PaneCard>
      )}
    </>
  );

  const context = (
    <ContextCard title="Connections">
      <ul className="grid gap-1.5">
        <li>
          <ShowConnections focus={`picture:${d.asset_id}`} label="Show connections of the picture" />
        </li>
        {d.concept && (
          <li>
            <ShowConnections focus={`concept:${d.concept.slug}`} label="Show the meaning" />
          </li>
        )}
        {d.word && (
          <li>
            <ShowConnections focus={`word:${d.word.id}`} label="Show connections of the word" />
          </li>
        )}
      </ul>
    </ContextCard>
  );

  const bar = <DraftBar props={props} item={item} approve={approve} blocked={plan.ok ? null : plan.reason} approveLabel="Connect" />;
  return <PaneFrame item={item} main={main} context={context} bar={bar} />;
}
