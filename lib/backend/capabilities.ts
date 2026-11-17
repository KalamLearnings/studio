/**
 * What the backend of each Studio environment can take (the PROD gate).
 *
 * Studio `main` is ahead of the PRODUCTION backend: PROD runs backend `main`
 * (a4e6a8dd plus the words hotfix 7d85414b), and the content-model save paths
 * live only on backend `dev`. The PROD backend stores an activity config as
 * sent (no config schema on the write) and the v1 app reads it. So while the
 * environment is production, Studio must save only the shapes v1 reads: a
 * dev-only shape is stored verbatim and v1 shows an empty activity (the
 * `blendVersion: 2` sound_blend row with no `word` or `segments`).
 *
 * This file is the ONE place that says what each backend can take. Forms and
 * the save path read a `BackendCapabilities` (never the environment name), and
 * `toBackendShape` (`lib/backend/legacyShapes.ts`) writes the legacy shape for
 * every capability that is off.
 *
 * Why a map and not detection: the PROD backend exposes no capability or
 * version field (`/health` reports status only), and probing a dev-only route
 * would be async, slow the form open, and fail open on a network error. A
 * static map fails closed: an environment it does not know gets `LEGACY`.
 *
 * RELEASE CHECKLIST: when backend `dev` is released to production (the
 * content-model release), set `prod` to `CONTENT_MODEL` below, then delete
 * this file, `lib/backend/legacyShapes.ts`, `lib/backend/useBackendCapabilities.tsx`
 * and their call sites (search for `BackendCapabilities`). The release must
 * also run the staged data migration (ACTIVITY_CONFIG_MIGRATION_PLAN.md).
 */

/** What a backend understands beyond the v1 shapes. Every flag off = backend `main`'s era. */
export interface BackendCapabilities {
  /**
   * The blend word model (SB-B3, SB-B10, CM-D3e): `blendVersion: 2` configs
   * with `wordRef`, `ending`, `stages`, a letter blend's `targetLetter`, and
   * the request body's top-level `wordBlendEdit`. The server writes v1's
   * `word`, `segments` and `chunks`. Off: Studio writes them itself.
   */
  blendWordModel: boolean;
  /**
   * `wordRef` on build_word_from_letters, show_letter_or_word and
   * tap_letter_in_word (CM-D3d, CM-D3e): the server writes v1's word text
   * from it. Off: the form's own text is sent and `wordRef` is not.
   */
  wordRefs: boolean;
  /**
   * Canonical configs (CM-S3, CM-S6, R2): a save sends references only and
   * the server writes v1's display fields (an option's text, the MCQ mode
   * and question, a card's text, a pair side's value). Off: every row opens
   * through the shim and saves as the form built it (v1's shape).
   */
  canonicalConfigs: boolean;
  /**
   * The references the CM-S6 answer-set forms keep beside v1's fields:
   * `prompt` (the skill kind and stimulus) and an item's library word
   * (`word: { wordId }`). Off: not sent, and the "Asks" picker is hidden.
   */
  answerSetRefs: boolean;
  /** `madd: true` on a letter reference (CM-S2, D7). Off: not offered and not sent. */
  letterMadd: boolean;
  /** A picked `contrast` on a distractor reference (CM-S3, R10). Off: not offered and not sent. */
  distractorContrast: boolean;
}

/** Backend `main` (PROD today): only the shapes the v1 app reads. */
export const LEGACY: Readonly<BackendCapabilities> = Object.freeze({
  blendWordModel: false,
  wordRefs: false,
  canonicalConfigs: false,
  answerSetRefs: false,
  letterMadd: false,
  distractorContrast: false,
});

/** Backend `dev`: the content model. */
export const CONTENT_MODEL: Readonly<BackendCapabilities> = Object.freeze({
  blendWordModel: true,
  wordRefs: true,
  canonicalConfigs: true,
  answerSetRefs: true,
  letterMadd: true,
  distractorContrast: true,
});

/**
 * The capabilities of each environment's backend (`lib/stores/environmentStore.ts`).
 * See the release checklist above before changing `prod`.
 */
export const BACKEND_CAPABILITIES: Readonly<Record<string, Readonly<BackendCapabilities>>> = Object.freeze({
  dev: CONTENT_MODEL,
  prod: LEGACY,
});

/** The capabilities of an environment's backend; an unknown environment gets `LEGACY` (fail closed). */
export function backendCapabilitiesFor(env: string | null | undefined): Readonly<BackendCapabilities> {
  return (env && Object.prototype.hasOwnProperty.call(BACKEND_CAPABILITIES, env) && BACKEND_CAPABILITIES[env]) || LEGACY;
}
