/**
 * The server's refusal of an activity save (content model CM-B8a, CM-B8b,
 * CM-S3): a 400 with code `CONFIG_INVALID` (the write schema), `CONFIG_EMPTY`
 * or `CONFIG_CHECK_FAILED` (the domain checks), or `V1_DISPLAY_UNRESOLVED`
 * (R2, CM-D3d, CM-D3e: a reference the server cannot write v1's text from,
 * such as a `wordRef` naming no library word; shown in plain words), and details
 * `[{ field, message, check }]`. `field` is the stored config path, dotted and
 * prefixed with `config.` (`config.distractorLetters.2.letterId`), or
 * `config` for the whole config. Parsed here so every form shows each error
 * beside the field it is about (the blend forms did this first). Pure.
 */

export const CONFIG_SAVE_ERROR_CODES = [
  "CONFIG_INVALID",
  "CONFIG_EMPTY",
  "CONFIG_CHECK_FAILED",
  "V1_DISPLAY_UNRESOLVED",
] as const;

/** The plain message for a `wordRef` the server found no library word for. */
export const UNKNOWN_LIBRARY_WORD_MESSAGE =
  "This word is no longer in the word library. Pick it again from the list, or pick another word.";

/** The plain message for any other item the server could not show to the v1 app. */
export const V1_DISPLAY_MESSAGE =
  "The app cannot show this item: what it points to is missing from the library. Pick it again.";

/**
 * A `V1_DISPLAY_UNRESOLVED` detail in plain words: a `wordRef` error is put
 * on `wordRef` itself (the word picker shows it), any other keeps its place.
 */
function plainV1Display(error: ConfigFieldError): ConfigFieldError {
  if (isUnder(error.path, "wordRef")) {
    return {
      path: "wordRef",
      message: UNKNOWN_LIBRARY_WORD_MESSAGE,
      ...(error.check !== undefined && { check: error.check }),
    };
  }
  return { ...error, message: V1_DISPLAY_MESSAGE };
}

export interface ConfigFieldError {
  /** The config path without the `config.` prefix; '' for the whole config. */
  path: string;
  message: string;
  check?: string;
}

export function isConfigSaveError(error: { code?: string } | null | undefined): boolean {
  return !!error && (CONFIG_SAVE_ERROR_CODES as readonly string[]).includes(error.code ?? "");
}

/** The field errors of a config refusal; null when the error is something else. */
export function parseConfigSaveError(
  error: { code?: string; details?: unknown } | null | undefined,
): ConfigFieldError[] | null {
  if (!error || !isConfigSaveError(error)) return null;
  const details = Array.isArray(error.details) ? error.details : [];
  const out: ConfigFieldError[] = [];
  for (const d of details) {
    if (!d || typeof d !== "object") continue;
    const entry = d as { field?: unknown; message?: unknown; check?: unknown };
    if (typeof entry.message !== "string") continue;
    const field = typeof entry.field === "string" ? entry.field : "config";
    out.push({
      path: field === "config" ? "" : field.replace(/^config\./, ""),
      message: entry.message,
      ...(typeof entry.check === "string" && { check: entry.check }),
    });
  }
  if (error.code === "V1_DISPLAY_UNRESOLVED") {
    if (out.length === 0) return [{ path: "", message: V1_DISPLAY_MESSAGE }];
    return out.map(plainV1Display);
  }
  if (out.length === 0) out.push({ path: "", message: "The server refused this activity." });
  return out;
}

/** True when `path` is `prefix` or inside it (`distractorLetters.2.letterId` is inside `distractorLetters`). */
export function isUnder(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}.`);
}

/** The errors at or inside one config path. */
export function errorsAt(errors: readonly ConfigFieldError[], prefix: string): ConfigFieldError[] {
  return errors.filter((e) => isUnder(e.path, prefix));
}

/** The errors no shown field covers, for the summary above the form. */
export function unplacedErrors(
  errors: readonly ConfigFieldError[],
  shownPaths: readonly string[],
): ConfigFieldError[] {
  return errors.filter((e) => !shownPaths.some((p) => isUnder(e.path, p)));
}

/** One display line: the message, with the place inside the field when there is one. */
export function errorLine(error: ConfigFieldError, prefix = ""): string {
  const rest = prefix && error.path.startsWith(`${prefix}.`) ? error.path.slice(prefix.length + 1) : "";
  const where = (prefix ? rest : error.path)
    .split(".")
    .filter(Boolean)
    .map((part) => (/^\d+$/.test(part) ? `#${Number(part) + 1}` : part))
    .join(" ");
  return where ? `${where}: ${error.message}` : error.message;
}

/**
 * Short names for the save checks whose message alone does not say which rule
 * it is (backend CM-B33, CM-B34, CM-B35): shown before the message.
 */
const CHECK_TITLES: Readonly<Record<string, string>> = {
  phrase_words: "Phrase words",
  phrase_reviewed: "Phrase review",
  decodable: "Decodability",
  sort_item_sound: "Basket sound",
  sort_item_label: "Item label",
  distractors_differ: "Same as the answer",
};

/** The short name of an error's check, or null when it has none. */
export function checkTitle(error: ConfigFieldError): string | null {
  return (error.check && CHECK_TITLES[error.check]) || null;
}
