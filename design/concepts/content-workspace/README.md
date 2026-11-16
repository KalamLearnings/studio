# Review: one workspace for every content decision (concept)

Concept only. No Studio code changes. Open `index.html` in a browser (it is self-contained; it only loads the Noto Arabic fonts from Google Fonts, as Studio does). The striped bar at the top holds the concept controls: the role you view as, the scenario (normal, recording switched off, loading, one source failed, everything decided), the theme and the Arabic face. Press `?` for every shortcut. The audio player is simulated; nothing plays.

Proposed name: **Review** (route `/review`, one sidebar item with a count badge). It is the verb both people use for this work, it is already the label of the busiest current page, and Families and Concepts become context inside it rather than destinations. "Content" was the alternative; it reads as a library to browse, while this page is a queue of decisions with a library attached.

---

## 1. Audit of the six pages

Source read: `app/(dashboard)/{families,concepts,review/blend,review/words,review/drafts,review/phrases}`, their `_components`, `components/{families,phrases}`, `components/builder/forms/blendWord/audio/*`, `lib/{words,blendWord,generation,phrases}`, `lib/hooks/{useWordReviewQueue,useBlendReview,useDrafts,useCurriculumLead,usePhraseReviewer}`, `lib/api/{wordFamilies,concepts,wordReview,wordReviewDecisions,words,generation,phraseReview}`, and the backend `_shared/http/route-manifest.ts`.

| Page (sidebar label) | What it shows | Actions | Data each item carries | States | Roles | Empty / error |
|---|---|---|---|---|---|---|
| **Families** `/families` | Left: searchable list of word families (gloss, id, headword). Right: family editor. | Search (id, gloss, headword); New family (gloss, slug id); edit gloss, headword (live members only), notes, Save; per spelling: Mark reviewed / Withdraw review, Remove from family, Confirm reading (pick a fully vowelled spelling with the same letters) / Clear reading; Add a spelling (WordPicker; moving one from another family says so); Link a concept / Unlink; link out to `/concepts?concept=slug`. | Family: `id, headword_id, gloss_en, notes, updated_at`, `members: CuratedWord[]` (`arabic, english, is_pseudo, usage_count, family_id, reads_as_id, retired_at, reviewed_at, reviewed_by`). Linked concepts with first picture and picture count. | Spelling: headword, retired, not reviewed, reading not confirmed, read as X; no fully vowelled candidate. | Staff (every `/words/families*` route is `staff`). | "No families." / "Pick a family, or create one." / red banner "Failed to load word families"; toasts with mapped codes (`familyErrorText`: READS_AS_*, WORD_IS_PSEUDO, WORD_RETIRED...). |
| **Concepts** `/concepts` | Left: searchable concepts (name en, slug, kind, name ar). Right: concept editor. Deep link `?concept=slug`. | Search; New concept (en, ar, kind, slug); edit en, ar, kind, Save; Add picture (PicturePicker over the asset registry) / Remove picture; Link a word family / Unlink. | `slug, name {en, ar?}, kind (10 kinds), pictures[] {assetId, url, status, label}, families[]`. | Picture asset status badge (active, superseded, orphan, broken, quarantined, retired). | Staff. | "No concepts." / "No picture yet." / "No family names this concept yet." / ASSET_MEDIA_MISMATCH and ASSET_NOT_LINKABLE toasts. |
| **Review** `/review/blend` (this is the sound-blend review, SB-S4) | Words whose blend split or audio take waits for a person; one card per word with its pausal and full forms. | Filter: All / Needs review / Takes failed / Not voiceable (with counts); Reload; AI check of the listed words (max 50); per form: Approve split / Reject split (note required to reject); per take: Play, Approve, Reject (reason from 11, note, optional regenerate settings), Marks (waveform mark editor, save marks); Generate / Regenerate with voice settings. Read-only: override diff (rules vs edited split), QA flags (rule or AI with confidence and suggested reading), harakat source, splitter version, AI-checked flag, "Proposed: mark as a practice word" (points to the activity word editor; no button). | `wordId, word {arabic, english, isPseudo, usageCount} or null, forms[] {form, vowelisedText, units[], override, reviewStatus, harakatSource, qaFlags[], aiCheckedAt, review {decision, by, at, note, current}, takes[] {kind natural/stretched, status, url, durationMs, marks, phases, qaFlags, error, attempts, settings}}`. | Split: ready, needs_review, approved, rejected, stale review (split changed since). Take: pending, needs_review, ready, rejected, failed, not_voiceable (after 5 attempts). Word missing from library. | Staff (all `/words/blend*` and `/words/:id/audio*`). | "Nothing waits for review." / "No word matches this filter." / "The queue could not be loaded: ..." / generation off line ("Generate and Regenerate are off; you can still review the takes"); AI check off or budget used up disables its button with the reason. Polls every 10 s while a take is pending. |
| **Word review** `/review/words` | The word-bank review queue (CM-S7), computed client-side from `GET /words`: live real spellings of classes real_full, real_partial, case_variant, most used first. | Status tabs To review / Approved / All (counts); class or flag slice; Arabic search; Reload; Export decisions CSV (audit `14-word-review-queue.csv` columns); per row: Approve / Withdraw approval; Not a real word / Clear note; Wrong harakat (corrected spelling, same letters enforced) / Clear note; Show 50 more. | `rank, word {id, arabic, usage_count, ...}, class, reason (base for case variants), flags (two_letters, vowel_permutations, unused), skeletonSiblings, suggested action text, reviewed`. Notes `{decision pseudo / wrong, correctedSpelling}` shared on the server. | To review, approved, noted not a real word, noted respell as X. | Staff. Notes change nothing in the bank; the clean-up run applies them. | "Nothing waits for review." / "No word matches this filter." / "The word bank could not be loaded" / notes load and save failures as toasts (failed save rolls back). WORD_RETIRED message. Legacy browser notes upload silently. |
| **Draft review** `/review/drafts` | AI-drafted activities for the chosen curriculum (one request per node), plus open word requests. | Curriculum select; node select; "Show approved, rejected and published"; with a node: activity type + "Request drafts for this node" (result line: drafted, word requested, rejected by checks, no draft); per draft: Approve / Reject (optional reason); per word request: Fulfil (pick a reviewed, live, real word) / Decline (optional reason). | Draft: `id, node_id, type, config, is_published, approved_by/at, provenance {model, template, prompt_version, exemplar_ids, required_form, requested_by, checks[] pass/fail/note, edits[], review {rejected, reason}}`. The config is never shown. Word request: `activity_type, description_en, letters, node_id, status, created_at`. | Draft: pending, approved (not published), rejected, published. Word request: open, fulfilled, declined. | Read and request: staff. Approve / reject / exemplar: **curriculum_lead** (`app_metadata.curriculum_lead`). Word requests fulfil / decline: staff. | "No AI drafts here." / "No draft waits for approval." / "No open word requests." / `describeGenerationError` (GENERATION_DISABLED, DRAFT_REJECTED, WORD_NOT_FULFILLING, WORD_REQUEST_CLOSED, 403...). Non-leads see a sentence saying buttons are for leads. |
| **Phrase review** `/review/phrases` | Pending and approved phrases and sentences used by reading activities; approved ones carry their whole-phrase audio (CM-S14). | Approve (disabled while a word has a problem) / Revoke; audio: Play served, Play new take, Approve take, Reject take (reason from 8, note; "other" needs a note), Generate / Regenerate with settings. Polls every 5 s while a take is being made. | Phrase: `phrase_key, word_ids, is_sentence, text, word_problems[], used_in[] {activity_id, node_id, type, path}, approval {by, at}, reason unreviewed / flag_mismatch`. Audio: `generation_enabled, served_take_id, takes[] {status, url, duration_ms, error, current, served}`. | Phrase: pending (unreviewed, or approved as the other kind), approved. Take: pending, needs_review, approved, rejected, failed; stale when the phrase changed. | Read: staff. Approve / revoke phrase and every audio write: **phrase_reviewer** or curriculum lead. Team rule (unchecked): reviewer is not the author. | "No phrase waits for approval." / "Nothing approved yet." / "Phrases could not be loaded" / recording off is shown calmly ("Recording is switched off until the owner turns it on."), never as an error; budget, in-progress, stale and not-reviewable codes mapped. |

Not a page today: **letter-sound files**. They live in the Audio library (`/audio`, category `letter_sounds`) with a registry status but no review state, approve or reject. The concept gives them a listen-only lens and marks a "Flag a problem" action as needing backend (open question 3).

### Problems the audit surfaced

1. Six destinations for one job; the same word appears on three of them (word review, families, blend) with no link between them.
2. Families and Concepts each need the other open to finish a task (link a family, then pick its picture on the concept).
3. Draft review loads one request per node of one curriculum; there is no way to see every waiting draft at once.
4. A draft's config (what the child would see) is not shown; the reviewer approves provenance, not content.
5. Readings to confirm (unvowelled spellings with no reads-as) are a real queue hidden inside the family editor.
6. Knowing which approved phrase has a take waiting needs one audio request per phrase.
7. The "mark as a practice word" proposal on blend review has no action (no backend route sets `is_pseudo`).
8. Nothing is keyboard driven; every decision is a click, and long lists page by 50.

---

## 2. Information architecture

```
Review  (/review)
├── Rail
│   ├── To decide: Everything (count)
│   ├── By kind: Spellings · Readings · Blend splits · AI drafts · Word requests · Phrases · Recordings   (counts; a dashed "Lead" / "Reviewer" tag when your role cannot decide that kind)
│   ├── Listen: Letter sounds
│   ├── Library: Families · Concepts   (browse and edit; gap filters: no concept, no family, no picture)
│   └── Views: From the AI · Failed audio · Decided by me
├── List (the inbox)
│   ├── Search (Arabic with or without harakat, English, ids, node titles)
│   ├── Status: To decide · Decided · All
│   ├── Sort: Most used first · Waiting longest · Newest · By kind
│   ├── Kind tools (only in that kind): Spellings: class or flag filter, Export decisions · Blend: AI check the listed words · Drafts: curriculum, node, Request drafts
│   └── Rows: large Arabic, status pill, kind, one line of context, age; checkbox only where bulk is safe
└── Pane (the decision)
    ├── Hero: kind, status, age, the item in large vowelled Arabic, the one sentence that says what to check
    ├── Evidence: audio players, splits and diffs, the draft preview, checks, word-by-word phrase
    ├── Context column: family (members and their states), concept (picture), where it is used, history, provenance
    ├── Sub-views: Family editor and Concept editor open inside the pane (f, c) with "Back to <item>"
    └── Decision bar (sticky): the actions with their keys, or, for the wrong role, the status and who decides
```

URL state: `/review?lens=spelling&status=todo&item=word_1767234599841&q=...` and `/review?family=book`, `/review?concept=book`. Old routes redirect: `/families` to `lens=lib-families`, `/concepts?concept=x` to `concept=x`, `/review/blend` to `lens=blend`, `/review/words` to `lens=spelling`, `/review/drafts` to `lens=draft`, `/review/phrases` to `lens=phrase`.

The pane never opens a modal for a decision. Rejecting expands a reason picker in place (numbers pick a reason), so the reviewer's hands stay on the keyboard. After each decision the next item that needs a decision opens, and a toast offers Undo for 5 seconds.

Responsive: at 1500 px and up the rail is 228 px and the list 400 px; 1280 to 1499 px narrows both; the context column sits beside the evidence when the pane is at least 760 px wide (a container query, so it follows the pane, not the window), else it stacks below as a card grid. Under 1100 px the rail becomes a kind select in the list header; under 860 px the list and pane become master and detail with a Back link.

Arabic: every Arabic string is an isolated `dir="rtl" lang="ar"` span inside the LTR app; hero text 54 px (38 px for long sentences), list rows 23 px, split units 30 px. Search folds harakat so `كتاب` finds `كِتَاب`. List ellipsis falls on the visual left, the end of an RTL line.

---

## 3. Old-to-new action mapping

Every action on the six pages, and where it lives now. "Prototype" says whether `index.html` shows it.

| Old page | Action | New home | Prototype |
|---|---|---|---|
| Families | Search families | Library > Families lens, list search | Yes |
| Families | New family | Families lens header "New family"; also "New family" on a word's Family card | Yes (toast) |
| Families | Open a family | Families lens row; `f` or "Edit" on any word's Family card | Yes |
| Families | Edit gloss, headword, notes, Save | Family sub-view, Details card, Save in the decision bar | Yes |
| Families | Mark reviewed / Withdraw review (member) | Family sub-view member row; also the Spelling pane (`a`) | Yes |
| Families | Remove from family | Family sub-view member row | Yes |
| Families | Confirm reading / Clear reading | Readings kind in the inbox (`1`-`9` pick, `a` confirm); also the family member row | Yes |
| Families | Add a spelling (moves from another family) | Family sub-view "Add a spelling"; "Add to a family" on an orphan word | Yes |
| Families | Link / Unlink concept | Family sub-view "Link or unlink"; Concept card `c` | Yes |
| Families | Go to the concept page | Concept card "Edit" opens the concept sub-view | Yes |
| Concepts | Search concepts | Library > Concepts lens search, plus gap filters | Yes |
| Concepts | New concept | Concepts lens header "New concept" | Yes (toast) |
| Concepts | Deep link `?concept=` | `/review?concept=slug` | Described |
| Concepts | Edit en, ar, kind, Save | Concept sub-view Details | Yes |
| Concepts | Add picture / Remove picture, status badge | Concept sub-view Pictures (same PicturePicker) | Yes |
| Concepts | Link / Unlink family | Concept sub-view, families card | Yes |
| Blend review | Filter All / Needs review / Takes failed / Not voiceable | Blend lens + status (To decide = needs review); Views > Failed audio covers failed and not voiceable | Yes |
| Blend review | Reload | Automatic refetch; "updated just now" link refetches every source | Yes |
| Blend review | AI check (listed words) | Blend lens tool "AI check the listed words"; per word in the pane's AI check card | Yes |
| Blend review | Approve / Reject split (note required) | Pane: split row, `a` / `r`; `tab` moves between the word's open decisions | Yes |
| Blend review | Play take | Pane player, `space` | Yes |
| Blend review | Approve / Reject take (reason, note, regenerate settings) | Pane take row, `a` / `r`, numbered reasons | Yes (regenerate-on-reject settings described, not drawn) |
| Blend review | Edit marks, save | Take row "Fix marks" (opens the existing WaveformMarkEditor in place) | Link only |
| Blend review | Generate / Regenerate with settings | Form card "Regenerate", "Settings"; hidden calmly when generation is off | Yes |
| Blend review | Override diff, QA flags, harakat source, pseudo proposal | Pane split row (diff with changed units highlighted), flag chips | Yes |
| Word review | Status tabs with counts | Status segment To decide / Decided / All; counts in the rail | Yes |
| Word review | Class or flag slice | Spellings lens tool | Yes |
| Word review | Search | List search (with harakat folding) | Yes |
| Word review | Reload | Automatic; "updated just now" | Yes |
| Word review | Export decisions CSV | Spellings lens tool "Export decisions" | Yes (toast) |
| Word review | Approve / Withdraw approval | Pane `a`; Withdraw in the bar once approved; bulk approve for unflagged fully vowelled spellings (`x`, `A`) | Yes |
| Word review | Not a real word / Clear note | Pane `p`; Clear note in the bar | Yes |
| Word review | Wrong harakat (same letters) / Clear note | Pane `h` opens an RTL field with a live before/after, same-letter check | Yes |
| Word review | Show 50 more | Virtualised list, no paging | n/a |
| Draft review | Curriculum and node selects | Drafts lens tools (default: every curriculum, needs backend route BE-1) | Yes |
| Draft review | Show approved, rejected, published | Status segment Decided / All | Yes |
| Draft review | Request drafts for a node (type) | Drafts lens tool "Request drafts"; "More drafts for this node" card on any draft | Yes |
| Draft review | Approve / Reject (reason) | Pane `a` / `r` (lead only) | Yes |
| Draft review | Provenance, checks, findings, rejected reason | Pane: Provenance card, Save checks chips, rejected banner; new: "What the child sees" preview | Yes |
| Draft review | Word request Fulfil (reviewed word) / Decline (reason) | Word requests kind: `a` opens the reviewed-word picker (`1`-`9`), `r` declines | Yes |
| Phrase review | Pending / Approved sections | Phrases kind with status segment | Yes |
| Phrase review | Approve (blocked by word problems) / Revoke | Pane `a`; Revoke once approved; the word problem links to that word's spelling | Yes |
| Phrase review | Play served / play new take | Recordings kind: both players side by side; `space` new take, `shift+space` served | Yes |
| Phrase review | Approve take / Reject take (reason, note) | Recordings pane `a` / `r` with numbered reasons | Yes |
| Phrase review | Generate / Regenerate with settings | Recordings pane `g`, Settings | Yes |
| Phrase review | Used in, word problems | Context "Where it is used"; warning line in the hero | Yes |
| Phrase review | Recording switched off | Calm info line in the hero; Generate hidden; bar says there is nothing to do | Yes |

**Actions with no direct home (flagged):**

- **Mark a word as a practice word** (blend pseudo proposal). There is no route that sets `is_pseudo`; today the page says to tick it in an activity's word editor, and the new design keeps that pointer. A real action needs backend (open question 4).
- **Letter-sound review.** Not on any current page; the new lens is listen-only. Flagging a file needs a review state on the asset registry (open question 3).
- **Exemplar toggle** (`PUT /exemplars/:id`, lead) lives in the builder (`ExemplarToggle`), not on the six pages; it stays there.

Nothing else is lost.

---

## 4. Keyboard map

Keys are off while typing in a field; `esc` leaves the field.

| Key | Does |
|---|---|
| `j` / `k` (or arrows) | Next / previous item |
| `tab` / `shift+tab` | Next / previous open decision inside one item (a blend word has splits and takes) |
| `/` | Search |
| `t` | Cycle status: To decide, Decided, All |
| `1`-`8`, `0` | Jump to a kind; `0` is Everything (when no picker is open) |
| `x` | Select for bulk (only where bulk is safe) |
| `a` | Approve, confirm, fulfil |
| `shift+a` | Approve every selected item |
| `r` | Reject or decline; opens the reasons in place |
| `1`-`9`, `0` | With a picker open: pick a reason, a reading candidate or a word |
| `enter` | Confirm the rejection or the correction |
| `p` | Spelling: not a real word |
| `h` | Spelling: wrong harakat (opens the correction field) |
| `u` | Undo the last decision (5 s toast) |
| `space` | Play or pause the take to decide |
| `shift+space` | Play the served take, to compare |
| `g` | Recording: regenerate |
| `f` / `c` | Open the family / concept in the pane |
| `o` | Draft: open in the builder |
| `?` | Shortcut sheet |
| `esc` | Close a picker, a sub-view, the sheet; back to the list on a phone |

---

## 5. States

- **Role gating.** Roles come from `app_metadata` exactly as today (`isCurriculumLead`, `isPhraseReviewer`). A kind your role cannot decide keeps its rows and counts, its rail entry gets a dashed "Lead" or "Reviewer" tag, its pill reads "Lead decides" or "Reviewer decides", and the decision bar shows the status, a lock and who decides. No disabled buttons. The header splits the count (for the owner without review roles: "22 decisions waiting, 14 yours, 8 for another role"). The server stays the authority.
- **Empty.** Per lens: "Nothing waits in phrases. N decided so far." with a button to see what was decided. Search with no match explains what search covers and offers Clear.
- **Loading.** Skeleton rows and a skeleton hero; each source loads on its own, so the first rows appear as soon as any source answers.
- **Error.** Per source: a red strip at the top of the list names the source that failed ("AI drafts could not be loaded") with Retry, while every other kind keeps working. Action errors appear in the decision bar where the reviewer acted, using the existing plain-language mappers.
- **Recording switched off.** An info line (blue, not red) in the hero: "Recording is switched off until the owner turns it on." Generate and Regenerate disappear; takes already made can still be heard and decided; a failed take with recording off says there is nothing to do now. Blend generation off and the AI check off follow the same calm pattern.
- **Undo.** Reversible decisions use the inverse route (approve and withdraw, note and clear, reads-as and clear, phrase approve and revoke, link and unlink). Decisions with no inverse (draft approve or reject, take approve or reject, split review, fulfil, decline) are held for 5 seconds before they are sent, so Undo cancels them (open question 7).

---

## 6. Data and backend

**Recommendation: compose the existing routes client-side behind one hook; add two small read routes; do not build a single inbox endpoint now.**

Why: there are two users and small volumes (760 queue words, up to 200 blend words, tens of phrases and drafts); every source already has its route, its role check and its plain-language errors; the word queue is computed in Studio from `GET /words` with the synced classifier (`lib/words/review/queue.ts`), so a server inbox would have to duplicate it; and per-source loading and errors are a feature (one broken source must not blank the page).

| Source | Route (exists) | Gap |
|---|---|---|
| Spellings, readings, family pool | `GET /words`, `GET /words/review-decisions` | none |
| Blend | `GET /words/blend/review?limit=200` | none |
| Drafts | `GET /curriculum/generation/nodes/:nodeId/drafts` per node | **BE-1** `GET /curriculum/generation/drafts?status=pending&limit=` across nodes (staff, additive). Without it the inbox needs one call per node of every curriculum. |
| Word requests | `GET /curriculum/generation/word-requests?status=open` | none |
| Phrases | `GET /curriculum/reading/phrases` | **BE-2** add an `audio` summary per approved entry (`state: none, in_progress, needs_review, served, failed`, `needs_review_take_id`, `generation_enabled`), additive. Without it, finding takes to hear needs one `GET .../:key/audio` per phrase. |
| Recordings detail | `GET /curriculum/reading/phrases/:key/audio` | none (loaded when the item opens) |
| Families, concepts | `GET /words/families`, `/words/families/:id`, `/words/concepts`, `/words/concepts/:c` | none |
| Letter sounds | audio library query (`category = letter_sounds`) | **BE-3, optional**, a review flag on assets, only if the owner wants letter-sound review (open question 3) |

A server summary endpoint (counts only) can come later if the sidebar badge needs to show on every page without loading the sources.

---

## 7. Build plan

Studio tickets (each small, each behind the old pages until CW-12):

| Ticket | Scope | Depends on |
|---|---|---|
| CW-1 | `/review` route and shell: rail, list, pane layout, container-query context column, responsive breakpoints, URL state; sidebar shows one "Review" item with a count; old routes redirect. | none |
| CW-2 | `lib/review/inbox.ts` (pure, tested): `InboxItem` normalisers per source, needs-decision rules, counts, search with harakat folding, sorts, bulk-safe rule. Reuses `buildReviewQueue`, `awaitsReadsAs`, `matchesFilter`, `draftStatus`, `takeToReview`. | none |
| CW-3 | `useReviewInbox`: composes the existing query hooks, per-source loading and errors, refetch on focus, optimistic decisions, undo (inverse route or 5 s deferred send). | CW-2 |
| CW-4 | Keyboard layer and shortcut sheet; listbox semantics; focus management after each decision; `prefers-reduced-motion`. | CW-1 |
| CW-5 | Spelling and Reading panes, with Family and Concept context cards. | CW-3 |
| CW-6 | Blend pane: split and take rows with focus targets, reason picker, existing mark editor and generate controls; blend lens AI-check tool. | CW-3 |
| CW-7 | AI draft pane with the new read-only config preview (grid_tap and tap_letter_in_word first), word-request fulfil picker and decline; drafts lens tools. | CW-3, BE-1 |
| CW-8 | Phrase and Recording panes: split `PhraseAudio` into status, player, take review and generate parts; served vs new take comparison. | CW-3, BE-2 |
| CW-9 | Library lenses and in-pane Family and Concept editors (move `FamilyEditor`, `ConceptEditor` out of the pages into `components/review/library/`), create dialogs, gap filters. | CW-1 |
| CW-10 | Bulk approve for unflagged fully vowelled spellings: sequential `PUT /words/:id/review`, progress, partial-failure report. | CW-5 |
| CW-11 | Letter sounds listen lens (read-only). | CW-1 |
| CW-12 | Remove the six old pages and their sidebar entries after a week of use; knip. | all |

Backend tickets (additive; v1 app unaffected): **BE-1** cross-node pending drafts list; **BE-2** audio summary on the phrase list; **BE-3** (optional) asset review flag for letter sounds; **BE-4** (optional) a route to mark a word as a practice word, if open question 4 is yes.

---

## 8. Open questions for the owner

1. Name: **Review** (proposed) or Content?
2. Families and Concepts leave the sidebar and live only inside Review. Is that right, or should they keep their own sidebar entries as shortcuts?
3. Letter sounds: listen-only, or do you want a flag or approve state (needs BE-3)?
4. Practice words: should a reviewer be able to mark a word as a practice word from Review (needs BE-4), or keep it in the activity word editor?
5. Wrong harakat on an unused word: fix it directly with the existing `PUT /words/:id/spelling` instead of writing a note for the clean-up run?
6. Who holds which role? Is the owner a curriculum lead and phrase reviewer in `app_metadata`, or only the partner? (It decides whose buttons appear on drafts, phrases and recordings.)
7. Undo for one-way decisions: is a 5-second hold before sending acceptable?
8. Bulk approve: only unflagged fully vowelled spellings (proposed), or also unflagged splits?
9. Arabic face for vowelled text: Noto Sans Arabic (Studio today) or Noto Naskh Arabic (toggle in the concept)?
10. Phrases can only be approved or left pending today. Do you want "reject with a reason" for phrases (needs backend)?
11. Default view per person: should the partner land on Phrases and Recordings and the owner on Drafts, or both on Everything?
12. Default sort for the mixed inbox: most used first (proposed) or waiting longest?

---

## 9. Sample data provenance

No Arabic in the concept was invented. Spellings, ranks, classes, link counts, suspect flags and sibling spellings come from `content-model-audit/14-word-review-queue.csv` (PROD, read-only). Concepts, kinds, picture file names and their library rows come from `content-model-audit/13-picture-concepts-dry-run.md`. The blend splits of كِتَابٌ come from `studio/lib/blendWord/review.test.ts` and `preview.test.ts`. Phrases and sentences come from `mobile-app-v2/src/features/learning/activities/__fixtures__/manifestTables.json`, the `read_and_match` contract fixture, and the backend `phrase-items.json` fixture. Draft configs, checks and word-request descriptions come from the backend `generation/generate-draft.test.ts` and `draft-review.test.ts`. Letter names come from the backend `letters.test.ts`. English glosses, node titles, ages and counts are sample values; pictures are drawn placeholders.
