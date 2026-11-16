/**
 * sound_blend letter mode (backend CM-D3e, Studio CM-D3f).
 *
 * A letter blend points at the LETTER: `targetLetter`, a letter reference with
 * its haraka (never a word row). A save sends
 * `{ blendVersion: 2, contentType: "letter", targetLetter }` and the server
 * writes v1's `word` and `segments` from the reference (`letterBlendV1`,
 * keeping the stored glyph when it draws the same letter). So the form reads
 * the letter from `targetLetter` and writes it on every letter pick: a row
 * whose letter was edited can never leave the server deriving v1's fields
 * from a stale stored reference.
 *
 * A legacy letter row (no `targetLetter` yet) is read from its `word` glyph
 * (else its one segment) with the server's own glyph reader, so a haraka
 * written after the tatweel (`جـَ`) reads as the initial form.
 */

import { readLetterGlyph, readLetterRef } from "@kalam/curriculum-schemas/server";
import type { SoundBlendConfig, SoundSegment } from "./config";

/** A letter reference as the letter blend save takes it (no `haraka: "none"`, no madd). */
export interface LetterBlendRef {
  letterId: string;
  form: "isolated" | "initial" | "medial" | "final";
  haraka?: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** A picked or stored letter value as the reference a letter blend sends; null when it is not one. */
export function toLetterBlendRef(value: unknown): LetterBlendRef | null {
  const ref = readLetterRef(value);
  if (!isRecord(ref) || typeof ref.letterId !== "string" || typeof ref.form !== "string") return null;
  return {
    letterId: ref.letterId,
    form: ref.form as LetterBlendRef["form"],
    ...(typeof ref.haraka === "string" ? { haraka: ref.haraka } : {}),
  };
}

/**
 * The letter a letter-mode row blends: its `targetLetter`, else (a legacy row)
 * the glyph v1 shows (`word`, else the one segment's sound) read as a letter.
 */
export function letterBlendTarget(config: SoundBlendConfig | undefined): LetterBlendRef | null {
  if (!config || (config.contentType ?? "word") !== "letter") return null;
  if (config.targetLetter !== undefined) return toLetterBlendRef(config.targetLetter);
  const glyph = [config.word, config.segments?.[0]?.sound].find(
    (t): t is string => typeof t === "string" && t.trim() !== "",
  );
  return glyph ? readLetterGlyph(glyph) : null;
}

/**
 * The config after the author picks a letter: the reference the server
 * derives from, and the v1 preview (`word`, `segments`) the form shows. The
 * server overwrites the preview on save.
 */
export function withLetterBlend(
  config: SoundBlendConfig,
  ref: LetterBlendRef,
  preview: { glyph: string; segment: SoundSegment },
): SoundBlendConfig {
  return {
    ...config,
    blendVersion: 2,
    contentType: "letter",
    targetLetter: ref,
    word: preview.glyph,
    segments: [preview.segment],
  };
}
