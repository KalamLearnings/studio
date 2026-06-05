"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  FormField,
  LetterSelector,
  ImageLibraryModal,
  AnswerOptionsGrid,
  OptionData,
  WordSelector,
} from "./shared";
import { useLetters, getLetterDisplayChar } from "@/lib/hooks/useLetters";
import type { BaseActivityFormProps, LetterReference } from "./types";

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
}

const generateOptionId = (index: number) => `card_${index}_${Date.now()}`;

export function ContentWithCardsActivityForm({
  config,
  onChange,
  topic,
}: BaseActivityFormProps<ContentWithCardsConfig>) {
  const { getLetter } = useLetters();

  const contentType = config?.contentType || "letter";
  const targetLetter = config?.targetLetter || null;
  const word = config?.content?.word || "";
  const image = config?.content?.image || "";
  const cardMode = config?.cardMode || "letter";
  const interactive = config?.interactive ?? true;

  const [showImageLibrary, setShowImageLibrary] = React.useState(false);

  const initialCards: ContentWithCardsOption[] =
    config?.cards?.length
      ? config.cards
      : [
          { id: generateOptionId(0), text: "", isCorrect: false },
          { id: generateOptionId(1), text: "", isCorrect: false },
        ];

  const [cards, setCards] = React.useState<ContentWithCardsOption[]>(initialCards);

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

  const handleUpdateCard = (
    index: number,
    field: "text" | "image" | "isCorrect" | "letter",
    value: unknown
  ) => {
    const newCards = [...cards];
    if (field === "text") {
      newCards[index].text = value as string;
    } else if (field === "image") {
      newCards[index].image = value as string;
    } else if (field === "isCorrect") {
      newCards[index].isCorrect = value as boolean;
    } else if (field === "letter") {
      newCards[index].letter = value as LetterReference;
    }
    setCards(newCards);
    updateConfig({ cards: newCards });
  };

  const handleAddCard = () => {
    if (cards.length >= 4) return;
    const newCards = [
      ...cards,
      { id: generateOptionId(cards.length), text: "", isCorrect: false },
    ];
    setCards(newCards);
    updateConfig({ cards: newCards });
  };

  const handleRemoveCard = (index: number) => {
    if (cards.length <= 1) return;
    const newCards = cards.filter((_, i) => i !== index);
    setCards(newCards);
    updateConfig({ cards: newCards });
  };

  const optionData: OptionData[] = cards.map((card) => ({
    id: card.id,
    text: card.text || "",
    letter: card.letter,
    letterDisplay: getLetterDisplayChar(card.letter, getLetter),
    image: card.image,
    isCorrect: card.isCorrect,
  }));

  const getColumns = (): 2 | 3 | 4 => {
    if (cards.length <= 2) return 2;
    if (cards.length === 3) return 3;
    return 4;
  };

  return (
    <div className="space-y-6">
      <FormField label="Content Type" hint="Show a letter, word, or image" required>
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
        <FormField label="Letter" hint="Select letter and form to display" required>
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
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => updateConfig({ cardMode: "letter" })}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                cardMode === "letter"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-muted"
              )}
            >
              <div className="text-3xl font-arabic">أ</div>
              <div className="text-xs font-medium">Letter</div>
            </button>

            <button
              type="button"
              onClick={() => updateConfig({ cardMode: "word" })}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                cardMode === "word"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-muted"
              )}
            >
              <div className="text-3xl font-arabic">كلمة</div>
              <div className="text-xs font-medium">Word</div>
            </button>

            <button
              type="button"
              onClick={() => updateConfig({ cardMode: "image" })}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                cardMode === "image"
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

      <AnswerOptionsGrid
        options={optionData}
        mode={cardMode}
        onUpdateOption={handleUpdateCard}
        title={`Cards (${cards.length}/4)`}
        showCorrectCheckbox={interactive}
        columns={getColumns()}
        allowAddRemove
        onAddOption={handleAddCard}
        onRemoveOption={handleRemoveCard}
        minOptions={1}
        maxOptions={4}
      />

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
