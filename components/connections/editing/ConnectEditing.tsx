"use client";

/**
 * CG-5: connecting on the Words page. Fills the frame's extension points
 * (`../extension.ts`) with "+ Add" and its typed picker, remove and "make
 * dictionary form" on chips, "Start a family", "Mark as practice word" and
 * the split of one spelling's meanings. Every change is sent through
 * `useConnectRun` (Undo in the toast). Mounted only for a curriculum lead or
 * a phrase reviewer (owner decision 3).
 */

import * as React from "react";
import { Plus, Split, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  addCandidates,
  isRefusal,
  planAdd,
  planHeadword,
  planPseudo,
  planRemove,
  planSplit,
  planStartFamily,
  splitOffer,
  type Candidate,
  type Refusable,
} from "@/lib/connections/connect";
import { familyLabel, type Graph } from "@/lib/connections/graph";
import { NODE_KINDS } from "@/lib/connections/kinds";
import { idOfKey, typeOfKey, type NodeKey } from "@/lib/connections/keys";
import type { MeaningGroup } from "@/lib/connections/meanings";
import type { Box } from "@/lib/connections/neighbourhood";
import { fullyUndoable, type Op } from "@/lib/connections/ops";
import { EditingContext, type ConnectionsEditing } from "../extension";
import { labelOf } from "../parts";
import { NameDialog } from "./NameDialog";
import { PictureSearch } from "./PictureSearch";
import { Picker } from "./Picker";
import { useConnectRun, type RunPlan } from "./useConnectRun";

type DialogState =
  | { type: "pick"; box: Box; focus: NodeKey }
  | { type: "pictures"; box: Box; focus: NodeKey }
  | { type: "newMeaning"; box: Box; focus: NodeKey }
  | { type: "startFamily"; wordId: string }
  | { type: "split"; group: MeaningGroup };

const KEPT = "Created words and meanings stay (nothing is deleted).";

/** The Arabic a toast is about: the spelling in focus, or the spelling picked. */
function arabicOf(g: Graph, ...keys: NodeKey[]): string | undefined {
  for (const k of keys) {
    if (typeOfKey(k) === "word") return g.words.get(idOfKey(k))?.arabic;
    if (typeOfKey(k) === "family") {
      const f = g.families.get(idOfKey(k));
      const head = f?.headwordId ? g.words.get(f.headwordId) : undefined;
      if (head) return head.arabic;
    }
  }
  return undefined;
}

const pickTitle = (g: Graph, box: Box, focus: NodeKey) => {
  const L = labelOf(g, focus);
  const what = [L.ar, L.en].filter(Boolean).join(" ");
  return `${box.title}: add to ${NODE_KINDS[typeOfKey(focus)].name.toLowerCase()} ${what}`;
};

function RefusedButton({ label, reason, children }: { label: string; reason: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-label={`${label}. Not possible: ${reason}`}
      title={reason}
      onClick={() => toast(reason, { id: "connect-refusal" })}
      className="ms-0.5 inline-grid h-6 w-6 shrink-0 cursor-not-allowed place-items-center self-center rounded text-muted-foreground/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
    >
      {children}
    </button>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="ms-0.5 inline-grid h-6 w-6 shrink-0 place-items-center self-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function ConnectEditing({ graph, children }: { graph: Graph; children: React.ReactNode }) {
  const { run, busy } = useConnectRun();
  const [dialog, setDialog] = React.useState<DialogState | null>(null);
  const close = () => setDialog(null);

  const send = React.useCallback(
    async (p: Refusable, arabic?: string) => {
      if (isRefusal(p)) {
        toast.error(p.refusal);
        return false;
      }
      const plan: RunPlan = { ops: p.ops, message: p.message, arabic, undoNote: fullyUndoable(p.ops) ? undefined : KEPT };
      return run(plan);
    },
    [run],
  );

  const editing = React.useMemo<ConnectionsEditing>(() => {
    const g = graph;
    return {
      headerExtra: (box, focus) => {
        if (!box.accepts || box.kind === "ownPicture") return null;
        const pictures = box.accepts === "picture";
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-0.5 px-1.5 text-xs"
            disabled={busy}
            onClick={() => setDialog({ type: pictures ? "pictures" : "pick", box, focus })}
            aria-label={`Add to ${box.title}`}
            data-testid={`add-${box.id}`}
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" /> Add
          </Button>
        );
      },
      itemExtra: (box, item, focus) => {
        const remove = planRemove(g, focus, box, item.key);
        const head = planHeadword(g, focus, box, item.key);
        const name = [labelOf(g, item.key).ar, labelOf(g, item.key).en].filter(Boolean).join(" ");
        if (!remove && !head) return null;
        return (
          <>
            {head && (
              <IconButton label={`Make ${name} the dictionary form`} disabled={busy} onClick={() => void send(head, arabicOf(g, item.key))}>
                <Star aria-hidden="true" className="h-3.5 w-3.5" />
              </IconButton>
            )}
            {remove &&
              (isRefusal(remove) ? (
                <RefusedButton label={`Remove ${name}`} reason={remove.refusal}>
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </RefusedButton>
              ) : (
                <IconButton label={`Remove ${name}`} disabled={busy} onClick={() => void send(remove, arabicOf(g, focus, item.key))}>
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </IconButton>
              ))}
          </>
        );
      },
      emptyExtra: (box, focus) => {
        if (typeOfKey(focus) !== "word" || box.kind !== "forms") return null;
        const w = g.words.get(idOfKey(focus));
        if (!w || w.familyId || w.isPseudo || w.retired) return null;
        return (
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs" disabled={busy} onClick={() => setDialog({ type: "startFamily", wordId: w.id })}>
            Start a family
          </Button>
        );
      },
      focusExtra: (focus) => {
        if (typeOfKey(focus) !== "word") return null;
        const p = planPseudo(g, idOfKey(focus));
        if (!p) return null;
        const w = g.words.get(idOfKey(focus))!;
        const label = w.isPseudo ? "Not a practice word" : "Mark as practice word";
        return isRefusal(p) ? (
          <div className="mt-2 text-xs text-muted-foreground">
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" aria-disabled="true" aria-describedby="pseudo-why" onClick={() => toast(p.refusal, { id: "connect-refusal" })}>
              {label}
            </Button>
            <p id="pseudo-why" className="mt-1">
              {p.refusal}
            </p>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="mt-2 h-7 px-2.5 text-xs" disabled={busy} onClick={() => void send(p, w.arabic)}>
            {label}
          </Button>
        );
      },
      splitExtra: (m, group) => {
        const offer = splitOffer(g, m, group);
        if (!offer) return null;
        return (
          <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-xs" disabled={busy} onClick={() => setDialog({ type: "split", group })}>
            <Split aria-hidden="true" className="h-3.5 w-3.5" />
            {offer === "start" ? "Start its own family" : "Move to its own family"}
          </Button>
        );
      },
    };
  }, [graph, busy, send]);

  // ---- dialogs ----------------------------------------------------------------------------
  const g = graph;
  let candidates: Candidate[] = [];
  if (dialog?.type === "pick") candidates = addCandidates(g, dialog.focus, dialog.box);

  const pickFooter =
    dialog?.type === "pick" && dialog.box.accepts === "concept" ? (
      <Button variant="outline" size="sm" onClick={() => setDialog({ ...dialog, type: "newMeaning" })}>
        <Plus aria-hidden="true" className="me-1 h-3.5 w-3.5" /> Create a new meaning
      </Button>
    ) : dialog?.type === "pick" && dialog.box.accepts === "family" && typeOfKey(dialog.focus) === "word" && !g.words.get(idOfKey(dialog.focus))?.familyId ? (
      <Button variant="outline" size="sm" onClick={() => setDialog({ type: "startFamily", wordId: idOfKey(dialog.focus) })}>
        <Plus aria-hidden="true" className="me-1 h-3.5 w-3.5" /> Start a new family for it
      </Button>
    ) : null;

  const onNewMeaning = async (slug: string, english: string) => {
    if (dialog?.type !== "newMeaning") return;
    const create: Op = { op: "createConcept", slug, name: { en: english }, kind: null };
    const id = idOfKey(dialog.focus);
    const link: Op | null =
      typeOfKey(dialog.focus) === "family"
        ? { op: "linkConcept", familyId: id, concept: slug }
        : typeOfKey(dialog.focus) === "picture"
          ? { op: "attachPicture", concept: slug, assetId: id }
          : null;
    if (!link) return;
    const ok = await send({ ops: [create, link], message: `New meaning "${english}" connected.` }, arabicOf(g, dialog.focus));
    if (ok) close();
  };

  const wordForStart = dialog?.type === "startFamily" ? g.words.get(dialog.wordId) : undefined;
  const groupHead = dialog?.type === "split" ? dialog.group.words[0] : undefined;

  return (
    <EditingContext.Provider value={editing}>
      {children}
      <Picker
        open={dialog?.type === "pick"}
        onOpenChange={(o) => !o && close()}
        title={dialog?.type === "pick" ? pickTitle(g, dialog.box, dialog.focus) : ""}
        description={dialog?.type === "pick" ? dialog.box.explain : ""}
        graph={g}
        candidates={candidates}
        busy={busy}
        footer={pickFooter}
        onPick={async (c) => {
          if (dialog?.type !== "pick") return;
          const ok = await send(planAdd(g, dialog.focus, dialog.box, c.key), arabicOf(g, dialog.focus, c.key));
          if (ok) close();
        }}
      />
      <PictureSearch
        open={dialog?.type === "pictures"}
        onOpenChange={(o) => !o && close()}
        title={dialog?.type === "pictures" ? `Add a picture of "${g.concepts.get(idOfKey(dialog.focus))?.name.en ?? ""}"` : ""}
        excludeIds={dialog?.type === "pictures" ? g.picturesOfConcept(idOfKey(dialog.focus)).map((p) => p.assetId) : []}
        busy={busy}
        onPick={async (a) => {
          if (dialog?.type !== "pictures") return;
          const ok = await send(planAdd(g, dialog.focus, dialog.box, `picture:${a.id}`));
          if (ok) close();
        }}
      />
      <NameDialog
        open={dialog?.type === "newMeaning"}
        onOpenChange={(o) => !o && close()}
        title="New meaning"
        description="A meaning is the thing a word names (a book, the moon). Its pictures show on every spelling of the words that name it."
        englishLabel="English name"
        taken={(id) => g.concepts.has(id)}
        busy={busy}
        submitLabel="Create and connect"
        onSubmit={(r) => void onNewMeaning(r.id, r.english)}
      />
      <NameDialog
        open={dialog?.type === "startFamily"}
        onOpenChange={(o) => !o && close()}
        title="Start a family"
        description={
          <>
            A family groups the exact spellings of one word. This spelling becomes its dictionary form
            {wordForStart && g.readersOf(wordForStart.id).length + (wordForStart.readsAsId ? 1 : 0) > 0 ? ", and its readings join it" : ""}.
          </>
        }
        englishLabel="English meaning (gloss)"
        initialEnglish={wordForStart?.english ?? ""}
        taken={(id) => g.families.has(id)}
        busy={busy}
        onSubmit={async (r) => {
          if (dialog?.type !== "startFamily") return;
          const ok = await send(planStartFamily(g, dialog.wordId, { id: r.id, gloss: r.english }), wordForStart?.arabic);
          if (ok) close();
        }}
      />
      <NameDialog
        open={dialog?.type === "split"}
        onOpenChange={(o) => !o && close()}
        title="Give this word its own family"
        description={
          <>
            {groupHead ? `${groupHead.arabic} ` : ""}and the spellings read as it move into a new family
            {groupHead?.familyId ? `, out of "${familyLabel(g.families.get(groupHead.familyId), groupHead.familyId)}"` : ""}. It becomes the dictionary form.
          </>
        }
        englishLabel="English meaning (gloss)"
        initialEnglish={groupHead?.english ?? ""}
        taken={(id) => g.families.has(id)}
        busy={busy}
        submitLabel="Split"
        onSubmit={async (r) => {
          if (dialog?.type !== "split") return;
          const ok = await send(planSplit(g, dialog.group, { id: r.id, gloss: r.english }), groupHead?.arabic);
          if (ok) close();
        }}
      />
    </EditingContext.Provider>
  );
}
