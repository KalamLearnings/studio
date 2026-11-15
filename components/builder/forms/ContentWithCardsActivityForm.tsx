"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  FormField,
  LetterSelector,
  ImageLibraryModal,
  ContentItemGrid,
  PromptKindPicker,
  WordSelector,
  FieldErrors,
} from "./shared";
import type { BaseActivityFormProps, LetterReference } from "./types";
import {
  CARD_MODE_OF_KIND,
  cardFromItem,
  cardItem,
  emptied,
  gridKindOf,
  isFilled,
  kindOfCardMode,
  promptKind,
  withPromptKind,
  type EditorItem,
  type EditorKind,
} from "@/lib/activityConfig/contentItems";

/**
 * Content with cards (content model CM-S3, CM-S6). The cards are content
 * items in the shared grid (letter, library word, library image, numeral).
 * What the form stores per card is v1's shape (`cardFromItem`); letter cards
 * under a letter are saved canonically (lib/activityConfig/canonical.ts).
 */

type ContentType = "letter" | "word" | "image";
type CardMode = "letter" | "word" | "image";

interface ContentWithCardsOption {
  id: string;
  text?: string;
  letter?: LetterReference;
  image?: string;
  isCorrect: boolean;
}

interface ContentWithCardsConfig {
  contentType?: ContentType;
  targetLetter?: LetterReference | null;
  content?: { word?: string; image?: string };
  cardMode?: CardMode;
  interactive?: boolean;
  cards?: ContentWithCardsOption[];
  prompt?: unknown;
}

const CARD_KINDS: EditorKind[] = ["letter", "word", "image", "numeral"];
const CARD_KIND_ICON: Partial<Record<EditorKind, string>> = { letter: "أ", word: "كلمة", numeral: "١٢" };
const CARD_KIND_LABEL: Partial<Record<EditorKind, string>> = {
  letter: "Letter",
  word: "Word",
  image: "Image",
  numeral: "Number",
};

const generateOptionId = (index: number) => `card_${index}_${Date.now()}`;

export function ContentWithCardsActivityForm({
  config,
  onChange,
  topic,
}: BaseActivityFormProps<ContentWithCardsConfig>) {
  const contentType = config?.contentType || "letter";
  const targetLetter = config?.targetLetter || null;
  const word = config?.content?.word || "";
  const image = config?.content?.image || "";
  const cardMode = config?.cardMode || "letter";
  const interactive = config?.interactive ?? true;

  const [showImageLibrary, setShowImageLibrary] = React.useState(false);

  // Cards are derived from config (single source of truth) so editing an
  // existing activity pre-populates and stays in sync — no duplicate local
  // state to drift out of date.
  const cards: ContentWithCardsOption[] = config?.cards?.length
    ? config.cards
    : [
        { id: generateOptionId(0), text: "", isCorrect: false },
        { id: generateOptionId(1), text: "", isCorrect: false },
      ];
  const items: EditorItem[] = cards.map((c) => cardItem(c, cardMode));
  const [cardKind, setCardKind] = React.useState<EditorKind>(() =>
    gridKindOf(items, kindOfCardMode(cardMode))
  );

  const updateConfig = (updates: Partial<ContentWithCardsConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handleContentTypeChange = (type: ContentType) => {
    updateConfig({
      contentType: type,
      targetLetter: type === "letter" ? targetLetter : undefined,
      content: {
        word: type === "word" ? word : undefined,
        image: type === "image" ? image : undefined,
      },
    });
  };

  const handleChangeCard = (index: number, item: EditorItem) => {
    const newCards = [...cards];
    newCards[index] = cardFromItem(item, cards[index]) as unknown as ContentWithCardsOption;
    updateConfig({ cards: newCards });
  };

  // Switching what the cards show empties the cards of another kind.
  const handleCardKindChange = (kind: EditorKind) => {
    setCardKind(kind);
    updateConfig({
      cardMode: CARD_MODE_OF_KIND[kind],
      cards: cards.map((c, i) =>
        isFilled(items[i]) && items[i].kind !== kind
          ? (cardFromItem(emptied({ ...items[i], kind }), c) as unknown as ContentWithCardsOption)
          : c
      ),
    });
  };

  const handleAddCard = () => {
    if (cards.length >= 4) return;
    const newCards = [
      ...cards,
      { id: generateOptionId(cards.length), text: "", isCorrect: false },
    ];
    updateConfig({ cards: newCards });
  };

  const handleRemoveCard = (index: number) => {
    if (cards.length <= 1) return;
    const newCards = cards.filter((_, i) => i !== index);
    updateConfig({ cards: newCards });
  };

  const getColumns = (): 2 | 3 | 4 => {
    if (cards.length <= 2) return 2;
    if (cards.length === 3) return 3;
    return 4;
  };

  return (
    <div className="space-y-6">
      <FormField label="Content Type" hint="Show a letter, word, or image" required errorPath="contentType">
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleContentTypeChange("letter")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
              contentType === "letter"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-muted"
            )}
          >
            <div className="text-3xl font-arabic">أ</div>
            <div className="text-xs font-medium">Letter</div>
          </button>

          <button
            type="button"
            onClick={() => handleContentTypeChange("word")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
              contentType === "word"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-muted"
            )}
          >
            <div className="text-3xl font-arabic">كلمة</div>
            <div className="text-xs font-medium">Word</div>
          </button>

          <button
            type="button"
            onClick={() => handleContentTypeChange("image")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
              contentType === "image"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-muted"
            )}
          >
            <svg
              className="w-8 h-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <div className="text-xs font-medium">Image</div>
          </button>
        </div>
      </FormField>

      {contentType === "letter" && (
        <FormField label="Letter" hint="Select letter and form to display" required errorPath="targetLetter">
          <LetterSelector
            value={targetLetter}
            onChange={(value) =>
              updateConfig({
                targetLetter: Array.isArray(value) ? value[0] : value,
              })
            }
            topic={topic}
            showFormSelector
          />
        </FormField>
      )}

      {contentType === "word" && (
        <WordSelector
          value={word}
          onChange={(value) =>
            updateConfig({ content: { ...config?.content, word: value } })
          }
          label="Word"
          required
          placeholder="Type to search word library..."
        />
      )}

      {contentType === "image" && (
        <FormField label="Image" hint="Image to display" required>
          {image ? (
            <div className="relative inline-block">
              <img
                src={image}
                alt="Display"
                className="max-w-xs max-h-48 rounded-lg border-2 border-border"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowImageLibrary(true)}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  Change Image
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateConfig({ content: { ...config?.content, image: "" } })
                  }
                  className="text-sm text-destructive hover:text-destructive/80"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowImageLibrary(true)}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-muted-foreground transition-colors w-full max-w-xs"
            >
              <div className="text-4xl mb-2">🖼️</div>
              <p className="text-sm text-muted-foreground">Click to select image</p>
            </button>
          )}
        </FormField>
      )}

      <div className="border-t pt-4">
        <FormField
          label="Card Display Mode"
          hint="What type of content to show on each card"
          required
        >
          <div className="grid grid-cols-4 gap-3">
            {CARD_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => handleCardKindChange(kind)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  cardKind === kind
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-muted"
                )}
              >
                {kind === "image" ? (
                  <svg
                    className="w-8 h-8 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                ) : (
                  <div className="text-3xl font-arabic">{CARD_KIND_ICON[kind]}</div>
                )}
                <div className="text-xs font-medium">{CARD_KIND_LABEL[kind]}</div>
              </button>
            ))}
          </div>
        </FormField>
      </div>

      <div className="border-t pt-4">
        <FormField
          label="Activity Mode"
          hint="Interactive allows child to select answers, Informational is display-only"
        >
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={interactive}
                onChange={() => updateConfig({ interactive: true })}
                className="w-4 h-4 text-primary border-border focus:ring-primary"
              />
              <span className="text-sm">Interactive (Choice)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!interactive}
                onChange={() => updateConfig({ interactive: false })}
                className="w-4 h-4 text-primary border-border focus:ring-primary"
              />
              <span className="text-sm">Informational (Display Only)</span>
            </label>
          </div>
        </FormField>
      </div>

      {interactive && (
        <PromptKindPicker
          value={promptKind(config)}
          onChange={(kind) => onChange(withPromptKind({ ...config }, kind))}
        />
      )}

      <ContentItemGrid
        items={items}
        onChangeItem={handleChangeCard}
        kind={cardKind}
        onKindChange={handleCardKindChange}
        allowedKinds={CARD_KINDS}
        showKindToggle={false}
        title={`Cards (${cards.length}/4)`}
        showCorrectCheckbox={interactive}
        columns={getColumns()}
        allowAddRemove
        onAdd={handleAddCard}
        onRemove={handleRemoveCard}
        minItems={1}
        maxItems={4}
        topic={topic}
      />
      <FieldErrors path="cards" />

      <p className="text-xs text-muted-foreground">
        {interactive
          ? "Mark at least one card as correct. Child will tap to select the right answer."
          : "Cards will be displayed without interaction. Activity auto-completes."}
      </p>

      <ImageLibraryModal
        isOpen={showImageLibrary}
        onClose={() => setShowImageLibrary(false)}
        onSelectImage={(url: string) => {
          updateConfig({ content: { ...config?.content, image: url } });
          setShowImageLibrary(false);
        }}
      />
    </div>
  );
}
