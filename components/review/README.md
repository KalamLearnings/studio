# Review workspace

`/review`: one inbox for every content decision. Design: `design/concepts/content-workspace/` (approved 2026-11-16).
The old pages keep their routes until CW-12; only their sidebar items are gone.

## Layout

| Path | What |
|---|---|
| `lib/review/inbox.ts` | Pure core: `InboxItem`, kinds and role gates, pills, counts, search (harakat folded), lenses and views, sorts, bulk-safe rule, selection after a decision. |
| `lib/review/normalise/` | One normaliser per source, rows to `InboxItem`s. `words.ts` (Spellings, Readings) and `sources.ts` (blend, drafts, word requests, phrases, recordings) are written and tested. |
| `lib/review/actions/` | `DecisionSpec`s per lens (`words.ts`). A spec says how the item looks once decided, how to send it, how to undo it. |
| `lib/review/decisions.ts` | The ledger: `inverse` decisions are sent now and undone with their inverse route; `hold` decisions wait 5 s so Undo cancels them. |
| `lib/review/session.ts` | Optimistic overlays, per-item errors and busy state, folded from the ledger's events. |
| `lib/review/keyboard.ts` | Key to command, and the shortcut sheet rows. |
| `lib/review/url.ts` | `lens`, `status`, `sort`, `q`, `item`, and `family` / `concept` (the editor open in the pane). |
| `lib/review/library.ts` | Pure: Families and Concepts rows, gap filters (no concept, no headword, not reviewed, readings; no picture, picture problem, no family), search, `LibraryRef`. |
| `lib/review/bulk.ts` | Pure: the bulk selection (bulk-safe only) and the sequential run with progress and partial-failure report. |
| `lib/hooks/useReviewInbox.ts` | Reads the sources of the registered kinds, applies the session, offers `decide` and `undo`. |
| `components/review/ReviewWorkspace.tsx` | Rail, list, pane, URL sync, keyboard, focus. |
| `components/review/lenses/` | The lens registry and one folder per lens pane. |
| `components/review/PaneFrame.tsx`, `parts.tsx`, `context/` | What every pane composes: hero, cards, decision bar, gate bar, Family and Concept cards. |
| `components/review/library/` | CW-9: the Family and Concept editors (moved from the old pages, which import them from here), the create dialogs, the Families and Concepts list, the in-pane sub-views, `useReviewLibrary`, and `LibraryApiContext` (the routes, swappable in a preview or test). |
| `components/review/bulk/` | CW-10: `useBulkApprove` and the selection, progress and report strip. |

## Adding a lens

A kind shows in Review (rail, counts, number key, sheet rows, and its source is read) only once its lens is in
`lenses/index.ts`. To add one, say Blend (CW-6):

1. **Normaliser.** Use or extend the one in `lib/review/normalise/sources.ts` (`blendItems`). Keep it pure and tested.
   `item.data` is whatever the pane needs; `state` is `todo`/`failed` while it waits.
2. **Source.** In `useReviewInbox`, call the existing query hook with `enabled: wants("blend")`
   (`useBlendReviewQueue(wants("blend"))`), add a `SourceState` row (`sourceState("blend", "Blend splits", q)`) so a
   failure shows its own strip with Retry, push the normaliser's items in `sourceItems`, and add the refetch to `refetchAll`.
   Add any cache writers the decisions need next to `wordCache`.
3. **Decisions.** `lib/review/actions/<lens>.ts` returns `DecisionSpec`s. Choose the mode:
   - `inverse` when the backend has an inverse route (approve and withdraw, note and clear, reads-as and clear,
     phrase reject and `DELETE .../rejection` (BE-5), asset flag and `DELETE .../review-flag` (BE-3)).
   - `hold` when it has none (draft approve or reject, take review, split review, fulfil, decline, a respelling).
   `run` must patch the cached rows with the server's answer, so the overlay can go when it lands.
   `describeError` turns a refusal into plain words (reuse the old page's mapper).
4. **Pane.** `lenses/<lens>/<Lens>Pane.tsx` takes `PaneProps` and renders `<PaneFrame main context bar />`.
   Use `Hero`, `PaneCard`, `ContextCard`, `DecisionBar` (it shows `busy` and `error` for you) and `GateBar` for a kind
   the reviewer's role cannot decide (no disabled buttons). Call `decide(spec)`; the workspace opens the next item
   unless `advance: false`.
5. **Keys.** `usePaneCommands(handler)` gets every command first; return true when handled. A pane owns `a`, `r`,
   digits while a picker is open, `enter`, `esc` for its own field, `space`, `tab`, `g`, `o`. Unhandled digits jump
   to a kind. Add the lens's rows to `shortcuts` in its registry entry; they merge into the sheet.
6. **Tools.** Kind tools in the list header (AI check, curriculum and node filters, Request drafts) go in the
   registry entry's `ListTools`.
7. **Register** it in `lenses/index.ts`.

## Planned lenses and their sources

| Ticket | Kind | Source (shape) | Normaliser |
|---|---|---|---|
| CW-6 (done) | `blend` | `GET /words/blend/review` | `blendItems`; focus targets and overlays in `normalise/blend.ts`; split and take reviews are `hold` (`actions/blend.ts`) |
| CW-7 (done) | `draft` | BE-1 `GET /curriculum/generation/drafts?status=pending&limit=&cursor=`, `{ items, next_cursor }`; titles are stored `{ en, ar? }` (`titleText`) | `draftItems`; preview `lib/review/draftPreview.ts`; lens tools narrow by curriculum and node (`useDraftScope`) |
| CW-7 (done) | `request` | `GET /curriculum/generation/word-requests` | `requestItems` |
| CW-8 (done) | `phrase` | BE-2 `GET /curriculum/reading/phrases`, `{ pending, approved, rejected, generation_enabled }`, `rejection` (`reviewed_by`, `reviewed_at`) on every entry | `phraseItems`; cache moves in `actions/phraseList.ts` |
| CW-8 (done) | `recording` | the same list: `audio.state` on approved entries; the full take read when the item opens (`usePhraseAudio`) | `recordingItems`, `recordingTakeToHear`; audio parts in `components/phrases/audio/` |
| CW-11 (done) | `letter` | audio library `letter_sounds` (`getAudioAssets`), BE-3 `GET /assets/letter-sounds/review-flags` `{ items }`, `GET /letters/list` | `letterItems` (`normalise/letters.ts`); flag and clear are `inverse` (`actions/letters.ts`) |

Other extension points:

- **Library (CW-9).** `lib-families` and `lib-concepts` swap the list column for `LibraryList`; a row, `f` / `c`, or a
  context card's Edit opens the editor in the pane (`LibraryPane`) with "Back to <item>" (`esc`). `openFamily(null)`
  ("Add to a family") opens the Families lens and the family you pick offers the word you came from;
  `openConcept(null)` opens the word's family, where concepts are linked. Panes only call `openFamily` / `openConcept`.
- **Bulk (CW-10).** Only items with `isBulkSafe` (today: unflagged, fully vowelled spellings that wait; never audio,
  drafts or phrases) get a row checkbox; `x` toggles, `shift+A` approves the checked rows. Each is its own
  `approveSpelling` decision with `quiet: true` (no toast), sent one at a time: the run watches the session's busy and
  error per item rather than wrapping the request, so it works with any `decide`. Undo all withdraws each one through
  its inverse route. To make another kind bulk-safe, set `bulkSafe` in its normaliser and give `useBulkApprove` its spec.
- **Blend pane (CW-6).** It reuses the old page's parts: `lenses/blend/ReviewFormPanel` and `SplitReviewControls` (moved
  from `app/(dashboard)/review/blend/_components`) and the builder's `FormAudioPanel`, `TakeRow`, `TakeRejectForm`,
  `GenerateAudioControls`, `WaveformMarkEditor`. The pane drives them through optional `handleRef`s (approve, reject,
  pick a reason, play), so the builder and the old page work unchanged. Generate, marks and the AI check are not
  decisions; they call `useBlendAudioActions` and `useBlendAiCheck` as before.
- **Letter sounds (CW-11).** A file with no flag is `listen` and never waits; a flagged one is `todo` ("To decide"),
  counts as waiting, and the kind's gate is `phrase` (other staff listen only). `order` keeps the files in alphabet order.
- **Views.** `VIEW_META` lists the kinds each view covers; a view shows in the rail once one of its kinds is registered.
- **Automatic word checks (CM-AIPRE).** `GET /words/check-suggestions` `{ items: [{ word_id, flagged, checks }] }`
  (`lib/api/wordChecks.ts`) is read with the spellings (`WORD_CHECKS_KEY`; a failure only hides the card). `spellingItems`
  puts the word's summary in `data.check` and the backend's `flagged` in `item.checkFlagged`; a flagged spelling is never
  bulk-safe. The view `v-check` (Flagged by check) and the sort `check` (Flagged by check first) read `checkFlagged`.
  The pane's `AutomaticCheckCard` (`lenses/spelling/`) shows each source's verdict and its harakat as a letter diff
  (`lib/review/wordChecks.ts`), labelled automatic; "Use this" only fills the Wrong harakat field, which the reviewer
  saves as before (a note, or a respelling held 5 s). Suggestions are imported on the backend
  (`scripts/import-word-checks.ts`); Studio never writes them.

## Conventions

- Arabic is always `<Ar>` (isolated RTL span, Noto Naskh Arabic with a fallback). Arabic inside a Latin string goes
  through `isolate()` from `normalise/words.ts`.
- Plain, short UI text; no emojis. The server decides every rule; the client only arranges and explains.
- Pure modules under `lib/review` import each other relatively (vitest here has no `@/` alias).
