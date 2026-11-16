/**
 * The library word a form names (`wordRef`, design 3.1 rule 4; backend
 * CM-D3d, CM-D3e). For `build_word_from_letters`, `show_letter_or_word` and
 * `tap_letter_in_word` the server writes the text v1 draws from `wordRef` on
 * every save (`targetWord`, or show's `word`), and an id that names no word is
 * refused (400 `V1_DISPLAY_UNRESOLVED`).
 *
 * So when the author picks a library word the form sends `wordRef: { wordId }`
 * beside the text, and when the text changes to anything that is not that
 * library word (typed by hand, cleared) the `wordRef` goes: a stale `wordRef`
 * would make the server overwrite the new text with the old word. Pure.
 */

export interface PickedWord {
  id?: string | null;
  arabic?: string | null;
}

type WithWordRef = { wordRef?: { wordId: string; text?: string } };

/**
 * The config with its word text set to `text` and its `wordRef` following
 * it: `{ wordId }` when `picked` is the library word spelled `text`, removed
 * otherwise. `textKey` is the field v1 draws (`targetWord`, or `word`).
 */
export function withPickedWord<C extends WithWordRef>(
  config: C,
  textKey: string,
  text: string,
  picked?: PickedWord | null,
): C {
  const next = { ...config, [textKey]: text } as C;
  if (picked?.id && picked.arabic === text) {
    next.wordRef = { wordId: picked.id };
  } else {
    delete next.wordRef;
  }
  return next;
}

interface FormedLetter {
  letterId: string;
  form: string;
}

/**
 * tap_letter_in_word: the target letter a position pick sends. The server
 * derives `targetLetter.form` from the word and the positions on every save
 * (CM-D3d), so the form never sets it: while the picked letter is the stored
 * one, the stored (server-derived) form is kept; a different letter is sent
 * with the picker's placeholder form and the server derives its own.
 */
export function withServerForm<L extends FormedLetter>(picked: L, stored: unknown): L {
  if (
    typeof stored === "object" && stored !== null && !Array.isArray(stored) &&
    (stored as FormedLetter).letterId === picked.letterId &&
    typeof (stored as FormedLetter).form === "string"
  ) {
    return { ...picked, form: (stored as FormedLetter).form };
  }
  return picked;
}
