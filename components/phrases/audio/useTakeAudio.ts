"use client";

/**
 * Plays one take. A pane can drive it from the keyboard (`space`), so the
 * state lives in a hook and the player only draws it. One take plays at a
 * time: starting one stops whichever was playing.
 */

import * as React from "react";

let stopPlaying: (() => void) | null = null;

export interface TakeAudio {
  url: string | null;
  playing: boolean;
  /** 0 to 1. */
  progress: number;
  error: string | null;
  toggle: () => void;
  stop: () => void;
}

export function useTakeAudio(url: string | null): TakeAudio {
  const el = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const stop = React.useCallback(() => {
    const a = el.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setPlaying(false);
    setProgress(0);
  }, []);

  React.useEffect(
    () => () => {
      el.current?.pause();
      el.current = null;
      setPlaying(false);
      setProgress(0);
    },
    [url],
  );

  const toggle = React.useCallback(() => {
    if (!url) return;
    if (playing) {
      stop();
      return;
    }
    stopPlaying?.();
    const a = el.current ?? new Audio(url);
    el.current = a;
    a.ontimeupdate = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    a.onended = () => {
      setPlaying(false);
      setProgress(0);
    };
    setError(null);
    stopPlaying = stop;
    a.play().then(
      () => setPlaying(true),
      () => {
        setPlaying(false);
        setError("The audio could not be played.");
      },
    );
  }, [url, playing, stop]);

  return { url, playing, progress, error, toggle, stop };
}
