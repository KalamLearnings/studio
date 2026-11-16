/**
 * The plain words of the Words page (owner decision 2, 2026-11-16): what each
 * kind of item is called, and what each kind of connection means, in one
 * sentence each (the concept's legend). Pure data.
 */

import type { NodeType } from "./keys";

export interface NodeKindMeta {
  /** What one item of this kind is called. */
  name: string;
  /** The heading of a search group. */
  plural: string;
}

/** Items. A word family is "the word"; a concept is "a meaning". */
export const NODE_KINDS: Record<NodeType, NodeKindMeta> = {
  word: { name: "Spelling", plural: "Spellings" },
  family: { name: "Word", plural: "Words" },
  concept: { name: "Meaning", plural: "Meanings" },
  picture: { name: "Picture", plural: "Pictures" },
  letter: { name: "Letter", plural: "Letters" },
  activity: { name: "Lesson activity", plural: "Lesson activities" },
};

/** Kinds of connection. `editable` ones are made by hand (CG-5); the others are worked out elsewhere. */
export const CONNECTION_KINDS = {
  forms: {
    name: "Forms of the word",
    editable: true,
    explain: "Exact ways of writing the same word. A spelling belongs to one family only.",
  },
  readings: {
    name: "Other readings",
    editable: true,
    explain: "A spelling without full harakat is read like this fully vowelled spelling, and plays its recording.",
  },
  meaning: {
    name: "Meaning",
    editable: true,
    explain: "This word names this thing. Every spelling in the family shows the thing's pictures.",
  },
  pictures: { name: "Pictures", editable: true, explain: "This picture shows this thing." },
  ownPicture: {
    name: "Own picture",
    editable: true,
    explain: "A picture kept on the family itself (for a meaning no concept covers).",
  },
  letters: {
    name: "Letters",
    editable: false,
    explain: "Worked out from the spelling. To change them, change the spelling.",
  },
  usedIn: {
    name: "Used in lessons",
    editable: false,
    explain: "Worked out from each activity's settings. Change it in the lesson builder.",
  },
} as const;

export type ConnectionKind = keyof typeof CONNECTION_KINDS;

/** Why a box is worked out here rather than drawn: the sentence under its heading. */
export const THROUGH_FAMILY = "Comes from the family. Connect the family, not the single spelling.";
export const THROUGH_MEANING = "Comes from the meaning. Connect the picture to the meaning.";
export const THROUGH_WORDS = "Comes from the words with this meaning.";

/** Owner decision 3: who may make connections, and what everyone else is told. */
export const READ_ONLY_REASON =
  "Read only. Only a curriculum lead or a phrase reviewer can make connections.";

/** Owner decision 4. Kept for the connect dialog (CG-5) so the refusal reads the same everywhere. */
export const NO_MEANING_LINKS = "Meanings are not linked to each other.";
