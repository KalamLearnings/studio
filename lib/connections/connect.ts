/**
 * CG-5, "+ Add" on the Words page: what each box offers, why a candidate is
 * refused (in plain words, before anything is sent), and the route calls
 * (`Op`s) a pick, a removal, a dictionary form, a practice-word mark or a
 * split makes. Pure. The backend repeats every check; a refusal it sends is
 * shown with the same sentences (`familyErrorText`).
 *
 * The rules follow the concept's `options()` / `readsAsIssue()` /
 * `joinIssue()` (design/concepts/content-graph/index.html) and the backend's
 * `core/domain/words/family.ts`.
 */

import { familyErrorText, needsReading, skeleton, vowelStatus } from "../words/family";
import type { Graph, WordNode } from "./graph";
import { asReadsRow, familyLabel } from "./graph";
import { idOfKey, nodeKey, typeOfKey, type NodeKey } from "./keys";
import type { MeaningGroup, SeveralMeanings } from "./meanings";
import type { Box } from "./neighbourhood";
import { planMoveIntoFamily, type Op, type SpellingLookup } from "./ops";

export type { Op };

/** One row of a picker. */
export interface Candidate {
  key: NodeKey;
  /** Why it cannot be picked; null when it can. */
  refusal: string | null;
  /** What picking it also does ("It leaves 'bear'."). */
  note?: string;
}

/** A plan: the calls, and the toast line. */
export interface Plan {
  ops: Op[];
  message: string;
}

export type Refusable = Plan | { refusal: string };
export const isRefusal = (p: Refusable): p is { refusal: string } => "refusal" in p;

const say = (code: string) => familyErrorText(code, code);

export const lookupOf = (g: Graph): SpellingLookup => (id) => {
  const w = g.words.get(id);
  return w ? { familyId: w.familyId, readsAsId: w.readsAsId } : undefined;
};

const quoted = (g: Graph, familyId: string) => `"${familyLabel(g.families.get(familyId), familyId)}"`;
const live = (w: WordNode) => !w.retired;
const byUse = (a: WordNode, b: WordNode) => b.usageCount - a.usageCount || a.id.localeCompare(b.id);

/** The spellings `w` is read as or read from: they must share its family. */
function partners(g: Graph, w: WordNode): WordNode[] {
  const out = g.readersOf(w.id).slice();
  if (w.readsAsId) {
    const t = g.words.get(w.readsAsId);
    if (t) out.push(t);
  }
  return out;
}

/** Why `w` may not join `familyId`, or null (the backend's `checkJoin` and `WORD_IS_HEADWORD`). */
export function joinIssue(g: Graph, w: WordNode, familyId: string): string | null {
  if (w.isPseudo) return say("WORD_IS_PSEUDO");
  if (w.retired) return say("WORD_RETIRED");
  if (w.familyId && w.familyId !== familyId && g.families.get(w.familyId)?.headwordId === w.id) return say("WORD_IS_HEADWORD");
  const apart = partners(g, w).find((p) => p.familyId && p.familyId !== familyId);
  if (apart) {
    return `It is read as (or read from) ${apart.arabic}, which is a form of ${quoted(g, apart.familyId!)}. A spelling and its reading must be forms of the same word.`;
  }
  return null;
}

/** Why `source` may not be read as `target`, or null (`readsAsIssue`, D5). */
export function readingIssue(g: Graph, source: WordNode, target: WordNode): string | null {
  if (source.id === target.id) return say("READS_AS_SELF");
  if (vowelStatus(source.arabic) === "full") return say("READS_AS_SOURCE_VOWELLED");
  if (vowelStatus(target.arabic) !== "full") return say("READS_AS_TARGET_NOT_VOWELLED");
  if (skeleton(source.arabic) !== skeleton(target.arabic)) return say("READS_AS_SKELETON_MISMATCH");
  if (target.readsAsId) return say("READS_AS_CHAIN");
  if (g.readersOf(source.id).length) return "Other spellings are read as this one, so it cannot be read as another.";
  if (target.retired) return say("READS_AS_TARGET_RETIRED");
  if (target.isPseudo) return say("READS_AS_TARGET_PSEUDO");
  if (source.familyId && target.familyId && source.familyId !== target.familyId) return say("READS_AS_FAMILY_MISMATCH");
  return null;
}

/** Refused first-class candidates go after the ones that can be picked. */
const ordered = (list: Candidate[]) => [...list.filter((c) => !c.refusal), ...list.filter((c) => c.refusal)];

/**
 * What "+ Add" on `box` offers, best first. Pictures are searched on the
 * server instead (`GET /assets`), so a box that takes pictures returns [].
 */
export function addCandidates(g: Graph, focus: NodeKey, box: Box): Candidate[] {
  if (!box.accepts) return [];
  const id = idOfKey(focus);
  const type = typeOfKey(focus);

  if (type === "word") {
    const w = g.words.get(id);
    if (!w) return [];
    if (box.kind === "forms") {
      return ordered(
        Array.from(g.families.values())
          .filter((f) => f.id !== w.familyId)
          .sort((a, b) => familyLabel(a).localeCompare(familyLabel(b)))
          .map((f) => ({
            key: nodeKey("family", f.id),
            refusal: joinIssue(g, w, f.id),
            note: w.familyId ? `It leaves ${quoted(g, w.familyId)}.` : undefined,
          })),
      );
    }
    if (box.kind === "readings") {
      const sk = skeleton(w.arabic);
      const same = Array.from(g.words.values()).filter((x) => x.id !== w.id && live(x) && skeleton(x.arabic) === sk).sort(byUse);
      if (needsReading(asReadsRow(w))) {
        // This spelling is read as a fully vowelled one.
        return ordered(
          same
            .filter((t) => t.id !== w.readsAsId && vowelStatus(t.arabic) === "full")
            .map((t) => ({
              key: nodeKey("word", t.id),
              refusal: readingIssue(g, w, t),
              note: w.readsAsId ? `It replaces the reading ${g.words.get(w.readsAsId)?.arabic ?? ""}.` : undefined,
            })),
        );
      }
      // A fully vowelled spelling: the spellings without full harakat that are read as it.
      return ordered(
        same
          .filter((s) => s.readsAsId !== w.id && !s.isPseudo && vowelStatus(s.arabic) !== "full")
          .map((s) => ({
            key: nodeKey("word", s.id),
            refusal: readingIssue(g, s, w),
            note: s.readsAsId ? `It is read as ${g.words.get(s.readsAsId)?.arabic ?? ""} now; this changes it.` : undefined,
          })),
      );
    }
    return [];
  }

  if (type === "family") {
    if (!g.families.has(id)) return [];
    if (box.kind === "meaning") {
      const linked = new Set(g.conceptsOfFamily(id).map((c) => c.slug));
      return Array.from(g.concepts.values())
        .filter((c) => !linked.has(c.slug))
        .sort((a, b) => a.name.en.localeCompare(b.name.en))
        .map((c) => ({ key: nodeKey("concept", c.slug), refusal: null }));
    }
    if (box.kind === "forms") {
      return ordered(
        Array.from(g.words.values())
          .filter((w) => live(w) && w.familyId !== id)
          .sort(byUse)
          .map((w) => ({
            key: nodeKey("word", w.id),
            refusal: joinIssue(g, w, id),
            note: w.familyId ? `It leaves ${quoted(g, w.familyId)}.` : undefined,
          })),
      );
    }
    return [];
  }

  if (type === "concept" && box.kind === "meaning") {
    if (!g.concepts.has(id)) return [];
    const linked = new Set(g.familiesOfConcept(id).map((f) => f.id));
    return Array.from(g.families.values())
      .filter((f) => !linked.has(f.id))
      .sort((a, b) => familyLabel(a).localeCompare(familyLabel(b)))
      .map((f) => ({ key: nodeKey("family", f.id), refusal: null }));
  }

  if (type === "picture" && box.accepts === "concept") {
    if (!g.pictures.has(id)) return [];
    const linked = new Set(g.conceptsOfPicture(id).map((c) => c.slug));
    return Array.from(g.concepts.values())
      .filter((c) => !linked.has(c.slug))
      .sort((a, b) => a.name.en.localeCompare(b.name.en))
      .map((c) => ({ key: nodeKey("concept", c.slug), refusal: null }));
  }

  return [];
}

/** The calls a pick from "+ Add" makes. Refused when the candidate is. */
export function planAdd(g: Graph, focus: NodeKey, box: Box, picked: NodeKey): Refusable {
  const c = addCandidates(g, focus, box).find((x) => x.key === picked);
  // Pictures come from the search, not the candidate list.
  const isPicture = typeOfKey(picked) === "picture";
  if (!c && !isPicture) return { refusal: "That cannot be connected here." };
  if (c?.refusal) return { refusal: c.refusal };
  const id = idOfKey(focus);
  const pid = idOfKey(picked);
  const type = typeOfKey(focus);

  if (type === "word" && box.kind === "forms") {
    const w = g.words.get(id)!;
    return { ops: [{ op: "setFamily", wordId: id, familyId: pid, prev: w.familyId }], message: `Now a form of ${quoted(g, pid)}:` };
  }
  if (type === "word" && box.kind === "readings") {
    const w = g.words.get(id)!;
    if (needsReading(asReadsRow(w))) {
      return { ops: [{ op: "setReadsAs", wordId: id, readsAsId: pid, prev: w.readsAsId }], message: "Reading set:" };
    }
    const s = g.words.get(pid)!;
    return { ops: [{ op: "setReadsAs", wordId: pid, readsAsId: id, prev: s.readsAsId }], message: `${s.arabic} now reads as` };
  }
  if (type === "family" && box.kind === "meaning") {
    return { ops: [{ op: "linkConcept", familyId: id, concept: pid }], message: `${quoted(g, id)} now names "${g.concepts.get(pid)?.name.en ?? pid}".` };
  }
  if (type === "family" && box.kind === "forms") {
    const w = g.words.get(pid)!;
    return { ops: [{ op: "setFamily", wordId: pid, familyId: id, prev: w.familyId }], message: `Now a form of ${quoted(g, id)}:` };
  }
  if (type === "concept" && box.kind === "meaning") {
    return { ops: [{ op: "linkConcept", familyId: pid, concept: id }], message: `${quoted(g, pid)} now names this meaning.` };
  }
  if (type === "concept" && box.accepts === "picture" && isPicture) {
    return { ops: [{ op: "attachPicture", concept: id, assetId: pid }], message: "Picture added to the meaning." };
  }
  if (type === "picture" && box.accepts === "concept") {
    return { ops: [{ op: "attachPicture", concept: pid, assetId: id }], message: `Now a picture of "${g.concepts.get(pid)?.name.en ?? pid}".` };
  }
  return { refusal: "That cannot be connected here." };
}

/**
 * Whether an item of `box` has a remove button: undefined for none, a plan,
 * or the reason it cannot go (the button is shown disabled with it).
 */
export function planRemove(g: Graph, focus: NodeKey, box: Box, item: NodeKey): Refusable | undefined {
  if (!box.editable) return undefined;
  const id = idOfKey(focus);
  const iid = idOfKey(item);
  const type = typeOfKey(focus);
  const itype = typeOfKey(item);

  if (type === "word" && box.kind === "forms" && itype === "family") {
    if (g.families.get(iid)?.headwordId === id) return { refusal: say("WORD_IS_HEADWORD") };
    return { ops: [{ op: "setFamily", wordId: id, familyId: null, prev: iid }], message: `No longer a form of ${quoted(g, iid)}:` };
  }
  if (type === "word" && box.kind === "readings" && itype === "word") {
    const w = g.words.get(id);
    const other = g.words.get(iid);
    if (!w || !other) return undefined;
    if (w.readsAsId === iid) return { ops: [{ op: "setReadsAs", wordId: id, readsAsId: null, prev: iid }], message: "Reading cleared:" };
    if (other.readsAsId === id) return { ops: [{ op: "setReadsAs", wordId: iid, readsAsId: null, prev: id }], message: "Reading cleared:" };
    return undefined;
  }
  if (type === "family" && box.kind === "meaning" && itype === "concept") {
    return { ops: [{ op: "unlinkConcept", familyId: id, concept: iid }], message: `No longer names "${g.concepts.get(iid)?.name.en ?? iid}".` };
  }
  if (type === "family" && box.kind === "forms" && itype === "word") {
    // Leaving is allowed for any form but the dictionary form: no family breaks no reading rule.
    if (g.families.get(id)?.headwordId === iid) return { refusal: say("WORD_IS_HEADWORD") };
    return { ops: [{ op: "setFamily", wordId: iid, familyId: null, prev: id }], message: `No longer a form of ${quoted(g, id)}:` };
  }
  if (type === "concept" && box.kind === "meaning" && itype === "family") {
    return { ops: [{ op: "unlinkConcept", familyId: iid, concept: id }], message: `${quoted(g, iid)} no longer names this meaning.` };
  }
  if (type === "concept" && box.kind === "pictures" && itype === "picture") {
    return { ops: [{ op: "detachPicture", concept: id, assetId: iid }], message: "Picture removed from the meaning." };
  }
  if (type === "picture" && box.accepts === "concept" && itype === "concept") {
    return { ops: [{ op: "detachPicture", concept: iid, assetId: id }], message: `No longer a picture of "${g.concepts.get(iid)?.name.en ?? iid}".` };
  }
  return undefined;
}

/** "Make dictionary form" on a form of a family in focus: undefined when it already is, or is not a form. */
export function planHeadword(g: Graph, focus: NodeKey, box: Box, item: NodeKey): Plan | undefined {
  if (typeOfKey(focus) !== "family" || box.kind !== "forms" || !box.editable || typeOfKey(item) !== "word") return undefined;
  const f = g.families.get(idOfKey(focus));
  const w = g.words.get(idOfKey(item));
  if (!f || !w || f.headwordId === w.id || w.familyId !== f.id) return undefined;
  return { ops: [{ op: "setHeadword", familyId: f.id, headwordId: w.id, prev: f.headwordId }], message: "Dictionary form now:" };
}

/** "Mark as practice word" (B-7) and back. Null for a retired spelling. */
export function planPseudo(g: Graph, wordId: string): Refusable | null {
  const w = g.words.get(wordId);
  if (!w || w.retired) return null;
  if (w.isPseudo) {
    return { ops: [{ op: "setPseudo", wordId, isPseudo: false, prev: true }], message: "No longer a practice word:" };
  }
  if (w.familyId) return { refusal: say("WORD_IN_FAMILY") };
  if (w.readsAsId || g.readersOf(w.id).length) return { refusal: say("WORD_HAS_READING") };
  return { ops: [{ op: "setPseudo", wordId, isPseudo: true, prev: false }], message: "Marked as a practice word:" };
}

/** A new family's id and gloss, from the dialog. */
export interface NewFamily {
  id: string;
  gloss: string | null;
}

/** "Start a family" for a spelling with none: it is the dictionary form; its readings with no family come too. */
export function planStartFamily(g: Graph, wordId: string, fam: NewFamily): Refusable {
  const w = g.words.get(wordId);
  if (!w) return { refusal: say("WORD_NOT_FOUND") };
  if (g.families.has(fam.id)) return { refusal: say("WORD_FAMILY_EXISTS") };
  if (w.familyId) return { refusal: say("WORD_IN_OTHER_FAMILY") };
  const issue = joinIssue(g, w, fam.id);
  if (issue) return { refusal: issue };
  const along = partners(g, w).filter((p) => !p.familyId && !p.isPseudo && !p.retired).map((p) => p.id);
  return {
    ops: planMoveIntoFamily(lookupOf(g), { familyId: fam.id, create: { gloss: fam.gloss }, headwordId: w.id, wordIds: along }),
    message: `New word "${fam.gloss || fam.id}" started with`,
  };
}

/**
 * Owner decision 5, the split: the words of one meaning group get their own
 * family. Offered for a group with no family, and for a group that shares a
 * family with another meaning but does not hold that family's dictionary
 * form (that group stays). The group's readings move with it.
 */
export function splitOffer(g: Graph, m: SeveralMeanings, group: MeaningGroup): "start" | "move" | null {
  if (!m.needsSplit || group.words.length === 0) return null;
  if (group.familyIds.length === 0) return "start";
  const shared = group.familyIds.some((f) => m.meanings.some((o) => o !== group && o.familyIds.includes(f)));
  if (!shared) return null;
  const holdsHead = group.words.some((w) => w.familyId && g.families.get(w.familyId)?.headwordId === w.id);
  return holdsHead ? null : "move";
}

export function planSplit(g: Graph, group: MeaningGroup, fam: NewFamily): Refusable {
  if (g.families.has(fam.id)) return { refusal: say("WORD_FAMILY_EXISTS") };
  const head = group.words[0];
  if (!head) return { refusal: "Nothing to split." };
  if (head.familyId && g.families.get(head.familyId)?.headwordId === head.id) return { refusal: say("WORD_IS_HEADWORD") };
  const ids = new Set(group.words.map((w) => w.id));
  for (const w of group.words) for (const r of g.readersOf(w.id)) ids.add(r.id);
  for (const id of Array.from(ids)) {
    const w = g.words.get(id)!;
    if (w.isPseudo || w.retired) ids.delete(id);
    else if (w.id !== head.id && w.familyId && g.families.get(w.familyId)?.headwordId === w.id) return { refusal: say("WORD_IS_HEADWORD") };
  }
  return {
    ops: planMoveIntoFamily(lookupOf(g), { familyId: fam.id, create: { gloss: fam.gloss }, headwordId: head.id, wordIds: Array.from(ids) }),
    message: `Split into its own word "${fam.gloss || fam.id}":`,
  };
}
