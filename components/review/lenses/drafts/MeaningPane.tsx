"use client";

/**
 * The Draft meanings pane (CM-DRAFTS). Shows the spelling, the drafted
 * English meaning and its confidence, and where approving writes it: the
 * word's family (replacing the meaning it has, shown), or a new family with
 * this spelling as its dictionary form. The reviewer may edit the meaning,
 * and the new family's id, before approving.
 */

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDraftCache } from "@/lib/hooks/useContentDrafts";
import { approveDraft } from "@/lib/review/actions/contentDrafts";
import { defaultFamilyId, planMeaningDraft } from "@/lib/review/draftPlans";
import { foldForSearch } from "@/lib/review/inbox";
import { MEANING_DRAFT_TEXT, type MeaningItem } from "@/lib/review/normalise/drafts";
import { ShowConnections } from "../../context/ShowConnections";
import { Hero, PaneFrame } from "../../PaneFrame";
import { Ar, ContextCard, PaneCard, Say, StatusPill } from "../../parts";
import type { PaneProps } from "../types";
import { canDecideDraft, confidencePill, DraftBar } from "./DraftBar";

export function MeaningPane(props: PaneProps) {
  const item = props.item as MeaningItem;
  const d = item.data.draft;
  const { bank, roles, userId, now, decide } = props;
  const cache = useDraftCache(userId);
  const editable = canDecideDraft(props);
  const id = React.useId();
  const [gloss, setGloss] = React.useState(d.gloss_en);
  const suggestedId = defaultFamilyId(null, gloss, bank.familiesById) ?? "";
  const [familyId, setFamilyId] = React.useState<string | null>(null);
  const plan = planMeaningDraft(d, bank.familiesById, { gloss, familyId: familyId ?? suggestedId });
  const approve = plan.ok && item.state === "todo" ? () => decide(approveDraft(item, plan.ops, cache)) : null;
  const headwordId = d.word ? (d.word.reads_as_id ?? d.word.id) : null;
  const headword = headwordId ? (bank.wordsById.get(headwordId)?.arabic ?? (headwordId === d.word?.id ? d.word.arabic : headwordId)) : null;
  const familyHead = d.family?.headword_id ? bank.wordsById.get(d.family.headword_id)?.arabic : null;
  const spelledOtherwise = d.word && d.drafted_arabic && foldForSearch(d.drafted_arabic) !== foldForSearch(d.word.arabic);

  const main = (
    <>
      <Hero item={item} roles={roles} userId={userId} now={now} sub={`${MEANING_DRAFT_TEXT}. Approving writes it to the word.`}>
        {spelledOtherwise && (
          <Say tone="warn">
            Drafted for <Ar>{d.drafted_arabic}</Ar>; the word bank spells it <Ar>{d.word!.arabic}</Ar>.
          </Say>
        )}
        {!d.word && <Say tone="warn">This spelling is no longer in the word bank.</Say>}
      </Hero>
      <PaneCard title="Meaning">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
          <StatusPill pill={confidencePill(d.confidence, d.confidence_score)} />
          {d.part_of_speech && <span className="text-muted-foreground">{d.part_of_speech}</span>}
          <span className="text-xs text-muted-foreground">from {d.source}</span>
        </div>
        {editable ? (
          <div className="mt-3 space-y-1">
            <Label htmlFor={`${id}-gloss`}>English meaning</Label>
            <Input id={`${id}-gloss`} value={gloss} onChange={(e) => setGloss(e.target.value)} />
          </div>
        ) : (
          <p className="mt-2 text-[15px] font-semibold">&ldquo;{d.gloss_en}&rdquo;</p>
        )}
        {d.note && <p className="mt-2 text-xs text-muted-foreground">Note: {d.note}</p>}
        {d.family?.gloss_en?.trim() && !d.applied && (
          <Say tone="warn">
            The word says &ldquo;{d.family.gloss_en}&rdquo; now. Approving replaces it.
          </Say>
        )}
      </PaneCard>
      <PaneCard title="The word">
        {d.family ? (
          <p className="text-[12.5px]">
            Written to the word <span className="font-mono">{d.family.id}</span>
            {familyHead && (
              <>
                {" "}
                (<Ar>{familyHead}</Ar>)
              </>
            )}
            {d.word && d.word.family_id !== d.family.id ? ", the word of the spelling it is read as." : "."}
          </p>
        ) : d.word && !d.word.is_pseudo ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="col-span-full text-[12.5px]">
              This spelling is in no word yet. Approving starts one with {headword && <Ar>{headword}</Ar>} as its dictionary form and this meaning.
            </p>
            {editable && (
              <div className="space-y-1">
                <Label htmlFor={`${id}-slug`}>Id of the new word (never changes)</Label>
                <Input id={`${id}-slug`} value={familyId ?? suggestedId} onChange={(e) => setFamilyId(e.target.value)} />
              </div>
            )}
          </div>
        ) : (
          <p className="text-[12.5px] text-muted-foreground">{d.word ? "A practice word has no meaning or family." : "Nothing to write to."}</p>
        )}
      </PaneCard>
    </>
  );

  const context = (
    <ContextCard title="Connections">
      <ul className="grid gap-1.5">
        {d.word && (
          <li>
            <ShowConnections focus={`word:${d.word.id}`} label="Show connections of the spelling" />
          </li>
        )}
        {d.family && (
          <li>
            <ShowConnections focus={`family:${d.family.id}`} label={`Show the word ${d.family.id}`} />
          </li>
        )}
      </ul>
    </ContextCard>
  );

  const bar = <DraftBar props={props} item={item} approve={approve} blocked={plan.ok ? null : plan.reason} approveLabel="Approve" />;
  return <PaneFrame item={item} main={main} context={context} bar={bar} />;
}
