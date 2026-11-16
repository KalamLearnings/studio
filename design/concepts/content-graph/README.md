# Connections: see and build the content graph (concept)

Concept only. No Studio code changes. Open `index.html` from disk (it is self-contained; only the Noto Naskh Arabic font comes from Google Fonts, as in Studio, and it falls back to the system Arabic face offline). Works at 1280 to 1600 px; under 1180 px the gap list moves above the canvas, and under 900 px the frame becomes one column with no connector lines.

Proposed name: **Connections** (route `/connections`, one sidebar item). It replaces the Families and Concepts pages. Review stays the place for approve and reject; every item here links to Review, and Review gets a "Show connections" link back (`/connections?focus=word:<id>`).

**What to try**
- Start: the word family "book". Click any chip to re-centre on it. The breadcrumb trail above remembers the path; Backspace or Alt+← goes back.
- Left rail, "Missing connections": open one, click an item, and see the empty box (amber ring) that says what is missing.
- Drag anything (a chip, a search result, a gap item, an "All words" card) onto the item in the middle. The dialog offers only the connections that make sense, and explains refusals in plain words. Example: drag جَمَلُ onto the concept "Camel". The answer is "Concepts connect to a word family, not to one spelling", with a "Start a family for it" button.
- "+ Add" on a box opens a picker for that kind of connection only. Refused candidates are greyed, with the reason (for example, the reading of بيت: two different vowelled spellings fit; you choose).
- Hover a chip in an editable box: × removes the link. Every change has Undo in its toast.
- "All words": every family as a card (picture, dictionary form, other spellings), then the loose spellings, the concepts no word names, and the drill spellings.
- "Kinds of connection": the legend, with every kind explained in one sentence.

**Sample data.** Spellings (43 `curriculum_words` rows), letters (`letters`), the activities that use those spellings (76 `curriculum_activities` with node, topic and level titles, through the `activity_words` projection) and 17 pictures (thumbnails of the real files in `curriculum-images/assets/...`) were read from PROD read-only on 2026-11-16. Only content tables were read. Word families, concepts and their links do not exist on PROD yet; the page seeds them from the dry-run proposals `content-model-audit/10-word-families-dry-run.md` (CM-D2) and `13-picture-concepts-dry-run.md` (CM-C4). The family ids are English slugs I gave them (the dry run proposes none). No Arabic was invented: every Arabic string is a PROD row or a PROD instruction.

---

## 1. Model inventory (backend `dev` at `85cac40b`)

### Node types

| Node | Table | Shown here | Notes |
|---|---|---|---|
| Spelling | `curriculum_words` (+ `family_id`, `reads_as_id`, `retired_at`, `reviewed_at/by` on dev) | yes | One row per exact spelling (D3). `is_pseudo` marks a drill |
| Word family | `word_families` (`id` slug, `headword_id`, `gloss_en`, `notes`) | yes | What the spellings of one word share |
| Concept | `concepts` (`slug`, `name {en, ar?}`, `kind` from `CONCEPT_KINDS`) | yes | The thing in the world |
| Picture | `assets` with `media = image` | yes | Asset registry (D8); status gates linking |
| Letter | `letters` (34 on PROD, + `ta_marbuta`, `alif_maqsura` on dev) | yes, read only | |
| Activity | `curriculum_activities` → `curriculum_nodes` → `curriculum_topics` → `curricula` | yes, read only | Path shown as text, not as nodes |
| Book unit | `book_reader_units` (dev) | not in sample | Joins through `content_index` (`owner_type = book_unit`) |
| Phrase | `phrase_reviews` (ordered word ids) | no | Lives in Review |
| Audio take | `audio_takes` | as a badge only | Recordings are decisions; Review owns them |
| Teaching unit / skill | `skill_graph.ts`, `teaching_targets` | no | Later lens (open question 5) |

### Edge types

| Edge (plain name) | Stored as | Editable here? | Route | Rules (backend code) |
|---|---|---|---|---|
| **Spelling of** (spelling → family) | `curriculum_words.family_id` | **yes** | `PUT /words/:wordId/family` `{familyId | null}` | One family per spelling (moving it takes it out of the old one). Not a drill (`WORD_IS_PSEUDO`), not retired (`WORD_RETIRED`). The headword cannot leave (`WORD_IS_HEADWORD`). A spelling and the rows it is read as / read from must stay in one family (`READS_AS_FAMILY_MISMATCH`) |
| **Dictionary form** (family → headword) | `word_families.headword_id` | **yes** | `PATCH /words/families/:id` (`POST` on create) | Headword is a member or has no family (`WORD_IN_OTHER_FAMILY`), and passes the member rules |
| **Is read as** (unvowelled → vowelled spelling) | `curriculum_words.reads_as_id` | **yes** | `PUT /words/:wordId/reads-as` `{readsAsId | null}` | `READS_AS_SELF`, `_SOURCE_VOWELLED`, `_TARGET_NOT_VOWELLED`, `_SKELETON_MISMATCH` (same letters), `_CHAIN` (target not itself read as another; a row others read as cannot be read as another), `_TARGET_RETIRED`, `_TARGET_PSEUDO`, `_FAMILY_MISMATCH` |
| **Names** (family → concept, `depicts`) | `content_links` | **yes** | `PUT` / `DELETE /words/families/:familyId/concepts/:concept` | Only `family → concept` (`CONTENT_LINK_RELATIONS`). Many to many. Idempotent |
| **Picture of** (concept → picture, `illustration`) | `content_asset_links` | **yes** | `PUT` / `DELETE /words/concepts/:concept/pictures/:assetId` | Asset must be an image (`ASSET_MEDIA_MISMATCH`) with a linkable status (`ASSET_NOT_LINKABLE`). Labels an unlabelled file |
| **Own picture** (family → picture) | `content_asset_links` | **yes** | `PUT` / `DELETE /words/families/:familyId/pictures/:assetId` | Same as above |
| Letters in it (spelling → letter) | derived from the spelling (`letter_composition`, index rows `via` the word) | no | change the spelling: `PUT /words/:wordId/spelling` | Refused when an activity uses the word (`WORD_IN_USE`) or it has a split (`WORD_HAS_BLEND`) |
| Used in (activity → spelling / letter / concept / asset) | `content_index`, rebuilt on every activity save (`activity_words` is its projection) | no | the lesson builder | |
| Appears in story (book unit → spelling) | `content_index` (`book_unit`, role `exposure`) | no | the book editor (`{{word:<id>}}` tokens) | |
| Part of (activity → node → topic → level) | FKs | no | the curriculum builder | |
| Focus / review of (scope → unit key) | `teaching_targets` | no | the scope save | |
| Prerequisite / child of (unit → unit) | `skill_graph.ts` (code) | no | pull request, curriculum lead review | |
| Phrase made of (phrase → spellings) | `phrase_reviews.word_ids` | no | Review | |

Reads used by the page: `GET /words/families`, `GET /words/families/:id`, `GET /words/concepts`, `GET /words/concepts/:concept`, `GET /words/families/:id/concepts`, `GET /words` (curated rows), `GET /words/:wordId` (with linked activities), `GET /books/admin/words/:wordId/books`, `GET /letters/list`.

---

## 2. Research summary

**Explorers.** The tools that non-specialists actually use do not start with the whole graph. Neo4j Bloom starts from a search phrase and expands a node on request ([search bar](https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/search-bar/), [scene](https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/bloom-scene-interactions/)). Obsidian's local graph shows one note and its neighbours, with a depth slider ([help](https://obsidian.md/help/plugins/graph)). Kumu has "Focus" (an item plus N degrees) and "Showcase" (fade the rest), and styles items by type ([focus](https://docs.kumu.io/guides/focus), [showcase](https://docs.kumu.io/guides/showcase), [decorate](https://docs.kumu.io/guides/decorate)). TheBrain is the closest model: a fixed "plex" with parents above, children below and jumps to the side; a click re-centres, and an outline lists the same links as text ([help](https://help.thebrain.com/androidphone/thoughtrelationships.html)). Linkurious sells type-based default styles to non-technical users ([styles](https://doc.linkurious.com/admin-manual/latest/styles/)); I found only vendor material. Gephi is the contrast: an analyst's tool, where ForceAtlas2 runs continuously and is tuned by hand ([Jacomy et al. 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC4051631)). Tana and Notion make a relation a typed field you fill from a search picker, with no drawing at all ([Tana fields](https://www.tana.inc/docs/fields), [Notion relations](https://www.notion.com/help/relations-and-rollups)).

**Language graphs.** Visuwords gives each relation type its own legend entry ([about](https://visuwords.com/about)). ConceptNet term pages are lists grouped by relation ("is a type of …"), not drawings ([example](https://conceptnet.io/c/en/browse)). Arabic morphology tools are lists or tables. The Quranic Arabic Corpus word-by-word pages show each word's gloss and morphology, and its dictionary groups words under root and lemma ([word by word](https://corpus.quran.com/wordbyword.jsp), [notes](https://corpus.quran.com/releasenotes.jsp)); also see the [Parallel Quran lexicon](https://parallelquran.com/lexicon/) and [QUL morphology](https://qul.tarteel.ai/resources/morphology/76). I found no Arabic tool that uses a node-link drawing.

**Patterns.** "Search, show context, expand on demand" ([van Ham & Perer, TVCG 2009](https://dig.cmu.edu/publications/2009-doigraphs.html)) is the research form of what these tools do. The practice they share:
- start from one item;
- show its neighbourhood, grouped and typed by colour and icon, with labelled edges;
- expand only when asked.

React Flow's own guide suggests the same: show a few nodes and reveal more on demand ([performance](https://reactflow.dev/learn/advanced-use/performance)). Drag-to-connect exists as connection handles in React Flow ([handles](https://reactflow.dev/learn/customization/handles)) and as Cytoscape edgehandles. Notion and Tana show the alternative: connect by picking from a search box.

**What fails.** Force layouts on a dense graph turn into "an unintelligible hairball" ([Ma & Muelder 2013](https://ucilnica2223.fri.uni-lj.si/pluginfile.php/1147/course/section/4652/Ma%20and%20Muelder%20-%20Large-scale%20graph%20visualization%20and%20analytics%2C%202013.pdf), [Kobourov](https://arxiv.org/pdf/1201.3011)). If the layout re-runs after every edit, the user loses their mental map; if positions are pinned, the layout decays ([Frishman & Tal 2008](https://www.ee.technion.ac.il/~ayellet/Ps/tvcg08_FrishmanTal.pdf)). For an editor, every reshuffle costs them their bearings. The evidence on node-link diagrams for lay readers is mixed: matrices beat node-link above about 20 nodes in [Ghoniem et al. 2004](https://opact.sdu.edu.tr/vufind/SummonRecord/FETCH-LOGICAL-c388t-17534b10dd9b1862d94105b93cc92e657f28c5d8e3bcb5b50e82610a23c46f6a3), while node-link did better with general participants in [Okoe et al.](https://www.cambridge.org/core/journals/network-science/article/understanding-nodelink-and-matrix-visualizations-of-networks-a-largescale-online-experiment/C293136C4761F09D4C2C328E2BC19287). I found **no controlled study** that compares node-link diagrams with plain grouped lists for non-experts. The case for grouped lists rests on precedent (TheBrain, ConceptNet, Notion), not on measurement.

**Libraries** (npm versions checked 2026-11-16):

| | Render | Hundreds to a few thousand nodes | Editable edges | Stable layout | Accessibility | Licence |
|---|---|---|---|---|---|---|
| React Flow `@xyflow/react` 13.0.1 | DOM + SVG | fine at hundreds; thousands need hiding | built in (handles, `onConnect`) | you set positions | best: focusable DOM, ARIA, keyboard ([a11y](https://reactflow.dev/learn/advanced-use/accessibility)) | MIT |
| Cytoscape.js 3.35.0 (+ fcose, edgehandles) | canvas | good | extension | fcose with constraints | weak (canvas) | MIT |
| Sigma.js 4.0.6 + graphology | WebGL | best at large scale | do it yourself | ForceAtlas2 or precomputed | weak (WebGL) | MIT |
| d3-force 3.0.1 | none | fine | do it yourself | jitters unless pinned | depends on the renderer | ISC |
| elkjs 0.12.1 | none (layout only) | fine | n/a | deterministic, interactive mode | n/a | EPL-2.0 or GPL-3.0+ |

---

## 3. Design

**Summary**
1. Search first. You never see the whole graph as a drawing. You type Arabic (with or without harakat) or English, and one item opens in the middle.
2. A fixed frame around the item, in the TheBrain style. Each kind of connection has a fixed place: the family above, readings on the left, concept and pictures on the right, letters and activities below. Nothing moves by itself, so nothing jitters.
3. One line per box, not one per item. Items sit inside a labelled box, so a family with 30 spellings is one line and a box, never a hairball.
4. Every box says what it is in plain words ("Names. This word names this thing. Every spelling in the family shows the thing's pictures."). Solid lines are connections you make; dashed lines with a lock are worked out from elsewhere, and the box says where to change them.
5. Click any item to re-centre. A breadcrumb trail keeps the path.
6. Connect two ways. Drag anything onto the middle card (or onto a box), or use "+ Add" on a box. Only the kinds of connection that make sense are offered.
7. Refusals are sentences, not codes, and when there is a better move the dialog offers it: "Connect 'book' instead", "Start a family for it", "Open 'bear'".
8. Gaps are first class. The rail counts spellings with no family, readings to confirm, families that name no concept, concepts with no picture, and concepts no word names. In the frame, a missing box gets an amber ring.
9. "All words" is the readable whole view: one card per word family with picture, dictionary form and spellings, plus the loose spellings and the orphan concepts.
10. Arabic is always large, vowelled Noto Naskh in isolated RTL runs inside the LTR app. No Arabic is ever typed here; spellings come from the word bank and Review.

**Rationale.**
- **Families and concepts as first-class nodes.** Families and concepts were two pages because they are two tables. Here a family and its concept are one click apart, and the dialog follows the rule that pictures attach to the family, so a person cannot make the common mistake (a picture on one spelling).
- **No free-form node-link canvas.** Our graph is shallow and strongly typed: spelling → family → concept → picture, with activities and letters hanging off. A fixed frame says more than a force layout with a legend would, and it is accessible by construction: the boxes are headed lists of buttons, and the lines are decoration (`aria-hidden`).
- **Undo, not "are you sure?".** Every write is reversible with one route call (the backend already has the inverse of each).
- **Approvals stay in Review.** "Not reviewed" badges and "Review this spelling" links send you there.

**Rules shown in plain words** (Studio's `familyErrorText` messages, extended): one family per spelling (a move says "It leaves 'bear'"), drills have no family, the headword cannot leave, a reading needs the same letters and full harakat, no reading chains, pictures belong to a concept or family, letters and activity use are worked out, two families cannot be merged yet, and concepts are not linked to each other yet.

## 4. Library recommendation

**No graph library for v1.** The frame is plain React and CSS grid, plus one SVG overlay that draws a curve per box from DOM rects (about 40 lines in the concept). Drag-to-connect uses `@dnd-kit/core`, which Studio already ships, so keyboard dragging comes for free. The "+ Add" picker covers keyboard and screen-reader users anyway. This keeps full accessibility, stable positions and no new dependency.

If a free-form, depth-2 or larger "explore" canvas is wanted later, use **React Flow (`@xyflow/react`, MIT)** for its DOM nodes, ARIA and built-in handles. Give it fixed positions computed by a small radial function, not a live force simulation. Avoid Cytoscape and Sigma for an editing surface (canvas or WebGL, weak accessibility). They are fine for a read-only whole-library overview if one is ever needed, which this design does not. Skip elkjs: the layout is not needed, and its EPL-2.0 licence would need a review.

## 5. Build plan (tickets)

Studio (`studio`):
- **CG-1 Route and shell.** `/connections`, sidebar item, URL state `?focus=<type>:<id>&view=all`, trail in history. Remove the Families and Concepts sidebar entries (the routes redirect to `/connections?focus=family:<id>` / `concept:<slug>`).
- **CG-2 Pure neighbourhood model** (`lib/connections/`): `groups(focus, data)`, `options(a, b)` and the plain-words refusal map, ported from the concept with unit tests over the backend codes. The backend still decides; this only chooses what to offer.
- **CG-3 Focus frame.** Grid slots, group boxes, SVG wires, narrow layout; size matrix 900 / 1280 / 1600.
- **CG-4 Search.** One index over families, curated words, concepts, pictures, letters and activities. Arabic folding (harakat, hamza seats, ة/ه, ى/ي) shared with Review's search.
- **CG-5 Connect.** Drop targets with dnd-kit, the connect dialog, the per-box picker, Undo toasts, and wiring to the existing routes (§1).
- **CG-6 Gaps rail and "All words".**
- **CG-7 Review links both ways.** Item links to `/review?item=spelling:<id>`, `?family=`, `?concept=`, and Review's context cards get "Show connections".
- **CG-8 Retire** `app/(dashboard)/families` and `concepts` (with CW-12).

Backend gaps (`kalam-readers-backend`):
- **B-1 Usage read.** `GET /content/usage?unit=word:<id>|letter:<id>|concept:<slug>` → activities (with node, topic and level titles) and book units from `content_index`. Today Studio would have to use `activity_words` per word or fetch whole curricula.
- **B-2 One neighbourhood read** (optional, for speed): `GET /content/graph?focus=<key>` returning the focus and its one-hop neighbours with labels, so the frame is one request.
- **B-3 Family merge.** No route moves every spelling and its links from one family to another and retires the empty one. Today it is spelling by spelling, and the family row stays.
- **B-4 Family retire.** `word_families` has no `retired_at`, and there is no delete route (nothing is deleted, R8).
- **B-5 Asset list for pictures.** The picker needs `GET /assets?media=image&status=active` with label search (check whether `/assets/library` already covers it).
- **B-6 Change audit.** Links have `created_at` but no `created_by`; a "who connected this" line (and a history) needs it on `content_links`, `content_asset_links` and the curation columns.
- **B-7 Set `is_pseudo` from Studio.** Already a Review gap (blend review proposal), and it matters here because drills are refused a family.

## 6. Open questions

1. **Name.** Is "Connections" right, or "Words"? The page is mostly about words, but concepts and pictures sit in it too.
2. **Plain names for the nodes.** "Spelling", "Word family" and "Concept" match today's Studio. Would "Word" (for family) and "Thing" (for concept) read better for a native-speaker reviewer?
3. **Who may connect?** All staff, as the routes allow today? Or do family and reading edits need the curriculum lead, given that they change what children hear?
4. **Concept to concept relations** ("a kind of", "part of": a cat is an animal). Not in the model. Is it wanted for the AI or for authoring?
5. **Skill-graph lens.** Should the same frame open a letter, haraka or rule and show its prerequisites and the topics that teach it (read only, from `skill_graph.ts` and `teaching_targets`)? It fits the frame, but it is a different audience.
6. **Homographs.** جمل has three vowelled candidates (جَمَلُ, جُمَلُ, جَمُلَ). The concept lets the person pick the reading. Should the page also prompt a split into separate families when one skeleton has several meanings?
7. **Headword without full harakat.** The backend allows it; the concept only warns. Should it be refused?
8. **Picture on a family.** The route exists, but the design prefers concept pictures. Keep the family-picture path visible, or hide it behind "more"?
