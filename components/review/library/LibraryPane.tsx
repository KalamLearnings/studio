"use client";

/**
 * The Family and Concept editors inside Review's pane (CW-9). They open from
 * a library row, from `f` / `c` or a context card's Edit on any word, or from
 * each other; "Back to <item>" returns to where the reviewer was. The details
 * save with Save in the decision bar; spellings, pictures and links save at once.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Layers, Plus, Shapes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import type { ReviewBank } from "@/lib/hooks/useReviewInbox";
import type { WordCache } from "@/lib/review/actions/words";
import { isTypingTarget } from "@/lib/review/keyboard";
import type { LibraryRef } from "@/lib/review/library";
import type { BankWord } from "@/lib/review/normalise/words";
import type { ConceptDetail, CuratedWord, WordFamilyDetail } from "@/lib/types/wordFamilies";
import { cn } from "@/lib/utils";
import { usePaneCommands } from "../commands";
import { DecisionBar } from "../PaneFrame";
import { Ar, ContextCard, KBD_ON_BUTTON, Kbd, PaneCard, Say, SkeletonBar, StatusPill } from "../parts";
import { BackToListContext } from "../PaneFrame";
import styles from "../review.module.css";
import { useLibraryApi } from "./api";
import { ConnectLocked, useCanConnect } from "./access";
import { ShowConnections } from "../context/ShowConnections";
import type { NodeKey } from "@/lib/connections/keys";
import { ConceptDetailsFields, ConceptFamilies, ConceptPictures, describeConceptError, useConceptForm } from "./ConceptEditor";
import { describeFamilyError, FamilyConceptLinks, FamilyDetailsFields, FamilySpellings, useEditorRun, useFamilyForm } from "./FamilyEditor";
import { conceptKey, familyKey, type ReviewLibrary } from "./useReviewLibrary";

export interface SubviewBack {
  /** What "Back to" names: an item's Arabic, a family's gloss. */
  label: React.ReactNode;
  onBack: () => void;
}

export interface LibraryPaneProps {
  target: LibraryRef;
  back: SubviewBack | null;
  /** Opens another family or concept from this one (Back returns here). */
  onOpen: (ref: LibraryRef) => void;
  library: ReviewLibrary;
  bank: ReviewBank;
  wordCache: WordCache;
  /** The spelling the reviewer came from: highlighted among the members, or offered to join. */
  origin: BankWord | null;
}

/** Only the curation columns a spelling route answers; never the link count. */
function curationPatch(w: CuratedWord): Partial<BankWord> {
  const patch: Partial<BankWord> = {};
  for (const k of ["family_id", "reads_as_id", "reviewed_at", "reviewed_by", "retired_at"] as const) {
    if (k in w) (patch as Record<string, unknown>)[k] = w[k];
  }
  return patch;
}

const notFound = (e: unknown) => e instanceof ApiError && e.status === 404;

export function LibraryPane(props: LibraryPaneProps) {
  return props.target.type === "family" ? (
    <FamilySubview key={`f:${props.target.id}`} {...props} familyId={props.target.id} />
  ) : (
    <ConceptSubview key={`c:${props.target.slug}`} {...props} slug={props.target.slug} />
  );
}

// ---- frame ------------------------------------------------------------------------------

function SubviewFrame({
  kind,
  back,
  main,
  context,
  bar,
}: {
  kind: "Family" | "Concept";
  back: SubviewBack | null;
  main: React.ReactNode;
  context?: React.ReactNode;
  bar: React.ReactNode;
}) {
  const toList = React.useContext(BackToListContext);
  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className={cn(styles.inner, !context && styles.single)}>
          <nav aria-label="Breadcrumb" className="col-span-full flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {toList && (
              <button type="button" onClick={toList} className="text-primary hover:underline min-[860px]:hidden">
                Back to the list
              </button>
            )}
            {back && (
              <>
                <button type="button" onClick={back.onBack} className="inline-flex items-center gap-1 text-primary hover:underline">
                  Back to {back.label}
                </button>
                <span aria-hidden="true">/</span>
              </>
            )}
            <span>{kind}</span>
          </nav>
          <div className="grid min-w-0 content-start gap-3.5">{main}</div>
          {context && (
            <aside aria-label="Context" className={styles.context}>
              {context}
            </aside>
          )}
        </div>
      </div>
      <div className="flex min-h-[58px] flex-none flex-wrap items-center gap-2 border-t bg-card px-4 py-2.5 min-[860px]:px-7">{bar}</div>
    </>
  );
}

function SubviewHero({
  icon,
  kind,
  id,
  idNote,
  latin,
  latinSub,
  arabic,
  connections,
}: {
  /** CG-7: the item on the Words page. */
  connections?: NodeKey;
  icon: React.ReactNode;
  kind: string;
  id: string;
  idNote: string;
  latin: React.ReactNode;
  latinSub?: React.ReactNode;
  arabic?: string | null;
}) {
  return (
    <section className="min-w-0 rounded-xl border bg-card px-5 pb-4 pt-4" aria-label={kind}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          {icon}
          {kind}
        </span>
        <span className="font-mono">{id}</span>
        <span>{idNote}</span>
        {connections && <ShowConnections focus={connections} className="ms-auto text-xs" />}
      </div>
      <div className="mt-1.5 flex min-w-0 flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-2xl font-semibold">{latin}</div>
          {latinSub && <div className="text-[12.5px] text-muted-foreground">{latinSub}</div>}
        </div>
        {arabic && <Ar className="min-w-0 text-[46px] font-medium leading-[1.75] min-[1280px]:text-[54px]">{arabic}</Ar>}
      </div>
    </section>
  );
}

function Loading({ kind, back }: { kind: "Family" | "Concept"; back: SubviewBack | null }) {
  return (
    <SubviewFrame
      kind={kind}
      back={back}
      main={
        <div className="grid gap-2 rounded-xl border bg-card p-5" aria-busy="true">
          <SkeletonBar className="w-[30%]" />
          <SkeletonBar className="h-9 w-1/2" />
          <SkeletonBar className="w-[70%]" />
        </div>
      }
      bar={<DecisionBar status="Loading..." />}
    />
  );
}

function Failed({ kind, back, text, retry }: { kind: "Family" | "Concept"; back: SubviewBack | null; text: string; retry?: () => void }) {
  return (
    <SubviewFrame
      kind={kind}
      back={back}
      main={
        <Say tone="err">
          {text}{" "}
          {retry && (
            <button type="button" className="text-primary hover:underline" onClick={retry}>
              Retry
            </button>
          )}
        </Say>
      }
      bar={<DecisionBar actions={back ? <CloseButton back={back} /> : undefined} />}
    />
  );
}

function CloseButton({ back }: { back: SubviewBack }) {
  return (
    <Button variant="ghost" size="sm" onClick={back.onBack}>
      Close <Kbd className="ms-2">esc</Kbd>
    </Button>
  );
}

/** Keys inside a sub-view: esc goes back, enter in a details field saves, f / c follow the links. */
function useSubviewKeys(opts: { back: SubviewBack | null; save: (() => void) | null; openFamily?: () => boolean; openConcept?: () => boolean }) {
  usePaneCommands((cmd) => {
    const el = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
    const typing = isTypingTarget(el);
    switch (cmd.type) {
      case "escape":
        if (typing || !opts.back) return false;
        opts.back.onBack();
        return true;
      case "confirm":
        // Enter in a one-line details field saves; a textarea keeps its new line.
        if (!typing || el?.tagName.toLowerCase() !== "input" || !opts.save) return false;
        opts.save();
        return true;
      case "openFamily":
        return opts.openFamily?.() ?? true;
      case "openConcept":
        return opts.openConcept?.() ?? true;
      // The inbox's decision keys do nothing here.
      case "approve":
      case "reject":
      case "notReal":
      case "fixHarakat":
      case "toggleSelect":
      case "bulkApprove":
        return true;
      default:
        return false;
    }
  });
}

// ---- family ----------------------------------------------------------------------------

function FamilySubview({ familyId, back, onOpen, library, bank, wordCache, origin }: LibraryPaneProps & { familyId: string }) {
  const api = useLibraryApi();
  const query = useQuery({ queryKey: familyKey(familyId), queryFn: () => api.getWordFamily(familyId) });
  if (query.isPending) return <Loading kind="Family" back={back} />;
  if (query.isError || !query.data) {
    return (
      <Failed
        kind="Family"
        back={back}
        text={notFound(query.error) ? `The family ${familyId} no longer exists.` : `The family could not be loaded: ${describeFamilyError(query.error)}`}
        retry={notFound(query.error) ? undefined : () => void query.refetch()}
      />
    );
  }
  const family = query.data;
  return (
    <FamilyLoaded
      key={family.id + (family.updated_at ?? "")}
      family={family}
      back={back}
      onOpen={onOpen}
      library={library}
      bank={bank}
      wordCache={wordCache}
      origin={origin}
    />
  );
}

function FamilyLoaded({
  family,
  back,
  onOpen,
  library,
  bank,
  wordCache,
  origin,
}: Omit<LibraryPaneProps, "target"> & { family: WordFamilyDetail }) {
  const api = useLibraryApi();
  const canConnect = useCanConnect();
  const onChanged = React.useCallback(() => library.familyChanged(family.id), [library, family.id]);
  const { busy, run } = useEditorRun(onChanged, describeFamilyError);
  const form = useFamilyForm(family, run);
  const pool = bank.words as unknown as CuratedWord[];
  const linked = (library.concepts ?? []).filter((c) => c.families.some((f) => f.id === family.id));
  const headword = family.members.find((m) => m.id === family.headword_id)?.arabic ?? null;
  const save = () => {
    if (canConnect && form.dirty && !busy) void form.save();
  };
  const patchWord = (w: CuratedWord) => wordCache.patchWord(w.id, curationPatch(w));
  // "Add to a family" from a word: offer that word here, unless it is already a member or cannot join.
  const offer =
    origin && origin.family_id !== family.id && !origin.is_pseudo && !origin.retired_at && !family.members.some((m) => m.id === origin.id)
      ? origin
      : null;

  useSubviewKeys({
    back,
    save,
    openConcept: () => {
      if (linked[0]) onOpen({ type: "concept", slug: linked[0].slug });
      return true;
    },
  });

  const main = (
    <>
      <SubviewHero
        icon={<Layers className="h-3.5 w-3.5" aria-hidden="true" />}
        kind="Family"
        connections={`family:${family.id}`}
        id={family.id}
        idNote="The id never changes."
        latin={family.gloss_en ?? family.id}
        latinSub="English gloss: the source for translations. Arabic is never translated."
        arabic={headword}
      />
      {offer && (
        <Say tone="calm" className="mt-0 flex flex-wrap items-center gap-2">
          <span className="flex-1">
            You came from <Ar className="text-lg leading-none">{offer.arabic}</Ar>
            {offer.family_id ? `, which is in the family ${offer.family_id}. Adding it moves it here.` : ", which is in no family yet."}
          </span>
          {canConnect ? <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(
                () => api.setWordFamily(offer.id, family.id).then(patchWord),
                offer.family_id ? `Moved ${offer.arabic} here from ${offer.family_id}` : "Spelling added",
              )
            }
          >
            Add it to this family
          </Button> : <ConnectLocked className="basis-full" />}
        </Say>
      )}
      <PaneCard title="Details">
        <FamilyDetailsFields family={family} form={form} />
      </PaneCard>
      <PaneCard title={`Spellings (${family.members.length})`} aside={<span className="text-xs font-normal text-muted-foreground">review, confirm readings, move or remove</span>}>
        <FamilySpellings
          family={family}
          pool={pool}
          busy={busy}
          run={run}
          currentWordId={origin?.id ?? null}
          onWordChanged={patchWord}
        />
      </PaneCard>
    </>
  );

  const context = (
    <>
      {library.conceptsStatus === "loading" && (
        <ContextCard title="Concept">
          <p className="text-[12.5px] text-muted-foreground">Loading...</p>
        </ContextCard>
      )}
      {linked.map((c) => (
        <ConceptSummaryCard key={c.slug} concept={c} onOpen={() => onOpen({ type: "concept", slug: c.slug })} openKey={c === linked[0] ? "c" : undefined} />
      ))}
      <ContextCard title="Link or unlink">
        <FamilyConceptLinks
          family={family}
          concepts={library.concepts}
          busy={busy}
          run={run}
          onConceptsChanged={() => library.conceptsChanged()}
          onOpenConcept={(slug) => onOpen({ type: "concept", slug })}
        />
        {library.conceptsStatus === "error" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Concepts could not be loaded.{" "}
            <button type="button" className="text-primary hover:underline" onClick={library.retryConcepts}>
              Retry
            </button>
          </p>
        )}
      </ContextCard>
    </>
  );

  const bar = (
    <DecisionBar
      status={
        !canConnect
          ? "Read only. Only a curriculum lead or a phrase reviewer can change a family."
          : busy
            ? "Saving..."
            : form.dirty
              ? "Unsaved changes to the details."
              : "Spelling changes save at once; the details save with Save."
      }
      actions={
        <>
          {back && <CloseButton back={back} />}
          {canConnect && (
            <Button size="sm" disabled={!form.dirty || busy} onClick={save}>
              Save family {form.dirty && <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>enter</Kbd>}
            </Button>
          )}
        </>
      }
    />
  );

  return <SubviewFrame kind="Family" back={back} main={main} context={context} bar={bar} />;
}

function ConceptSummaryCard({ concept, onOpen, openKey }: { concept: ConceptDetail; onOpen: () => void; openKey?: string }) {
  const picture = concept.pictures[0];
  return (
    <ContextCard
      title="Concept"
      aside={
        <button type="button" className="text-[12.5px] normal-case tracking-normal text-primary hover:underline" onClick={onOpen}>
          Open {openKey && <Kbd>{openKey}</Kbd>}
        </button>
      }
    >
      <div className="flex items-center gap-2.5">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border bg-background">
          {picture ? (
            // eslint-disable-next-line @next/next/no-img-element -- asset URLs come from storage
            <img src={picture.url} alt={concept.name.en} className="h-full w-full object-contain" />
          ) : (
            <span className="text-[11px] text-muted-foreground">No picture</span>
          )}
        </div>
        <div className="min-w-0 text-[12.5px]">
          <b className="font-semibold">{concept.name.en}</b> {concept.name.ar && <Ar>{concept.name.ar}</Ar>}
          <div className="font-mono text-xs text-muted-foreground">
            {concept.slug}
            {concept.kind ? ` · ${concept.kind}` : ""}
          </div>
          <div className="text-xs text-muted-foreground">
            {concept.pictures.length} {concept.pictures.length === 1 ? "picture" : "pictures"}
          </div>
        </div>
      </div>
    </ContextCard>
  );
}

// ---- concept ---------------------------------------------------------------------------

function ConceptSubview({ slug, back, onOpen, library }: LibraryPaneProps & { slug: string }) {
  const api = useLibraryApi();
  const query = useQuery({ queryKey: conceptKey(slug), queryFn: () => api.getConcept(slug) });
  if (query.isPending) return <Loading kind="Concept" back={back} />;
  if (query.isError || !query.data) {
    return (
      <Failed
        kind="Concept"
        back={back}
        text={notFound(query.error) ? `The concept ${slug} no longer exists.` : `The concept could not be loaded: ${describeConceptError(query.error)}`}
        retry={notFound(query.error) ? undefined : () => void query.refetch()}
      />
    );
  }
  const concept = query.data;
  return <ConceptLoaded key={concept.id + (concept.updated_at ?? "")} concept={concept} back={back} onOpen={onOpen} library={library} />;
}

function ConceptLoaded({
  concept,
  back,
  onOpen,
  library,
}: {
  concept: ConceptDetail;
  back: SubviewBack | null;
  onOpen: (ref: LibraryRef) => void;
  library: ReviewLibrary;
}) {
  const onChanged = React.useCallback(() => library.conceptsChanged(concept.slug), [library, concept.slug]);
  const { busy, run } = useEditorRun(onChanged, describeConceptError);
  const form = useConceptForm(concept, run);
  const [picking, setPicking] = React.useState(false);
  const canConnect = useCanConnect();
  const save = () => {
    if (form.dirty && form.valid && !busy) void form.save();
  };

  useSubviewKeys({
    back,
    save,
    openFamily: () => {
      const first = concept.families[0];
      if (first) onOpen({ type: "family", id: first.id });
      return true;
    },
  });

  const problems = concept.pictures.filter((p) => p.status !== "active").length;
  const main = (
    <>
      <SubviewHero
        icon={<Shapes className="h-3.5 w-3.5" aria-hidden="true" />}
        kind="Concept"
        connections={`concept:${concept.slug}`}
        id={concept.slug}
        idNote="The slug never changes."
        latin={concept.name.en}
        latinSub={concept.kind ?? "No kind"}
        arabic={concept.name.ar ?? null}
      />
      <PaneCard title="Details">
        <ConceptDetailsFields form={form} />
      </PaneCard>
      <PaneCard
        title={
          <>
            Pictures ({concept.pictures.length})
            {problems > 0 && <StatusPill pill={{ tone: "no", text: `${problems} not active` }} />}
          </>
        }
        aside={
          canConnect ? (
            <Button size="sm" variant="outline" onClick={() => setPicking(true)}>
              <Plus className="me-1 h-3.5 w-3.5" aria-hidden="true" /> Add picture
            </Button>
          ) : undefined
        }
      >
        <ConceptPictures concept={concept} busy={busy} run={run} picking={picking} setPicking={setPicking} />
      </PaneCard>
    </>
  );

  const context = (
    <ContextCard title={`Word families (${concept.families.length})`}>
      <ConceptFamilies
        concept={concept}
        families={library.families}
        busy={busy}
        run={run}
        onOpenFamily={(id) => onOpen({ type: "family", id })}
      />
      {concept.families[0] && (
        <p className="mt-2 text-xs text-muted-foreground">
          <Kbd>f</Kbd> opens {concept.families[0].gloss_en ?? concept.families[0].id}
        </p>
      )}
    </ContextCard>
  );

  const bar = (
    <DecisionBar
      status={busy ? "Saving..." : form.dirty ? "Unsaved changes to the details." : "Pictures and links save at once; the details save with Save."}
      actions={
        <>
          {back && <CloseButton back={back} />}
          <Button size="sm" disabled={!form.dirty || !form.valid || busy} onClick={save}>
            Save concept {form.dirty && <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>enter</Kbd>}
          </Button>
        </>
      }
    />
  );

  return <SubviewFrame kind="Concept" back={back} main={main} context={context} bar={bar} />;
}

/** The pane when a library lens is open and nothing is picked. */
export function LibraryEmpty({ lens, onCreate }: { lens: "lib-families" | "lib-concepts"; onCreate: () => void }) {
  const one = lens === "lib-families" ? "family" : "concept";
  // Creating a family is a connection write (`POST /words/families`); a concept is not.
  const canCreate = useCanConnect() || lens === "lib-concepts";
  return (
    <div className="grid min-h-0 flex-1 place-items-center content-center gap-2 p-12 text-center text-muted-foreground">
      <div className="grid h-14 w-14 place-items-center rounded-full border">
        {lens === "lib-families" ? <Layers className="h-6 w-6 text-secondary" aria-hidden="true" /> : <Shapes className="h-6 w-6 text-secondary" aria-hidden="true" />}
      </div>
      <h2 className="mt-1.5 text-[15px] font-semibold text-foreground">Pick a {one}</h2>
      <p className="max-w-[380px]">
        {canCreate ? "Or create one. " : ""}Families and concepts also open from any word you review (<Kbd>f</Kbd> <Kbd>c</Kbd>).
      </p>
      {canCreate ? (
        <Button variant="outline" size="sm" onClick={onCreate}>
          <Plus className="me-1 h-3.5 w-3.5" aria-hidden="true" /> New {one}
        </Button>
      ) : (
        <ConnectLocked className="max-w-[380px] text-left">New families are read only.</ConnectLocked>
      )}
    </div>
  );
}
