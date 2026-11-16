# Words (the connections map)

`/words`: find a word, see what it is connected to, and what is missing. Design: `design/concepts/content-graph/`
(approved 2026-11-16, with the lead's recommendations). The page is **read only** in CG-1 to CG-6. It replaced the old
word list at `/words`. `/families` and `/concepts` redirect here (`?family=` / `?concept=` become `?focus=`). Editing
families and meanings still works in Review's library lenses.

## Owner decisions this page follows

1. One sidebar item, "Words", at `/words`.
2. Plain labels: "Forms of the word", "Meaning", "Pictures", "Letters", "Used in lessons", "Other readings". Each box
   shows its sentence from the concept (`lib/connections/kinds.ts`).
3. Only a curriculum lead or a phrase reviewer can connect (`lib/connections/access.ts`). Other staff see the page read
   only, with the reason in the top bar.
4. No meaning-to-meaning links.
5. When one unvowelled spelling can be several words (جمل: جَمَل camel, جُمَل sentences), the page suggests splitting
   them into separate families (`lib/connections/meanings.ts`, the note above the frame, and the gap "Spellings with
   several meanings"). It only detects the case. The split itself is CG-5.

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
| `lib/hooks/useConnections.ts` | The graph and usage queries, and `useConnectAccess`. |
| `components/connections/WordsPage.tsx` | The shell: top bar, rail, canvas, URL and history, keys. |
| `FocusFrame.tsx`, `FocusCard.tsx`, `GroupBox.tsx` | CG-3: the CSS grid frame, the SVG wires, the item card, and one box. |
| `SearchBox.tsx`, `GapsRail.tsx`, `AllWords.tsx`, `Trail.tsx`, `KindsDialog.tsx` | CG-4, CG-6, the breadcrumb, the legend. |
| `parts.tsx` | Kind colours and icons, `NodeChip`, `Badge`, `Thumb`. Arabic is always Review's `<Ar>`. |
| `extension.ts` | The slots CG-5 fills (below). |
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

## Extension points for CG-5 ("+ Add" on each box)

CG-5 adds a "+ Add" button on each box, a typed picker, refusals in plain words, and Undo. Nothing else changes in the
frame.

- Provide `EditingContext` (`extension.ts`) only when `access.canConnect`. While it is null the page shows no edit
  controls.
- `headerExtra(box, focus)`: render "+ Add" next to the box heading. Show it only when `box.accepts` is set. Only
  boxes made by hand have one (Forms of the word, Other readings, Meaning, Pictures). Worked-out boxes (lock, dashed
  wire) never take one.
- `itemExtra(box, item, focus)`: the remove button on a chip, and "make dictionary form" on a form.
- `emptyExtra(box, focus)`: "Start a family" in an empty "Forms of the word".
- The picker should list only items of `box.accepts`, greyed out with the reason when refused. Put the
  plain-words refusal map next to `familyErrorText` (`lib/words/family.ts`). The concept's `options()` /
  `readsAsIssue()` / `joinIssue()` in `design/concepts/content-graph/index.html` are the reference. Use
  `NO_MEANING_LINKS` (`kinds.ts`) for a meaning-to-meaning attempt.
- Writes go through the routes in the concept's section 1 (`lib/api/wordFamilies.ts`, `lib/api/concepts.ts`). After
  a write, invalidate `["connections", "library"]` (and `["connections", "usage", ...]` if needed). Undo is the
  inverse route, shown in a sonner toast.
- The split suggested by decision 5 is `SeveralMeanings` (`meanings`, `needsSplit`, `mixedFamilyId`). The note in
  `FocusFrame.tsx` is where its action goes.

## Not done here

- Lesson activities are rows that open the lesson builder. They are not a focus, because no route lists an
  activity's spellings.
- A family's own pictures (`content_asset_links` on a family) have no read route, so `familyPictures` is never
  filled. The "Own picture" box appears only once that read exists.
- CG-7 (Review "Show connections") and CG-8 (deleting the old `FamilyEditor`/`ConceptEditor` page wrappers).
