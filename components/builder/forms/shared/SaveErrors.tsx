"use client";

/**
 * Save validation errors beside their fields (content model CM-S3). The
 * activity form parses the server's refusal (`lib/activityConfig/saveErrors`)
 * and provides it here; a field shows the errors at or inside its config path
 * (`<FormField errorPath="distractorLetters">`), and the errors no shown field
 * covers are listed above the form, so none is lost. The server's logged
 * findings of the saved config show the same way: warnings in amber, and
 * informational notes (decodability, backend CM-C11a) in a calm muted style.
 */

import * as React from "react";
import {
  checkTitle,
  errorLine,
  errorsAt,
  unplacedErrors,
  type ConfigFieldError,
} from "@/lib/activityConfig/saveErrors";

interface SaveErrorsState {
  errors: readonly ConfigFieldError[];
  /** The server's logged findings of the saved config: warnings, never a refusal. */
  warnings: readonly ConfigFieldError[];
  /** The server's informational notes on the saved config (severity `info`): never a warning. */
  notes: readonly ConfigFieldError[];
  register: (path: string) => () => void;
}

const SaveErrorsContext = React.createContext<SaveErrorsState | null>(null);

const listClass = "rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive";
const warnClass = "rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-sm text-amber-700 dark:text-amber-400";
const noteClass = "rounded-md border bg-muted/40 p-2 text-sm text-muted-foreground";

export function SaveErrorsProvider({
  errors,
  warnings,
  notes,
  children,
}: {
  errors: readonly ConfigFieldError[] | null;
  /** Logged shadow findings of the last save; hidden while a refusal is shown. */
  warnings?: readonly ConfigFieldError[] | null;
  /** Logged informational notes of the last save; hidden while a refusal is shown. */
  notes?: readonly ConfigFieldError[] | null;
  children: React.ReactNode;
}) {
  const [shown, setShown] = React.useState<Record<string, number>>({});
  const register = React.useCallback((path: string) => {
    setShown((s) => ({ ...s, [path]: (s[path] ?? 0) + 1 }));
    return () => setShown((s) => ({ ...s, [path]: Math.max(0, (s[path] ?? 1) - 1) }));
  }, []);
  const list = React.useMemo(() => errors ?? [], [errors]);
  const warned = React.useMemo(() => (list.length > 0 ? [] : (warnings ?? [])), [list, warnings]);
  const noted = React.useMemo(() => (list.length > 0 ? [] : (notes ?? [])), [list, notes]);
  const value = React.useMemo(
    () => ({ errors: list, warnings: warned, notes: noted, register }),
    [list, warned, noted, register],
  );
  const placed = Object.keys(shown).filter((p) => shown[p]! > 0);
  const rest = unplacedErrors(list, placed);
  const restWarnings = unplacedErrors(warned, placed);
  const restNotes = unplacedErrors(noted, placed);

  return (
    <SaveErrorsContext.Provider value={value}>
      {rest.length > 0 && (
        <div className="mb-4 space-y-1">
          <p className="text-xs font-medium text-destructive">The server refused this save:</p>
          <ul className={listClass}>
            {rest.map((e, i) => (
              <li key={i}>
                <ErrorText error={e} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {restWarnings.length > 0 && (
        <div className="mb-4 space-y-1">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            The server&apos;s checks on the last save (it was saved anyway):
          </p>
          <ul className={warnClass}>
            {restWarnings.map((e, i) => (
              <li key={i}>
                <ErrorText error={e} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {restNotes.length > 0 && (
        <div className="mb-4 space-y-1">
          <p className="text-xs text-muted-foreground">For your information (not a problem; nothing to fix):</p>
          <ul className={noteClass}>
            {restNotes.map((e, i) => (
              <li key={i}>
                <ErrorText error={e} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {children}
    </SaveErrorsContext.Provider>
  );
}

/** One error line, with its check's short name first when it has one (`Phrase review: ...`). */
function ErrorText({ error, prefix }: { error: ConfigFieldError; prefix?: string }) {
  const title = checkTitle(error);
  return (
    <>
      {title && <span className="font-medium">{title}: </span>}
      {errorLine(error, prefix)}
    </>
  );
}

/** The save errors at or inside one config path (`targetLetter`, `cards.0.letter`). */
export function FieldErrors({ path }: { path: string }) {
  const ctx = React.useContext(SaveErrorsContext);
  const register = ctx?.register;
  React.useEffect(() => (register ? register(path) : undefined), [register, path]);
  const errors = ctx ? errorsAt(ctx.errors, path) : [];
  const warnings = ctx ? errorsAt(ctx.warnings, path) : [];
  const notes = ctx ? errorsAt(ctx.notes, path) : [];
  if (errors.length === 0 && warnings.length === 0 && notes.length === 0) return null;
  return (
    <>
      {errors.length > 0 && (
        <ul className={listClass}>
          {errors.map((e, i) => (
            <li key={i}>
              <ErrorText error={e} prefix={path} />
            </li>
          ))}
        </ul>
      )}
      {warnings.length > 0 && (
        <ul className={warnClass}>
          {warnings.map((e, i) => (
            <li key={i}>
              <ErrorText error={e} prefix={path} />
            </li>
          ))}
        </ul>
      )}
      {notes.length > 0 && (
        <ul className={noteClass}>
          {notes.map((e, i) => (
            <li key={i}>
              <ErrorText error={e} prefix={path} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
