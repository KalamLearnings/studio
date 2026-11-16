# Words (the connections map)

`/words`: find a word, see what it is connected to, what is missing, and (for a curriculum lead or a phrase reviewer)
connect it. Design: `design/concepts/content-graph/` (approved 2026-11-16, with the lead's recommendations, then scaled
down: no drag and drop, no family merge or retire, no change history). It replaced the old word list at `/words`.
`/families` and `/concepts` are gone (CG-8); `next.config.mjs` redirects them here (`?family=` / `?id=` and
`?concept=` / `?slug=` become `?focus=`). Details (gloss, notes, a meaning's names and kind, Mark reviewed) are still
edited in Review's library lenses.

## Owner decisions this page follows

1. One sidebar item, "Words", at `/words`.
2. Plain labels: "Forms of the word", "Meaning", "Pictures", "Letters", "Activities", "Books", "Other readings". Each
   box shows its sentence from the concept (`lib/connections/kinds.ts`). "Used in lessons" was split into Activities
   and Books at the owner's request.
3. Only a curriculum lead or a phrase reviewer can connect (`lib/connections/access.ts`; the backend answers 403
   `PHRASE_REVIEWER_REQUIRED` to anyone else). Other staff see the page read only, with the reason in the top bar,
   and get no edit controls.
4. No meaning-to-meaning links.
5. When one unvowelled spelling can be several words (جمل: جَمَل camel, جُمَل sentences), the page suggests splitting
   them into separate families (`lib/connections/meanings.ts`, the note above the frame, and the gap "Spellings with
   several meanings"). The note's "Start its own family" / "Move to its own family" does the split (`planSplit`).

Out of scope for good: family merge, family retire, "who connected this" history, drag and drop (`@dnd-kit`), and a
one-request graph read.

## Layout

| Path | What |
|---|---|
| `lib/connections/keys.ts` | Node keys (`word:`, `family:`, `concept:`, `picture:`, `letter:`, `activity:`), URL state `?focus=<key>&view=all`, the old routes' redirects, the trail (`nextTrail`, `previousOnTrail`). |
| `lib/connections/graph.ts` | `buildGraph(GraphInput)`: the nodes and their indexes (forms of a family, readers, meanings, pictures, letters of a spelling). |
| `lib/connections/neighbourhood.ts` | `neighbourhood(graph, focus, usage)`: the boxes around one item, each in a fixed area, with `editable`, `missing`, `accepts`, and the lessons' load state. `usageUnitsFor` says which usage reads a focus needs. |
| `lib/connections/meanings.ts` | Decision 5: `severalMeaningsOfWord`, `severalMeaningsInFamily`. Two vowelled spellings are the same word when they differ only on the last letter. |
| `lib/connections/gaps.ts` | "What's missing" (`gaps`) and "All words" (`allWords`). |
| `lib/connections/search.ts` | One index over spellings, words, meanings, pictures and letters. It uses Review's `foldForSearch` (`lib/review/inbox.ts`), which now also folds hamza seats, ة/ه and ى/ي, for both pages. |
| `lib/connections/wires.ts` | The wire geometry (pure). |
| `lib/connections/kinds.ts` | Plain names and sentences. |
| `lib/connections/source.ts` | The data-access layer (below). |
| `lib/connections/connect.ts` | CG-5, pure: what "+ Add" offers per box (`addCandidates`), refusals in plain words before sending (`joinIssue`, `readingIssue`), and the plans for a pick, a removal, the dictionary form, a practice word, "Start a family" and the split. |
| `lib/connections/ops.ts` | Pure: every write as `Op`s (one route call each), `inverseOps` (Undo), `planMoveIntoFamily` (out of old families first, then in, read-as rows before their readers), and `runOps`, which undoes what it sent when a later call is refused. Review's Suggested links use it too. |
| `lib/connections/refusals.ts`, `connectApi.ts` | A refusal in plain words (`familyErrorText` in `lib/words/family.ts` holds the map), and the real routes behind `ConnectApi`. |
| `lib/hooks/useConnections.ts` | The graph and usage queries, and `useConnectAccess`. |
| `components/connections/WordsPage.tsx` | The shell: top bar, rail, canvas, URL and history, keys. |
| `FocusFrame.tsx`, `FocusCard.tsx`, `GroupBox.tsx` | CG-3: the CSS grid frame, the SVG wires, the item card, and one box. |
| `SearchBox.tsx`, `GapsRail.tsx`, `AllWords.tsx`, `Trail.tsx`, `KindsDialog.tsx` | CG-4, CG-6, the breadcrumb, the legend. |
| `parts.tsx` | Kind colours and icons, `NodeChip`, `Badge`, `Thumb`. Arabic is always Review's `<Ar>`. |
| `extension.ts` | The frame's edit slots (below). |
| `editing/` | CG-5: `ConnectEditing` (fills the slots), `Picker` (typed, refused rows greyed with the reason), `PictureSearch` (`GET /assets`), `NameDialog` (a new family or meaning), `useConnectRun` (send, toast with Undo, refetch), `api.tsx` (the routes, swappable in a preview). |
| `words.module.css` | Kind tokens (light and dark), the grid areas, and the 1180 px and 900 px layouts. |

## Data

`ConnectionsSource` (`lib/connections/source.ts`) is the only seam to the backend. `routesSource` reads the existing
routes, and that is the permanent design: `GET /words`, `GET /words/families`, `GET /words/concepts` plus each
concept's detail (for its words and pictures), `GET /letters/list`, and `GET /words/:id/usage` for a spelling's
lessons. A word (family) asks for the usage of each of its forms.

**To adopt `GET /content/usage?unit=` (B-1)** when it lands: answer `usage(unit)` for `word:`, `letter:` and `concept:`
in `routesSource` (letters return `null` today, so their "Used in lessons" box says it is not available yet). If a
family should take one read instead of one per form, add `family` to `usageUnitsFor` and answer it there.
`neighbourhood` already folds any list of `WordUsageItem`s.

`SourceContext.tsx` provides the source. A preview or a test can wrap the page in `ConnectionsSourceProvider` with its
own source. `lib/connections/fixtures.ts` is a small sample library for that.

## Connecting (CG-5)

`ConnectEditing` is mounted around the frame only when `access.canConnect`. It fills `extension.ts`:

- `headerExtra`: "+ Add" on every box made by hand (`box.accepts`): a spelling's word (family) and its readings, a
  word's meaning and forms, a meaning's words and pictures, a picture's meaning. Worked-out boxes (lock, dashed wire)
  never take one. Pictures are searched on the server (`PictureSearch`); everything else is a `Picker` over the graph.
  A meaning picker can also create a new meaning (plain staff route) and connect it.
- `itemExtra`: × removes the link; ★ makes a form the dictionary form. A refused removal (the dictionary form) stays
  visible, greyed, and says why.
- `emptyExtra`: "Start a family" on a spelling with none (it becomes the dictionary form; its readings with no family
  join it).
- `focusExtra`: "Mark as practice word" (`PUT /words/:id/pseudo`), shown with the reason when the spelling is in a
  family or has a reading (`WORD_IN_FAMILY`, `WORD_HAS_READING`).
- `splitExtra`: the several-meanings split.

Every change is a list of `Op`s sent in order; a refusal half way undoes what was sent. The toast offers Undo (the
inverse routes). A created family or meaning stays after Undo (nothing is deleted), and the toast says so.

## Review links (CG-7)

The item card links to its Review item: a spelling to `?lens=spelling&item=spelling:<id>`, a spelling waiting for a
reading to `reading:<id>`, a spelling with no family and a picture with no meaning to the Suggested links lens, a word
and a meaning to the library lenses, a letter to its sounds. Review's context cards link back ("Show connections").

## Not done here

- Lesson activities and books are rows that open the lesson builder and the book editor. They are not a focus.
- A family's own pictures (`content_asset_links` on a family) have no read route, so `familyPictures` is never
  filled, the "Own picture" box never appears, and it has no "+ Add". The write routes exist (`lib/api/wordFamilies.ts`).
- Out of scope for good: drag and drop, family merge, family retire, "who connected this" history, one-request graph read.
