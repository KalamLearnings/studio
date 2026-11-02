"use client";

import * as React from "react";
import { ChevronRight, Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { resolveAudioUrl } from "@/lib/services/audioService";
import type {
  ActivityTranslation,
  TranslationStatus,
} from "@/lib/api/localization";
import {
  translationsErrorMessage,
  useActivityTranslations,
  useLocalizationLocales,
  useRetryTranslation,
} from "@/lib/hooks/useLocalization";

const RTL_LOCALES = new Set(["ar", "ur", "fa", "he", "ps", "sd", "ug", "ckb"]);

const STATUS_BADGE: Record<
  TranslationStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  ready: { label: "Ready", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
  stale: { label: "Out of date", variant: "outline" },
  missing: { label: "Not queued", variant: "outline" },
};

const RETRYABLE: TranslationStatus[] = ["failed", "stale", "missing"];

interface TranslationsPanelProps {
  activityId: string;
}

export function TranslationsPanel({ activityId }: TranslationsPanelProps) {
  const [open, setOpen] = React.useState(false);
  const locales = useLocalizationLocales();
  const translations = useActivityTranslations(activityId, open);

  const activeLocaleCount =
    locales.data?.filter((l) => l.status === "backfilling" || l.status === "live")
      .length ?? 0;

  if (activeLocaleCount === 0) return null;

  const rows = translations.data?.locales;
  const summary = rows
    ? `${rows.filter((r) => r.status === "ready").length} of ${rows.length} ready`
    : `${activeLocaleCount} ${activeLocaleCount === 1 ? "language" : "languages"}`;

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 gap-1 px-2"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronRight
          className={cn("h-4 w-4 transition-transform", open && "rotate-90")}
        />
        <span>Translations</span>
        <span className="font-normal text-muted-foreground">· {summary}</span>
      </Button>
      {open && (
        <TranslationsContent
          activityId={activityId}
          query={translations}
        />
      )}
    </div>
  );
}

function TranslationsContent({
  activityId,
  query,
}: {
  activityId: string;
  query: ReturnType<typeof useActivityTranslations>;
}) {
  const retry = useRetryTranslation(activityId);
  const [playingCode, setPlayingCode] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  React.useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  const togglePlay = (translation: ActivityTranslation) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingCode === translation.code) {
      audio.pause();
      return;
    }
    const url = resolveAudioUrl(translation.audioUrl);
    if (!url) return;
    audio.pause();
    audio.src = url;
    setPlayingCode(translation.code);
    audio.play().catch(() => setPlayingCode(null));
  };

  const { data, isLoading, isError, error } = query;

  return (
    <div className="mt-1 space-y-3 rounded-md border p-3">
      <audio
        ref={audioRef}
        onEnded={() => setPlayingCode(null)}
        onPause={() => setPlayingCode(null)}
        onError={() => setPlayingCode(null)}
      />

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading translations…
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {translationsErrorMessage(error, "Could not load translations.")}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
          >
            Try again
          </Button>
        </div>
      )}

      {data && (
        <>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">English</p>
            <p className="text-sm">
              {data.englishText || (
                <span className="text-muted-foreground">
                  No English instruction yet.
                </span>
              )}
            </p>
          </div>

          {data.locales.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No languages are being translated yet.
            </p>
          ) : (
            <TooltipProvider>
              <ul className="space-y-3">
                {data.locales.map((translation) => (
                  <TranslationRow
                    key={translation.code}
                    translation={translation}
                    isPlaying={playingCode === translation.code}
                    isRetrying={
                      retry.isPending && retry.variables?.code === translation.code
                    }
                    onTogglePlay={() => togglePlay(translation)}
                    onRetry={() => retry.mutate(translation)}
                  />
                ))}
              </ul>
            </TooltipProvider>
          )}
        </>
      )}
    </div>
  );
}

function TranslationRow({
  translation,
  isPlaying,
  isRetrying,
  onTogglePlay,
  onRetry,
}: {
  translation: ActivityTranslation;
  isPlaying: boolean;
  isRetrying: boolean;
  onTogglePlay: () => void;
  onRetry: () => void;
}) {
  const badge = STATUS_BADGE[translation.status];
  const isRtl = RTL_LOCALES.has(translation.code);
  const canRetry = RETRYABLE.includes(translation.status);

  return (
    <li className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 truncate text-sm font-medium">
          {translation.nativeName}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            {translation.englishName}
          </span>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
        {translation.audioUrl && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
            onClick={onTogglePlay}
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
        {canRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7"
            disabled={isRetrying}
            onClick={onRetry}
          >
            {isRetrying ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
            )}
            Retry
          </Button>
        )}
      </div>

      {translation.text && (
        <div
          dir={isRtl ? "rtl" : "ltr"}
          className="rounded-md border bg-muted/40 px-3 py-2 text-sm"
        >
          {translation.text}
        </div>
      )}

      {translation.status === "failed" && translation.error && (
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="truncate text-xs text-destructive">
              {translation.error}
            </p>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">{translation.error}</TooltipContent>
        </Tooltip>
      )}

      {translation.localeStatus === "backfilling" && (
        <p className="text-xs text-muted-foreground">
          Not live yet. This language is not served to the app.
        </p>
      )}
    </li>
  );
}
