"use client";

/**
 * ReaderPageFields (content model CM-S10)
 *
 * One page of a book reader source: layout, text and picture. The text is
 * stored with its linked Arabic words as `{{word:<id>}}` tokens; the preview
 * under it shows each token as the word's spelling.
 */

import * as React from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CoverImageField } from "@/components/books-games/CoverImageField";
import { displayStoryText, plainStoryWordIssue, type StoryWordIssue } from "@/lib/books/storyWords";
import {
  READER_LAYOUTS,
  V1_ASPECT_RATIO,
  type PageProblem,
  type ReaderLayout,
  type ReaderPage,
} from "@/lib/books/readerSource";

interface ReaderPageFieldsProps {
  page: ReaderPage;
  index: number;
  count: number;
  onChange: (page: ReaderPage) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  spellingOf: (wordId: string) => string | undefined;
  problems: PageProblem[];
  /** Word issues from the last save, by item path. */
  serverIssues: Map<string, StoryWordIssue[]>;
}

export function ReaderPageFields({
  page,
  index,
  count,
  onChange,
  onMove,
  onRemove,
  spellingOf,
  problems,
  serverIssues,
}: ReaderPageFieldsProps) {
  const textPath = `edition.pages[${index}].text`;
  const altPath = `edition.pages[${index}].illustration.alt`;
  const issues = [...(serverIssues.get(textPath) ?? []), ...(serverIssues.get(altPath) ?? [])];
  const preview = displayStoryText(page.text, spellingOf);
  const ill = page.illustration;

  const setLayout = (layout: ReaderLayout) => {
    const next: ReaderPage = { ...page, layout, ...(layout === "image" ? { text: "" } : {}) };
    if (layout !== "panorama" && next.illustration?.half) {
      next.illustration = { ...next.illustration };
      delete next.illustration.half;
    }
    onChange(next);
  };

  const setIllustration = (patch: Partial<NonNullable<ReaderPage["illustration"]>>) => {
    const base = ill ?? { url: "", alt: "", aspect_ratio: V1_ASPECT_RATIO, fit: "cover" as const };
    const merged = { ...base, ...patch };
    if (!merged.url && !merged.alt) {
      const next = { ...page };
      delete next.illustration;
      onChange(next);
    } else {
      onChange({ ...page, illustration: merged });
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-medium">Page {index + 1}</h4>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move page up">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onMove(1)}
            disabled={index === count - 1}
            aria-label="Move page down"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onRemove} disabled={count === 1} aria-label="Remove page">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Layout</Label>
            <Select value={page.layout} onValueChange={(v) => setLayout(v as ReaderLayout)}>
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {READER_LAYOUTS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {page.layout !== "image" && (
            <div className="space-y-1.5">
              <Label htmlFor={`page-text-${page.id}`}>Text</Label>
              <Textarea
                id={`page-text-${page.id}`}
                value={page.text}
                onChange={(e) => onChange({ ...page, text: e.target.value })}
                rows={3}
                dir="auto"
              />
              {preview !== page.text && (
                <p className="rounded-md bg-muted px-3 py-2 text-sm" dir="auto">
                  {preview}
                </p>
              )}
            </div>
          )}

          {problems.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-destructive" role="alert">
              {problems.map((p) => (
                <li key={p.message}>{p.message}</li>
              ))}
            </ul>
          )}
          {issues.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-destructive" role="alert">
              {issues.map((issue, i) => (
                <li key={i}>{plainStoryWordIssue(issue, spellingOf)}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <CoverImageField
            label="Picture"
            value={ill?.url ?? ""}
            onChange={(url) => setIllustration({ url })}
            aspectClassName="aspect-[4/3]"
          />
          {ill && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`page-alt-${page.id}`}>Picture description</Label>
                <Input
                  id={`page-alt-${page.id}`}
                  value={ill.alt}
                  onChange={(e) => setIllustration({ alt: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`page-ratio-${page.id}`}>Shape (w / h)</Label>
                  <Input
                    id={`page-ratio-${page.id}`}
                    type="number"
                    step="0.01"
                    min="0.05"
                    max="20"
                    value={Number.isFinite(ill.aspect_ratio) ? ill.aspect_ratio : ""}
                    onChange={(e) => setIllustration({ aspect_ratio: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Fit</Label>
                  <Select
                    value={ill.fit ?? "cover"}
                    onValueChange={(v) => setIllustration({ fit: v as "cover" | "contain" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Fill</SelectItem>
                      <SelectItem value="contain">Fit inside</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
