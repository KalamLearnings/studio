# Activity Config Pre-fill — Audit & Normalization Plan

> Why selecting an existing activity left letter/word selectors blank in the v2
> builder, and the targeted fix.

## Root cause

v2 forms are controlled and read modern config keys (mostly `targetLetter`, a
`LetterReference = { letterId, form, haraka? }`). But some stored configs (written
by v1 / older app versions) use **legacy keys or shapes** the v2 forms don't read.
Instruction text pre-filled because `instruction.en` is stable; config-driven
selectors didn't because the key/shape didn't match.

Config is NOT stripped on load (`listArticles` returns raw, no Zod parse) — the
data reaches the form intact; the form just looks for the wrong key.

## Audit (prod DB, read-only, `curriculum_activities`)

Most types already store the modern keys and pre-fill correctly. The mismatches:

| Type | Stored shape | Form reads | Action |
|------|-------------|-----------|--------|
| `trace_letter` | `letterForm: "ذ"` (raw glyph) | `targetLetter` (LetterReference) | **normalize**: glyph → LetterReference under `targetLetter` |
| `show_letter_or_word` | `letter: { letterId, form }` | `targetLetter` / `word` | **normalize**: `letter` → `targetLetter` |
| `color_letter` | `letter: { letterId, form }` | `letter` | ✅ already matches |
| `speech_practice` | `letter` OR `targetLetter` | reads both | ✅ already handles |

Everything else audited (`tap_letter_in_word`, `grid_tap`, `drag_*`, `pop_*`,
`sound_blend`, `match_pairs`, `multiple_choice_question`, etc.) stores the same
keys the form reads → pre-fills fine.

> Note: some single types have BOTH legacy and modern rows (e.g. `trace_letter`
> has `letterForm` rows AND `targetLetter` rows). Normalization must be additive
> (only fill the modern key when missing), never clobber existing modern values.

## Fix (Phase 3)

Central, not per-form. Apply a `normalizeActivityConfig(type, config, letters)`
at the config-load boundary in `ActivityForm` (before seeding `localConfig`), so
every form receives config in the shape it expects. Letter glyph → LetterReference
resolution reuses the existing `letters` data (id/forms) — mirror v1's
`normalizeToLetterReference`.

Rules implemented:
- `trace_letter`: if `targetLetter` absent and `letterForm` is a glyph, resolve the
  glyph to `{ letterId, form }` and set `targetLetter`.
- `show_letter_or_word`: if `targetLetter` absent and `letter` present, copy
  `letter` → `targetLetter`.
- Leave already-modern configs untouched.

Keep it data-driven and small; extend the map if a future audit surfaces more
legacy shapes. Do NOT migrate the DB — normalize at read time so old and new rows
both work, and saving rewrites them into the modern shape.
