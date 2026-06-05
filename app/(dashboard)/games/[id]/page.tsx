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
import {
  AvailabilityManager,
  type NewAvailabilityInput,
} from "@/components/books-games/AvailabilityManager";
import {
  useGame,
  useCreateGame,
  useUpdateGame,
  useGameAvailability,
  useCreateGameAvailability,
  useDeleteGameAvailability,
} from "@/lib/hooks/useGames";
import { cn } from "@/lib/utils";

const DIFFICULTY_OPTIONS = [
  { value: "1", label: "Easy" },
  { value: "2", label: "Medium" },
  { value: "3", label: "Hard" },
];

const SKILL_OPTIONS = [
  "letter-recognition",
  "word-building",
  "listening",
  "hand-eye-coordination",
  "memory",
  "pattern-matching",
  "speed",
  "focus",
];

interface GameFormState {
  title: string;
  title_ar: string;
  description: string;
  cover_image_url: string;
  game_key: string;
  difficulty_level: 1 | 2 | 3;
  target_skills: string[];
  min_age: number | null;
  max_age: number | null;
  price: number;
  is_premium: boolean;
  is_active: boolean;
}

const EMPTY_FORM: GameFormState = {
  title: "",
  title_ar: "",
  description: "",
  cover_image_url: "",
  game_key: "",
  difficulty_level: 1,
  target_skills: [],
  min_age: null,
  max_age: null,
  price: 0,
  is_premium: false,
  is_active: true,
};

/** Sanitize a game key to [a-z0-9-]. */
function sanitizeGameKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-");
}

export default function GameEditorPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const isNew = gameId === "new";

  const { data: game, isLoading } = useGame(isNew ? null : gameId);
  const { data: availability, isLoading: availabilityLoading } =
    useGameAvailability(isNew ? null : gameId);

  const createMutation = useCreateGame();
  const updateMutation = useUpdateGame();
  const createAvailability = useCreateGameAvailability();
  const deleteAvailability = useDeleteGameAvailability();

  const [form, setForm] = React.useState<GameFormState>(EMPTY_FORM);
  const [deletingRuleId, setDeletingRuleId] = React.useState<string | null>(null);

  // Hydrate form when an existing game loads.
  React.useEffect(() => {
    if (game) {
      setForm({
        title: game.title ?? "",
        title_ar: game.title_ar ?? "",
        description: game.description ?? "",
        cover_image_url: game.image_url ?? "",
        game_key: game.game_key ?? "",
        difficulty_level: game.difficulty_level ?? 1,
        target_skills: game.target_skills ?? [],
        min_age: game.min_age,
        max_age: game.max_age,
        price: game.price ?? 0,
        is_premium: game.is_premium ?? false,
        is_active: game.is_active ?? true,
      });
    }
  }, [game]);

  const update = <K extends keyof GameFormState>(
    key: K,
    value: GameFormState[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleSkill = (skill: string) => {
    setForm((prev) => ({
      ...prev,
      target_skills: prev.target_skills.includes(skill)
        ? prev.target_skills.filter((s) => s !== skill)
        : [...prev.target_skills, skill],
    }));
  };

  const canSave = form.title.trim() && form.game_key.trim();

  const handleSave = async () => {
    if (!canSave) return;

    if (isNew) {
      const created = await createMutation.mutateAsync({
        title: form.title,
        title_ar: form.title_ar || undefined,
        description: form.description || undefined,
        cover_image_url: form.cover_image_url,
        game_key: form.game_key,
        difficulty_level: form.difficulty_level,
        target_skills: form.target_skills,
        min_age: form.min_age ?? undefined,
        max_age: form.max_age ?? undefined,
        price: form.price,
        is_premium: form.is_premium,
      });
      router.replace(`/games/${created.id}`);
    } else {
      await updateMutation.mutateAsync({
        gameId,
        data: {
          title: form.title,
          title_ar: form.title_ar || null,
          description: form.description || null,
          cover_image_url: form.cover_image_url,
          game_key: form.game_key,
          difficulty_level: form.difficulty_level,
          target_skills: form.target_skills,
          min_age: form.min_age,
          max_age: form.max_age,
          price: form.price,
          is_premium: form.is_premium,
          is_active: form.is_active,
        },
      });
    }
  };

  const handleCreateAvailability = (input: NewAvailabilityInput) => {
    createAvailability.mutate({
      gameId,
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
      { gameId, ruleId },
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
          <Button variant="ghost" size="icon" onClick={() => router.push("/games")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? "Create New Game" : form.title || "Edit Game"}
            </h1>
            {!isNew && (
              <p className="font-mono text-sm text-muted-foreground">
                {form.game_key}
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
          {isNew ? "Create Game" : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="availability" disabled={isNew}>
            Availability{!isNew && ` (${availability?.length ?? 0})`}
          </TabsTrigger>
        </TabsList>

        {/* DETAILS */}
        <TabsContent value="details" className="space-y-6 pt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left column: basic details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Letter Match"
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
                  placeholder="اسم اللعبة"
                  value={form.title_ar}
                  onChange={(e) => update("title_ar", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="game_key">
                  Game Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="game_key"
                  className="font-mono"
                  placeholder="letter-match"
                  value={form.game_key}
                  onChange={(e) =>
                    update("game_key", sanitizeGameKey(e.target.value))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier used by the app. Lowercase letters, numbers,
                  and dashes only.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Describe how the game is played"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
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

            {/* Right column: media, pricing, skills */}
            <div className="space-y-4">
              <CoverImageField
                value={form.cover_image_url}
                onChange={(url) => update("cover_image_url", url)}
                aspectClassName="aspect-video"
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_age">Min Age</Label>
                  <Input
                    id="min_age"
                    type="number"
                    min={0}
                    placeholder="optional"
                    value={form.min_age ?? ""}
                    onChange={(e) =>
                      update(
                        "min_age",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_age">Max Age</Label>
                  <Input
                    id="max_age"
                    type="number"
                    min={0}
                    placeholder="optional"
                    value={form.max_age ?? ""}
                    onChange={(e) =>
                      update(
                        "max_age",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Target Skills</Label>
                <div className="flex flex-wrap gap-2">
                  {SKILL_OPTIONS.map((skill) => {
                    const selected = form.target_skills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={cn(
                          "rounded-full border-2 px-3 py-1 text-xs font-medium capitalize transition-all",
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {skill.replace(/-/g, " ")}
                      </button>
                    );
                  })}
                </div>
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
