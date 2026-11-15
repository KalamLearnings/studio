"use client";

/**
 * Save validation errors beside their fields (content model CM-S3). The
 * activity form parses the server's refusal (`lib/activityConfig/saveErrors`)
 * and provides it here; a field shows the errors at or inside its config path
 * (`<FormField errorPath="distractorLetters">`), and the errors no shown field
 * covers are listed above the form, so none is lost.
 */

import * as React from "react";
import {
  errorLine,
  errorsAt,
  unplacedErrors,
  type ConfigFieldError,
} from "@/lib/activityConfig/saveErrors";

interface SaveErrorsState {
  errors: readonly ConfigFieldError[];
  register: (path: string) => () => void;
}

const SaveErrorsContext = React.createContext<SaveErrorsState | null>(null);

const listClass = "rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive";

export function SaveErrorsProvider({
  errors,
  children,
}: {
  errors: readonly ConfigFieldError[] | null;
  children: React.ReactNode;
}) {
  const [shown, setShown] = React.useState<Record<string, number>>({});
  const register = React.useCallback((path: string) => {
    setShown((s) => ({ ...s, [path]: (s[path] ?? 0) + 1 }));
    return () => setShown((s) => ({ ...s, [path]: Math.max(0, (s[path] ?? 1) - 1) }));
  }, []);
  const list = React.useMemo(() => errors ?? [], [errors]);
  const value = React.useMemo(() => ({ errors: list, register }), [list, register]);
  const rest = unplacedErrors(list, Object.keys(shown).filter((p) => shown[p]! > 0));

  return (
    <SaveErrorsContext.Provider value={value}>
      {rest.length > 0 && (
        <div className="mb-4 space-y-1">
          <p className="text-xs font-medium text-destructive">The server refused this save:</p>
          <ul className={listClass}>
            {rest.map((e, i) => (
              <li key={i}>{errorLine(e)}</li>
            ))}
          </ul>
        </div>
      )}
      {children}
    </SaveErrorsContext.Provider>
  );
}

/** The save errors at or inside one config path (`targetLetter`, `cards.0.letter`). */
export function FieldErrors({ path }: { path: string }) {
  const ctx = React.useContext(SaveErrorsContext);
  const register = ctx?.register;
  React.useEffect(() => (register ? register(path) : undefined), [register, path]);
  const errors = ctx ? errorsAt(ctx.errors, path) : [];
  if (errors.length === 0) return null;
  return (
    <ul className={listClass}>
      {errors.map((e, i) => (
        <li key={i}>{errorLine(e, path)}</li>
      ))}
    </ul>
  );
}
