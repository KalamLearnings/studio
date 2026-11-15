"use client";

/**
 * ReaderQuestionFields (content model CM-S10 follow-up)
 *
 * One comprehension question of the reader source's private assessment: its
 * prompt, two to six answers, and which answer is correct. Prompts and answers
 * take `{{word:<id>}}` tokens like page text; the StoryWordLinks panel links
 * their Arabic words.
 */

import * as React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { displayStoryText, plainStoryWordIssue, type StoryWordIssue } from "@/lib/books/storyWords";
import {
  QUESTION_LIMITS,
  newChoiceId,
  removeChoice,
  type PageProblem,
  type ReaderAssessmentQuestion,
} from "@/lib/books/readerSource";

interface ReaderQuestionFieldsProps {
  question: ReaderAssessmentQuestion;
  index: number;
  count: number;
  onChange: (question: ReaderAssessmentQuestion) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  spellingOf: (wordId: string) => string | undefined;
  problems: PageProblem[];
  /** Word issues from the last save, by item path. */
  serverIssues: Map<string, StoryWordIssue[]>;
}

export function ReaderQuestionFields({
  question,
  index,
  count,
  onChange,
  onMove,
  onRemove,
  spellingOf,
  problems,
  serverIssues,
}: ReaderQuestionFieldsProps) {
  const base = `assessment.questions[${index}]`;
  const promptPreview = displayStoryText(question.prompt, spellingOf);
  const setChoice = (i: number, patch: Partial<ReaderAssessmentQuestion["choices"][number]>) => {
    onChange({
      ...question,
      choices: question.choices.map((c, j) => {
        if (j !== i) return c;
        const next = { ...c, ...patch };
        if (!next.illustration_url) delete next.illustration_url;
        return next;
      }),
    });
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-medium">Question {index + 1}</h4>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move question up">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onMove(1)}
            disabled={index === count - 1}
            aria-label="Move question down"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Remove question">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`question-prompt-${question.id}`}>Question</Label>
        <Textarea
          id={`question-prompt-${question.id}`}
          value={question.prompt}
          onChange={(e) => onChange({ ...question, prompt: e.target.value })}
          rows={2}
          dir="auto"
        />
        {promptPreview !== question.prompt && (
          <p className="rounded-md bg-muted px-3 py-2 text-sm" dir="auto">
            {promptPreview}
          </p>
        )}
        {(serverIssues.get(`${base}.prompt`) ?? []).map((issue, i) => (
          <p key={i} className="text-sm text-destructive" role="alert">
            {plainStoryWordIssue(issue, spellingOf)}
          </p>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Answers (select the correct one)</Label>
        {question.choices.map((choice, i) => {
          const preview = displayStoryText(choice.text, spellingOf);
          const issues = serverIssues.get(`${base}.choices[${i}].text`) ?? [];
          return (
            <div key={choice.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={question.correct_choice_id === choice.id}
                  onChange={() => onChange({ ...question, correct_choice_id: choice.id })}
                  aria-label={`Answer ${i + 1} is correct`}
                />
                <Input
                  value={choice.text}
                  onChange={(e) => setChoice(i, { text: e.target.value })}
                  aria-label={`Answer ${i + 1}`}
                  dir="auto"
                />
                <Input
                  className="max-w-56"
                  value={choice.illustration_url ?? ""}
                  onChange={(e) => setChoice(i, { illustration_url: e.target.value.trim() })}
                  placeholder="Picture address (optional)"
                  aria-label={`Answer ${i + 1} picture address`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onChange(removeChoice(question, choice.id))}
                  disabled={question.choices.length <= QUESTION_LIMITS.choices.min}
                  aria-label={`Remove answer ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {preview !== choice.text && (
                <p className="ml-6 rounded-md bg-muted px-3 py-1 text-sm" dir="auto">
                  {preview}
                </p>
              )}
              {issues.map((issue, k) => (
                <p key={k} className="ml-6 text-sm text-destructive" role="alert">
                  {plainStoryWordIssue(issue, spellingOf)}
                </p>
              ))}
            </div>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          disabled={question.choices.length >= QUESTION_LIMITS.choices.max}
          onClick={() =>
            onChange({ ...question, choices: [...question.choices, { id: newChoiceId(question.choices), text: "" }] })
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Add answer
        </Button>
      </div>

      {problems.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-destructive" role="alert">
          {problems.map((p) => (
            <li key={p.message}>{p.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
