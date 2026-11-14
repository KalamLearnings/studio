/**
 * Curriculum-order check for an activity's `ending` (TECH-DESIGN 1.5).
 *
 * Recommended order: the pausal form until the tanween lesson, the full form
 * from it on. Studio warns, it does not block: the owner may teach in another
 * order.
 *
 * The tanween lesson is found by its title (English "tanween" / "tanwin" /
 * "nunation", or Arabic "تنوين"). ASSUMPTION: topics carry no explicit
 * "tanween lesson" marker today; if one is added, use it here.
 */

import type { BlendEnding } from "./config";

export interface OrderedTopic {
  id: string;
  sequence_number: number;
  title?: { en?: string; ar?: string } | null;
}

const TANWEEN_TITLE_RE = /tanw[ie]e?n|nunation|تنوين/i;

/** The first topic, in curriculum order, that teaches tanween. */
export function findTanweenTopic(topics: readonly OrderedTopic[]): OrderedTopic | null {
  const sorted = [...topics].sort((a, b) => a.sequence_number - b.sequence_number);
  return (
    sorted.find((t) => TANWEEN_TITLE_RE.test(`${t.title?.en ?? ""} ${t.title?.ar ?? ""}`)) ?? null
  );
}

/**
 * A plain-words warning when the ending does not fit the curriculum order, or
 * null. Nothing is said when the topic's place is unknown.
 */
export function getEndingOrderWarning(input: {
  ending: BlendEnding;
  /** The topic the activity is in. */
  topic: { id: string; sequence_number?: number } | null | undefined;
  /** All topics of the curriculum. */
  topics: readonly OrderedTopic[] | null | undefined;
  /** The word's full form has tanween. */
  wordHasTanween: boolean;
}): string | null {
  const { ending, topic, topics, wordHasTanween } = input;
  if (!topic || !topics || topics.length === 0) return null;
  const current = topics.find((t) => t.id === topic.id);
  const seq = current?.sequence_number ?? topic.sequence_number;
  if (seq === undefined) return null;

  const tanween = findTanweenTopic(topics);
  if (!tanween) {
    return ending === "full"
      ? "This curriculum has no tanween lesson yet. Children usually read the pausal form until they learn tanween."
      : null;
  }
  const name = tanween.title?.en || tanween.title?.ar || "the tanween lesson";
  if (seq < tanween.sequence_number && ending === "full") {
    return `This activity comes before the tanween lesson ("${name}", topic ${tanween.sequence_number}). Children usually read the pausal form until then.`;
  }
  if (seq >= tanween.sequence_number && ending === "pausal" && wordHasTanween) {
    return `This activity comes after the tanween lesson ("${name}", topic ${tanween.sequence_number}) and the word has tanween. The full ending is usually used from that lesson on.`;
  }
  return null;
}
