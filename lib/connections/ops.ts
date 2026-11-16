/**
 * Connection writes as plain operations (CG-5, and Review's Suggested links).
 * Pure, except `runOps`, which sends them through an injected API.
 *
 * Every write the Words page and Review make is a list of `Op`s, one route
 * call each. `inverseOps` gives the calls that undo them (Undo in the toast),
 * and `runOps` sends them one at a time, undoing the ones already sent when a
 * later one is refused, so a refused plan leaves the library as it was.
 *
 * The backend decides every rule; these only order the calls so its rules
 * hold between them. The one ordering rule: a spelling and the spellings it
 * is read as or read from may not sit in two different families (only one,
 * or none, `READS_AS_FAMILY_MISMATCH`). So a move takes every moving row out
 * of its old family first (no family breaks no rule), then puts them in the
 * new one, the rows others are read as before the rows read as them.
 */

import type { ConceptKind, ConceptName } from "../types/wordFamilies";

export type Op =
  | { op: "setFamily"; wordId: string; familyId: string | null; prev: string | null }
  | { op: "setReadsAs"; wordId: string; readsAsId: string | null; prev: string | null }
  | { op: "setHeadword"; familyId: string; headwordId: string | null; prev: string | null }
  /** A family's English meaning (Review's Draft meanings); `prev` is what it said before. */
  | { op: "setGloss"; familyId: string; gloss: string | null; prev: string | null }
  /** The headword joins the family in the same call (the backend does that). */
  | { op: "createFamily"; familyId: string; gloss: string | null; headwordId: string | null }
  | { op: "linkConcept"; familyId: string; concept: string }
  | { op: "unlinkConcept"; familyId: string; concept: string }
  | { op: "attachPicture"; concept: string; assetId: string }
  | { op: "detachPicture"; concept: string; assetId: string }
  | { op: "setPseudo"; wordId: string; isPseudo: boolean; prev: boolean }
  /** Plain staff may create a meaning; nothing deletes one, so it has no inverse. */
  | { op: "createConcept"; slug: string; name: ConceptName; kind: ConceptKind | null };

/** The calls that undo one op. A created family stays (nothing is deleted), without its headword. */
export function inverseOf(o: Op): Op[] {
  switch (o.op) {
    case "setFamily":
      return [{ ...o, familyId: o.prev, prev: o.familyId }];
    case "setReadsAs":
      return [{ ...o, readsAsId: o.prev, prev: o.readsAsId }];
    case "setHeadword":
      return [{ ...o, headwordId: o.prev, prev: o.headwordId }];
    case "setGloss":
      return [{ ...o, gloss: o.prev, prev: o.gloss }];
    case "setPseudo":
      return [{ ...o, isPseudo: o.prev, prev: o.isPseudo }];
    case "createFamily":
      return o.headwordId
        ? [
            { op: "setHeadword", familyId: o.familyId, headwordId: null, prev: o.headwordId },
            { op: "setFamily", wordId: o.headwordId, familyId: null, prev: o.familyId },
          ]
        : [];
    case "linkConcept":
      return [{ op: "unlinkConcept", familyId: o.familyId, concept: o.concept }];
    case "unlinkConcept":
      return [{ op: "linkConcept", familyId: o.familyId, concept: o.concept }];
    case "attachPicture":
      return [{ op: "detachPicture", concept: o.concept, assetId: o.assetId }];
    case "detachPicture":
      return [{ op: "attachPicture", concept: o.concept, assetId: o.assetId }];
    case "createConcept":
      return [];
  }
}

/** The calls that undo `ops`, last first. */
export const inverseOps = (ops: readonly Op[]): Op[] => [...ops].reverse().flatMap(inverseOf);

/**
 * The calls that make `ops` again after their inverse was sent: a family or
 * meaning created the first time still exists, so it is joined, not created
 * (setting the headword puts it back in the family).
 */
export const redoOps = (ops: readonly Op[]): Op[] =>
  ops.flatMap((o): Op[] =>
    o.op === "createFamily"
      ? o.headwordId
        ? [{ op: "setHeadword", familyId: o.familyId, headwordId: o.headwordId, prev: null }]
        : []
      : o.op === "createConcept"
        ? []
        : [o],
  );

/** True when undoing leaves nothing behind (no family or meaning was created). */
export const fullyUndoable = (ops: readonly Op[]): boolean =>
  !ops.some((o) => o.op === "createFamily" || o.op === "createConcept");

// ---- planning ---------------------------------------------------------------------------

/** What the planner needs to know about a spelling. */
export interface SpellingState {
  familyId: string | null;
  readsAsId: string | null;
}

export type SpellingLookup = (wordId: string) => SpellingState | undefined;

export interface MoveIntoFamily {
  familyId: string;
  /** Create the family first (with `headwordId` as its dictionary form). */
  create?: { gloss: string | null } | null;
  /** The dictionary form: joins with the create, or is set after the move when the family has none. */
  headwordId?: string | null;
  /** The family's dictionary form today (an existing family); null when it has none. */
  currentHeadwordId?: string | null;
  /** The spellings to put in the family. Rows already in it are left alone. */
  wordIds: readonly string[];
  /** Readings to set once the rows are in (`reads_as` proposals). */
  readings?: ReadonlyArray<{ wordId: string; readsAsId: string }>;
}

/**
 * The ops that put `wordIds` (and the headword) in one family: out of their
 * old families first, then in, rows others are read as before their readers,
 * then the dictionary form and the readings.
 */
export function planMoveIntoFamily(words: SpellingLookup, m: MoveIntoFamily): Op[] {
  const ids = Array.from(new Set([...(m.headwordId ? [m.headwordId] : []), ...m.wordIds]));
  const movers = ids.filter((id) => (words(id)?.familyId ?? null) !== m.familyId);
  const ops: Op[] = [];
  for (const id of movers) {
    const prev = words(id)?.familyId ?? null;
    if (prev !== null) ops.push({ op: "setFamily", wordId: id, familyId: null, prev });
  }
  const joinsWithCreate = m.create && m.headwordId ? m.headwordId : null;
  if (m.create) ops.push({ op: "createFamily", familyId: m.familyId, gloss: m.create.gloss, headwordId: m.headwordId ?? null });
  const rest = movers.filter((id) => id !== joinsWithCreate);
  // Rows read as another go last: their reading is in by then (or has no family).
  rest.sort((a, b) => Number(!!words(a)?.readsAsId) - Number(!!words(b)?.readsAsId));
  for (const id of rest) ops.push({ op: "setFamily", wordId: id, familyId: m.familyId, prev: null });
  if (!m.create && m.headwordId && !m.currentHeadwordId) {
    ops.push({ op: "setHeadword", familyId: m.familyId, headwordId: m.headwordId, prev: null });
  }
  for (const r of m.readings ?? []) {
    const prev = words(r.wordId)?.readsAsId ?? null;
    if (prev !== r.readsAsId) ops.push({ op: "setReadsAs", wordId: r.wordId, readsAsId: r.readsAsId, prev });
  }
  return ops;
}

// ---- running ----------------------------------------------------------------------------

/** The routes the ops call (`lib/api/wordFamilies.ts`, `lib/api/concepts.ts`); injected for tests and previews. */
export interface ConnectApi {
  setWordFamily(wordId: string, familyId: string | null): Promise<unknown>;
  setWordReadsAs(wordId: string, readsAsId: string | null): Promise<unknown>;
  updateWordFamily(id: string, body: { headwordId?: string | null; glossEn?: string | null }): Promise<unknown>;
  createWordFamily(body: { id: string; glossEn?: string | null; headwordId?: string | null }): Promise<unknown>;
  linkFamilyToConcept(familyId: string, concept: string): Promise<unknown>;
  unlinkFamilyFromConcept(familyId: string, concept: string): Promise<unknown>;
  attachConceptPicture(concept: string, assetId: string): Promise<unknown>;
  detachConceptPicture(concept: string, assetId: string): Promise<unknown>;
  setWordPseudo(wordId: string, isPseudo: boolean): Promise<unknown>;
  createConcept(body: { slug: string; name: ConceptName; kind?: ConceptKind | null }): Promise<unknown>;
}

export function sendOp(api: ConnectApi, o: Op): Promise<unknown> {
  switch (o.op) {
    case "setFamily":
      return api.setWordFamily(o.wordId, o.familyId);
    case "setReadsAs":
      return api.setWordReadsAs(o.wordId, o.readsAsId);
    case "setHeadword":
      return api.updateWordFamily(o.familyId, { headwordId: o.headwordId });
    case "setGloss":
      return api.updateWordFamily(o.familyId, { glossEn: o.gloss });
    case "createFamily":
      return api.createWordFamily({ id: o.familyId, glossEn: o.gloss, headwordId: o.headwordId });
    case "linkConcept":
      return api.linkFamilyToConcept(o.familyId, o.concept);
    case "unlinkConcept":
      return api.unlinkFamilyFromConcept(o.familyId, o.concept);
    case "attachPicture":
      return api.attachConceptPicture(o.concept, o.assetId);
    case "detachPicture":
      return api.detachConceptPicture(o.concept, o.assetId);
    case "setPseudo":
      return api.setWordPseudo(o.wordId, o.isPseudo);
    case "createConcept":
      return api.createConcept({ slug: o.slug, name: o.name, kind: o.kind });
  }
}

/** A refused plan: the refusal, and whether the calls already sent were undone. */
export class OpsError extends Error {
  readonly cause: unknown;
  readonly failed: Op;
  readonly rolledBack: boolean;
  constructor(cause: unknown, failed: Op, rolledBack: boolean) {
    super(cause instanceof Error ? cause.message : "The request failed.");
    this.name = "OpsError";
    this.cause = cause;
    this.failed = failed;
    this.rolledBack = rolledBack;
  }
}

/**
 * Sends `ops` in order. When one is refused, undoes the ones already sent
 * (last first) and throws an `OpsError` carrying the refusal.
 */
export async function runOps(api: ConnectApi, ops: readonly Op[]): Promise<void> {
  for (let i = 0; i < ops.length; i++) {
    try {
      await sendOp(api, ops[i]);
    } catch (e) {
      let rolledBack = true;
      for (const back of inverseOps(ops.slice(0, i))) {
        try {
          await sendOp(api, back);
        } catch {
          rolledBack = false;
        }
      }
      throw new OpsError(e, ops[i], rolledBack);
    }
  }
}

/** The refusal behind an error (an `OpsError` wraps the route's own). */
export const refusalOf = (e: unknown): unknown => (e instanceof OpsError ? e.cause : e);
