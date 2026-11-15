/**
 * The `contrast` of a distractor in Studio (content model CM-S3; design 3.2,
 * section 5, decision R10). Pure, no React.
 *
 * `contrast` says what a distractor differs from its target by. The server
 * derives it from the two references on every save (`deriveContrast`, in the
 * content index); the author picks it only for a distractor the server cannot
 * derive one for. The picked value is stored on the distractor reference
 * (`distractorLetters[i].contrast`), which is where the server's
 * `contrast_required` check reads it.
 *
 * The rule here is the server's (`contrastOf` in the backend's
 * `content-index/extract.ts`): against the target of the same letter when
 * there is one, else the first target that gives a contrast.
 */

import {
  activitySkills,
  CONTRAST_IDS,
  CONTRAST_META,
  deriveContrast,
  isContrastId,
  type ContrastId,
  type ContrastRef,
} from "@kalam/curriculum-schemas";
import { getActivityConfigSchema, type ActivityType } from "@kalam/curriculum-schemas/server";

export { CONTRAST_IDS, CONTRAST_META, isContrastId, type ContrastId };

/** The contrast the server derives for this distractor, or null when the author must pick one. */
export function serverContrast(
  targets: readonly ContrastRef[],
  distractor: ContrastRef,
): ContrastId | null {
  if (targets.length === 0) return null;
  const same = targets.find((t) => t.letterId === distractor.letterId);
  if (same) return deriveContrast(same, distractor);
  for (const t of targets) {
    const c = deriveContrast(t, distractor);
    if (c) return c;
  }
  return null;
}

/** The type's graded flag: only a graded activity needs a contrast on each distractor. */
export function isGradedType(type: string): boolean {
  return activitySkills(type)?.evidence === "graded";
}

const probeCache = new Map<string, boolean>();

/**
 * Whether the server's write schema for this type stores a picked `contrast`
 * on a distractor letter. Probed on the synced write schema itself, so the
 * picker appears by itself once the backend accepts the field, and never
 * before (a save the server would refuse once the type is enforced).
 */
export function writeSchemaStoresContrast(type: string): boolean {
  const cached = probeCache.get(type);
  if (cached !== undefined) return cached;
  let ok = false;
  try {
    const schema = getActivityConfigSchema(type as ActivityType);
    ok = !!schema && schema.safeParse({
      targetLetter: { letterId: "ba", form: "isolated" },
      distractorLetters: [{ letterId: "meem", form: "isolated", haraka: "fatha", contrast: "shape" }],
    }).success;
  } catch {
    ok = false;
  }
  probeCache.set(type, ok);
  return ok;
}

/** Whether the distractor contrast picker applies to this type at all. */
export function contrastPickerEnabled(type: string | undefined): boolean {
  return !!type && isGradedType(type) && writeSchemaStoresContrast(type);
}

/** The index of each distractor the server cannot derive a contrast for. */
export function distractorsNeedingContrast(
  targets: readonly ContrastRef[],
  distractors: readonly ContrastRef[],
): number[] {
  return distractors.flatMap((d, i) => (serverContrast(targets, d) === null ? [i] : []));
}

/** One line per contrast id, for the picker. */
export const CONTRAST_CHOICES: { value: ContrastId; label: string }[] = CONTRAST_IDS.map((id) => ({
  value: id,
  label: CONTRAST_META[id].differsBy,
}));

type PickedRef = ContrastRef & { contrast?: unknown };

const refKey = (r: ContrastRef) =>
  [r.letterId, r.form ?? "", r.haraka && r.haraka !== "none" ? r.haraka : "", r.madd === true ? "madd" : ""].join("|");

/**
 * The distractors after a change of selection: a picked contrast stays on the
 * same reference, and is dropped where the server derives one, or everywhere
 * when the picker does not apply (`enabled` is `contrastPickerEnabled`).
 */
export function carryContrast<T extends PickedRef>(
  enabled: boolean,
  targets: readonly ContrastRef[],
  previous: readonly PickedRef[],
  next: readonly T[],
): T[] {
  const picked = new Map<string, ContrastId>();
  for (const p of previous) if (isContrastId(p.contrast)) picked.set(refKey(p), p.contrast);
  return next.map((d) => {
    const bare = { ...d };
    delete bare.contrast;
    if (!enabled || serverContrast(targets, d) !== null) return bare;
    const keep = isContrastId(d.contrast) ? d.contrast : picked.get(refKey(d));
    return keep ? { ...bare, contrast: keep } : bare;
  });
}
