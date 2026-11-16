"use client";

/**
 * The item in the middle of the frame: its kind, the item itself (vowelled
 * Arabic, large), its state, and links out (Review, the lesson builder).
 * "Play" is the old Words page's one working action, moved here.
 */

import * as React from "react";
import { ExternalLink, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { familyLabel, type Graph } from "@/lib/connections/graph";
import { NODE_KINDS } from "@/lib/connections/kinds";
import { idOfKey, typeOfKey, type NodeKey } from "@/lib/connections/keys";
import { DEFAULT_URL_STATE, reviewUrlSearch } from "@/lib/review/url";
import { awaitsReadsAs, vowelStatus } from "@/lib/words/family";
import { asReadsRow } from "@/lib/connections/graph";
import { useEditing } from "./extension";
import { Ar, Badge, KIND_COLOR, KindIcon, LockIcon, Thumb } from "./parts";
import s from "./words.module.css";

const reviewHref = (o: Partial<typeof DEFAULT_URL_STATE>) =>
  `/review${reviewUrlSearch({ ...DEFAULT_URL_STATE, status: "all", ...o })}`;

function LinkOut({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button asChild variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs">
      <a href={href}>
        {children}
        <ExternalLink aria-hidden="true" className="h-3 w-3" />
      </a>
    </Button>
  );
}

function PlayButton({ url }: { url: string }) {
  const play = React.useCallback(() => {
    new Audio(url).play().catch(() => toast.error("The recording could not be played."));
  }, [url]);
  return (
    <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs" onClick={play}>
      <Volume2 aria-hidden="true" className="h-3.5 w-3.5" />
      Play
    </Button>
  );
}

const HARAKAT = { full: "full harakat", partial: "some harakat", unvowelised: "no harakat" } as const;

export const FocusCard = React.forwardRef<HTMLElement, { graph: Graph; focus: NodeKey }>(
  function FocusCard({ graph, focus }, ref) {
    const editing = useEditing();
    const type = typeOfKey(focus);
    const id = idOfKey(focus);
    const kind = NODE_KINDS[type];
    let body: React.ReactNode = null;
    const badges: React.ReactNode[] = [];
    const links: React.ReactNode[] = [];
    let heading = kind.name;

    if (type === "word") {
      const w = graph.words.get(id)!;
      const fam = w.familyId ? graph.families.get(w.familyId) : undefined;
      heading = w.arabic;
      body = (
        <>
          <Ar className="block !text-center text-[52px] leading-[1.85]">{w.arabic}</Ar>
          <div className="text-[13px] text-muted-foreground">
            {fam ? `a spelling of "${familyLabel(fam)}"` : w.isPseudo ? "a drill (practice) spelling" : "no family yet"}
          </div>
          {(w.english || w.transliteration) && (
            <div className="mt-1 text-[13px]">
              {[w.english, w.transliteration ? `(${w.transliteration})` : null].filter(Boolean).join(" ")}
            </div>
          )}
        </>
      );
      badges.push(<Badge key="h">{HARAKAT[vowelStatus(w.arabic)]}</Badge>);
      if (!w.isPseudo) badges.push(w.reviewed ? <Badge key="r" tone="ok">reviewed</Badge> : <Badge key="r" tone="warn">not reviewed</Badge>);
      if (w.isPseudo) badges.push(<Badge key="d">drill</Badge>);
      badges.push(<Badge key="u">{`${w.usageCount} activity link${w.usageCount === 1 ? "" : "s"}`}</Badge>);
      if (w.category) badges.push(<Badge key="c">{w.category}</Badge>);
      if (w.audioUrl) links.push(<PlayButton key="play" url={w.audioUrl} />);
      links.push(
        <LinkOut key="rv" href={reviewHref({ lens: "spelling", item: `spelling:${id}` })}>
          {w.reviewed ? "Open in Review" : "Review this spelling"}
        </LinkOut>,
      );
      if (awaitsReadsAs(asReadsRow(w))) {
        links.push(
          <LinkOut key="rd" href={reviewHref({ lens: "reading", item: `reading:${id}` })}>
            Confirm its reading in Review
          </LinkOut>,
        );
      }
      if (!w.familyId && !w.isPseudo && !w.retired) {
        links.push(
          <LinkOut key="sg" href={reviewHref({ lens: "link", item: `link:family:${id}` })}>
            Suggested family
          </LinkOut>,
        );
      }
    } else if (type === "family") {
      const f = graph.families.get(id)!;
      const head = f.headwordId ? graph.words.get(f.headwordId) : undefined;
      const pic = graph.pictureOfFamily(id);
      const n = graph.membersOf(id).length;
      heading = familyLabel(f);
      body = (
        <>
          {pic && <Thumb url={pic.url} alt="" size={120} className="mx-auto mt-1.5 block" />}
          {head && <Ar className="block !text-center text-[52px] leading-[1.85]">{head.arabic}</Ar>}
          <div className="text-[22px] font-semibold">{f.gloss || "(no meaning yet)"}</div>
          <div className="text-[13px] text-muted-foreground">
            word family <code>{f.id}</code> · {n} spelling{n === 1 ? "" : "s"}
          </div>
        </>
      );
      if (!head) badges.push(<Badge key="h" tone="warn">no dictionary form</Badge>);
      links.push(
        <LinkOut key="rv" href={reviewHref({ lens: "lib-families", family: id })}>
          Spellings to review
        </LinkOut>,
      );
    } else if (type === "concept") {
      const c = graph.concepts.get(id)!;
      const pic = graph.picturesOfConcept(id)[0];
      heading = c.name.en;
      body = (
        <>
          {pic && <Thumb url={pic.url} alt="" size={120} className="mx-auto mt-1.5 block" />}
          <div className="mt-2 text-[22px] font-semibold">{c.name.en}</div>
          {c.name.ar && <Ar className="block !text-center text-[28px]">{c.name.ar}</Ar>}
          <div className="text-[13px] text-muted-foreground">
            meaning <code>{c.slug}</code>
            {c.kind ? ` · ${c.kind}` : ""}
          </div>
        </>
      );
      links.push(
        <LinkOut key="rv" href={reviewHref({ lens: "lib-concepts", concept: id })}>
          Open in Review
        </LinkOut>,
      );
    } else if (type === "picture") {
      const p = graph.pictures.get(id)!;
      const c = graph.conceptsOfPicture(id)[0];
      heading = c ? `Picture of ${c.name.en}` : "Picture";
      body = (
        <>
          <Thumb url={p.url} alt={c?.name.en ?? p.label ?? "picture"} size={160} className="mx-auto mt-1.5 block" />
          <div className="break-all text-[13px] text-muted-foreground">{p.url.split("/").slice(-2).join("/")}</div>
        </>
      );
      badges.push(<Badge key="s" tone={p.status === "active" ? undefined : "warn"}>{p.status}</Badge>);
      if (!c) {
        links.push(
          <LinkOut key="sg" href={reviewHref({ lens: "link", item: `link:picture:${id}` })}>
            Suggested meaning
          </LinkOut>,
        );
      }
    } else if (type === "letter") {
      const l = graph.letters.get(id)!;
      heading = l.name;
      body = (
        <>
          <Ar className="block !text-center text-[72px] leading-[1.85]">{l.glyph}</Ar>
          <div className="text-[22px] font-semibold">{l.name}</div>
          <div className="text-[13px] text-muted-foreground">
            letter <code>{l.id}</code>
          </div>
        </>
      );
      links.push(
        <LinkOut key="rv" href={reviewHref({ lens: "letter", q: l.name })}>
          Its sounds in Review
        </LinkOut>,
      );
    }

    const handMade = type !== "letter" && type !== "activity";
    return (
      <section ref={ref} className={s.focus} style={{ ["--kc" as string]: KIND_COLOR[type] }} aria-label={`${kind.name} in focus`} tabIndex={-1} data-focus-card>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: KIND_COLOR[type] }}>
          <KindIcon type={type} /> {kind.name}
        </div>
        <h2 className="sr-only">
          {kind.name}: {heading}
        </h2>
        {body}
        {badges.length > 0 && <div className="mt-2 flex flex-wrap justify-center gap-1.5">{badges}</div>}
        {editing?.focusExtra?.(focus)}
        {links.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5 border-t pt-3">
            {links}
          </div>
        )}
        {!handMade && (
          <div className="mt-2.5 text-xs text-muted-foreground">
            <LockIcon className="mr-1" />
            Its connections are worked out, not drawn by hand.
          </div>
        )}
      </section>
    );
  },
);
