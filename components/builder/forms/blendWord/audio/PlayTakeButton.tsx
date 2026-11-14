"use client";

import * as React from "react";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Plays a take's audio. One button, one audio element; it stops at the end. */
export function PlayTakeButton({ url, label = "Play" }: { url: string | null; label?: string }) {
  const audio = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(
    () => () => {
      audio.current?.pause();
      audio.current = null;
    },
    [url]
  );

  const toggle = () => {
    if (!url) return;
    if (playing && audio.current) {
      audio.current.pause();
      audio.current.currentTime = 0;
      setPlaying(false);
      return;
    }
    const el = audio.current ?? new Audio(url);
    audio.current = el;
    el.onended = () => setPlaying(false);
    setError(null);
    el.play().then(
      () => setPlaying(true),
      () => {
        setPlaying(false);
        setError("The audio could not be played.");
      }
    );
  };

  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={!url} onClick={toggle} title={url ? undefined : "No audio yet"}>
        {playing ? <Square className="mr-1 h-3.5 w-3.5" /> : <Play className="mr-1 h-3.5 w-3.5" />}
        {playing ? "Stop" : label}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
