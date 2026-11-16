/**
 * The server's refusal of an activity save (content model CM-B8a, CM-B8b,
 * CM-S3): a 400 with code `CONFIG_INVALID` (the write schema), `CONFIG_EMPTY`
 * or `CONFIG_CHECK_FAILED` (the domain checks), and details
 * `[{ field, message, check }]`. `field` is the stored config path, dotted and
 * prefixed with `config.` (`config.distractorLetters.2.letterId`), or
 * `config` for the whole config. Parsed here so every form shows each error
 * beside the field it is about (the blend forms did this first). Pure.
 */

export const CONFIG_SAVE_ERROR_CODES = ["CONFIG_INVALID", "CONFIG_EMPTY", "CONFIG_CHECK_FAILED"] as const;

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
