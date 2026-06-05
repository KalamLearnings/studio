"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CoverImageField } from "@/components/books-games/CoverImageField";
import { PagesManager } from "@/components/books-games/PagesManager";
import {
  AvailabilityManager,
  type NewAvailabilityInput,
} from "@/components/books-games/AvailabilityManager";
import { LetterSelector } from "@/components/builder/forms/shared/LetterSelector";
import type { LetterReference } from "@/components/builder/forms/types";
import {
  useBook,
  useCreateBook,
  useUpdateBook,
  useBookAvailability,
  useCreateAvailability,
  useDeleteAvailability,
} from "@/lib/hooks/useBooks";

const DIFFICULTY_OPTIONS = [
  { value: "1", label: "Beginner" },
  { value: "2", label: "Intermediate" },
  { value: "3", label: "Advanced" },
];

interface BookFormState {
  title: string;
  title_ar: string;
  synopsis: string;
  synopsis_ar: string;
  cover_image_url: string;
  difficulty_level: 1 | 2 | 3;
  target_letters: string[];
  price: number;
  is_premium: boolean;
  is_active: boolean;
}

const EMPTY_FORM: BookFormState = {
  title: "",
  title_ar: "",
  synopsis: "",
  synopsis_ar: "",
  cover_image_url: "",
  difficulty_level: 1,
  target_letters: [],
  price: 0,
  is_premium: false,
  is_active: true,
};

export default function BookEditorPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;
  const isNew = bookId === "new";

  const { data: book, isLoading } = useBook(isNew ? null : bookId);
  const { data: availability, isLoading: availabilityLoading } =
    useBookAvailability(isNew ? null : bookId);

  const createMutation = useCreateBook();
  const updateMutation = useUpdateBook();
  const createAvailability = useCreateAvailability();
  const deleteAvailability = useDeleteAvailability();

  const [form, setForm] = React.useState<BookFormState>(EMPTY_FORM);
  const [deletingRuleId, setDeletingRuleId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (book) {
      setForm({
        title: book.title ?? "",
        title_ar: book.title_ar ?? "",
        synopsis: book.synopsis ?? "",
        synopsis_ar: book.synopsis_ar ?? "",
        cover_image_url: book.image_url ?? "",
        difficulty_level: book.difficulty_level ?? 1,
        target_letters: book.target_letters ?? [],
        price: book.price ?? 0,
        is_premium: book.is_premium ?? false,
        is_active: book.is_active ?? true,
      });
    }
  }, [book]);

  const update = <K extends keyof BookFormState>(
    key: K,
    value: BookFormState[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  // target_letters is string[] of letter IDs; LetterSelector works in
  // LetterReference[]. Map between the two representations.
  const letterRefs: LetterReference[] = React.useMemo(
    () => form.target_letters.map((id) => ({ letterId: id, form: "isolated" })),
    [form.target_letters]
  );

  const handleLettersChange = (value: LetterReference[]) => {
    // De-dupe by letterId since target_letters only tracks the letter.
    const ids = Array.from(new Set(value.map((r) => r.letterId)));
    update("target_letters", ids);
  };

  const canSave = form.title.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;

    if (isNew) {
      const created = await createMutation.mutateAsync({
        title: form.title,
        title_ar: form.title_ar || form.title,
        synopsis: form.synopsis || undefined,
        synopsis_ar: form.synopsis_ar || undefined,
        cover_image_url: form.cover_image_url,
        difficulty_level: form.difficulty_level,
        target_letters: form.target_letters,
        price: form.price,
        is_premium: form.is_premium,
      });
      router.replace(`/books/${created.id}`);
    } else {
      await updateMutation.mutateAsync({
        bookId,
        data: {
          title: form.title,
          title_ar: form.title_ar || undefined,
          synopsis: form.synopsis || null,
          synopsis_ar: form.synopsis_ar || null,
          cover_image_url: form.cover_image_url,
          difficulty_level: form.difficulty_level,
          target_letters: form.target_letters,
          price: form.price,
          is_premium: form.is_premium,
          is_active: form.is_active,
        },
      });
    }
  };

  const handleCreateAvailability = (input: NewAvailabilityInput) => {
    createAvailability.mutate({
      bookId,
      data: {
        availability_type: input.prerequisite_topic_id
          ? "store_unlockable"
          : "store_always",
        curriculum_id: input.curriculum_id,
        prerequisite_type: input.prerequisite_topic_id ? "topic" : undefined,
        prerequisite_topic_id: input.prerequisite_topic_id,
      },
    });
  };

  const handleDeleteAvailability = (ruleId: string) => {
    setDeletingRuleId(ruleId);
    deleteAvailability.mutate(
      { bookId, ruleId },
      { onSettled: () => setDeletingRuleId(null) }
    );
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/books")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? "Create New Book" : form.title || "Edit Book"}
            </h1>
            {!isNew && (
              <p className="text-sm text-muted-foreground">
                {book?.page_count ?? 0} pages
              </p>
            )}
          </div>
        </div>
        <Button onClick={handleSave} disabled={!canSave || isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isNew ? "Create Book" : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="pages" disabled={isNew}>
            Pages{!isNew && ` (${book?.page_count ?? 0})`}
          </TabsTrigger>
          <TabsTrigger value="availability" disabled={isNew}>
            Availability{!isNew && ` (${availability?.length ?? 0})`}
          </TabsTrigger>
        </TabsList>

        {/* DETAILS */}
        <TabsContent value="details" className="space-y-6 pt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title (English) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., The Little Camel"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title_ar">Title (Arabic)</Label>
                <Input
                  id="title_ar"
                  dir="rtl"
                  className="font-arabic"
                  placeholder="عنوان الكتاب"
                  value={form.title_ar}
                  onChange={(e) => update("title_ar", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="synopsis">Synopsis (English)</Label>
                <Textarea
                  id="synopsis"
                  rows={3}
                  placeholder="Brief description of the book"
                  value={form.synopsis}
                  onChange={(e) => update("synopsis", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="synopsis_ar">Synopsis (Arabic)</Label>
                <Textarea
                  id="synopsis_ar"
                  dir="rtl"
                  className="font-arabic"
                  rows={3}
                  placeholder="وصف موجز للكتاب"
                  value={form.synopsis_ar}
                  onChange={(e) => update("synopsis_ar", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Difficulty Level</Label>
                <Select
                  value={String(form.difficulty_level)}
                  onValueChange={(v) =>
                    update("difficulty_level", Number(v) as 1 | 2 | 3)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <CoverImageField
                value={form.cover_image_url}
                onChange={(url) => update("cover_image_url", url)}
                aspectClassName="aspect-[3/4]"
                label="Cover Image"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (coins)</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => update("price", Number(e.target.value) || 0)}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.is_premium}
                      onCheckedChange={(c) => update("is_premium", !!c)}
                    />
                    Premium content
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target Letters</Label>
                <LetterSelector
                  value={letterRefs}
                  onChange={(v) =>
                    handleLettersChange(Array.isArray(v) ? v : v ? [v] : [])
                  }
                  multiSelect
                  showFormSelector={false}
                  showHarakaSelector={false}
                />
              </div>

              {!isNew && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.is_active}
                    onCheckedChange={(c) => update("is_active", !!c)}
                  />
                  Active (visible in store)
                </label>
              )}
            </div>
          </div>
        </TabsContent>

        {/* PAGES */}
        <TabsContent value="pages" className="pt-4">
          {!isNew && <PagesManager bookId={bookId} />}
        </TabsContent>

        {/* AVAILABILITY */}
        <TabsContent value="availability" className="pt-4">
          {!isNew && (
            <AvailabilityManager
              rules={availability ?? []}
              isLoading={availabilityLoading}
              isCreating={createAvailability.isPending}
              deletingRuleId={deletingRuleId}
              onCreate={handleCreateAvailability}
              onDelete={handleDeleteAvailability}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
