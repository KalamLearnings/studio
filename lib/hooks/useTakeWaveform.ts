/**
 * A take's audio decoded in the browser with the Web Audio API, for the
 * waveform mark editor (SB-S3). Glue only: the peaks and the marks logic are
 * in lib/blendWord/marks.ts. Decoded audio is cached per URL for the session.
 */

import { useEffect, useState } from 'react';

export interface DecodedTake {
  /** The first channel's samples. */
  samples: Float32Array;
  durationMs: number;
}

export interface TakeWaveformState {
  data: DecodedTake | null;
  loading: boolean;
  error: string | null;
}

const cache = new Map<string, Promise<DecodedTake>>();

function decode(url: string): Promise<DecodedTake> {
  const hit = cache.get(url);
  if (hit) return hit;
  const p = (async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = await res.arrayBuffer();
    const Ctx: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) throw new Error('no Web Audio');
    const ctx = new Ctx();
    try {
      const buffer = await ctx.decodeAudioData(bytes);
      return { samples: buffer.getChannelData(0), durationMs: buffer.duration * 1000 };
    } finally {
      void ctx.close();
    }
  })();
  p.catch(() => cache.delete(url));
  cache.set(url, p);
  return p;
}

export function useTakeWaveform(url: string | null): TakeWaveformState {
  const [state, setState] = useState<TakeWaveformState>({ data: null, loading: !!url, error: null });

  useEffect(() => {
    if (!url) {
      setState({ data: null, loading: false, error: 'This take has no audio yet.' });
      return;
    }
    let live = true;
    setState({ data: null, loading: true, error: null });
    decode(url).then(
      (data) => live && setState({ data, loading: false, error: null }),
      () => live && setState({ data: null, loading: false, error: 'The audio could not be loaded or decoded. Try again later.' }),
    );
    return () => {
      live = false;
    };
  }, [url]);

  return state;
}
