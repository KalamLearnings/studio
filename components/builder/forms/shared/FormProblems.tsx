"use client";

import * as React from "react";

/**
 * What the form already knows stops a save, in plain language (a mirror of
 * the server's rules; the server stays the final check). Same look as the
 * phrase builder's problems.
 */
export function FormProblems({ problems }: { problems: readonly string[] }) {
  if (problems.length === 0) return null;
  return (
    <ul className="space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
      {problems.map((p, i) => (
        <li key={`${i}-${p}`}>{p}</li>
      ))}
    </ul>
  );
}
