"use client";

/**
 * Small presentational parts every Review pane shares: Arabic text, key caps,
 * the status pill, the kind tag, the hero's "say" line and the cards.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { InboxKind, Pill } from "@/lib/review/inbox";

/**
 * Arabic text: an isolated RTL span in the vowelled face (Noto Naskh Arabic,
 * owner answer 9), so it never reorders the LTR text around it.
 */
export function Ar({ children, className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span lang="ar" dir="rtl" className={cn("font-naskh leading-[1.9] [unicode-bidi:isolate]", className)} {...rest}>
      {children}
    </span>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-b-2 border-border bg-background px-1 font-mono text-[10.5px] font-semibold leading-none text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Key caps inside a coloured button take the button's colour. */
export const KBD_ON_BUTTON = "border-current bg-transparent text-inherit opacity-75";

/** The kind colours: Studio's palette (primary, accent, assessment purple, star yellow, pink). */
export const KIND_COLORS: Record<InboxKind, string> = {
  spelling: "hsl(211 65% 60%)",
  reading: "hsl(195 60% 55%)",
  blend: "hsl(178 50% 48%)",
  draft: "hsl(252 45% 66%)",
  request: "hsl(282 35% 62%)",
  phrase: "hsl(160 55% 48%)",
  recording: "hsl(340 60% 66%)",
  letter: "hsl(45 85% 58%)",
  link: "hsl(24 70% 58%)",
  meaning: "hsl(100 40% 50%)",
  label: "hsl(5 60% 62%)",
};

export function KindDot({ kind, className }: { kind: InboxKind; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2 w-2 shrink-0 rounded-[3px]", className)}
      style={{ backgroundColor: KIND_COLORS[kind] }}
    />
  );
}

const PILL_TONES: Record<Pill["tone"], string> = {
  todo: "bg-warning/15 text-[hsl(30_80%_35%)] dark:text-warning",
  ok: "bg-success/15 text-[hsl(140_50%_32%)] dark:text-[hsl(140_45%_60%)]",
  no: "bg-destructive/15 text-[hsl(0_60%_45%)] dark:text-[hsl(0_70%_70%)]",
  info: "bg-info/15 text-info",
  neutral: "border-border text-muted-foreground",
  gate: "border-dashed border-border font-medium text-muted-foreground",
};

export function StatusPill({ pill, className }: { pill: Pill; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-transparent px-2 py-px text-[11px] font-semibold",
        PILL_TONES[pill.tone],
        className,
      )}
    >
      {pill.text}
    </span>
  );
}

/** A plain-language line in the hero: neutral, a warning, calm information, or an error. */
export function Say({
  tone = "plain",
  children,
  className,
}: {
  tone?: "plain" | "warn" | "calm" | "err";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "err" ? "alert" : undefined}
      className={cn(
        "mt-2.5 rounded-lg px-3 py-2 text-[13.5px]",
        tone === "plain" && "bg-muted/60",
        tone === "warn" && "border border-warning/30 bg-warning/10",
        tone === "calm" && "border border-info/25 bg-info/10",
        tone === "err" && "border border-destructive/35 bg-destructive/10",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PaneCard({
  title,
  aside,
  children,
  className,
}: {
  title: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-xl border bg-card px-4 py-3.5", className)}>
      <h3 className="mb-2.5 flex items-center justify-between gap-2 text-[13px] font-semibold">
        <span className="flex min-w-0 items-center gap-2">{title}</span>
        {aside}
      </h3>
      {children}
    </section>
  );
}

/** A context column card: smaller, with an uppercase label. */
export function ContextCard({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border bg-card px-3.5 py-3">
      <h3 className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        <span>{title}</span>
        {aside}
      </h3>
      {children}
    </section>
  );
}

export function Chip({ tone, children }: { tone?: "flag" | "pass" | "fail" | "note"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 text-xs",
        tone === "flag" && "border-warning/45 text-[hsl(30_80%_35%)] dark:text-warning",
        tone === "pass" && "text-[hsl(140_50%_32%)] dark:text-[hsl(140_45%_58%)]",
        tone === "fail" && "border-destructive/50 text-[hsl(0_60%_45%)] dark:text-[hsl(0_70%_70%)]",
        tone === "note" && "text-info",
      )}
    >
      {children}
    </span>
  );
}

/** The skeleton bar; still when the reviewer prefers reduced motion. */
export function SkeletonBar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <i className={cn("block h-3 animate-pulse rounded bg-muted motion-reduce:animate-none", className)} style={style} />;
}
