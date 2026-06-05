"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  Gamepad2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useGames, useDeleteGame, useUpdateGame } from "@/lib/hooks/useGames";
import type { Game } from "@/lib/api/games";

const levelColors: Record<number, string> = {
  1: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  2: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  3: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const levelLabels: Record<number, string> = {
  1: "Easy",
  2: "Medium",
  3: "Hard",
};

const coverColors = [
  "bg-indigo-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-blue-500",
  "bg-green-500",
];

const GameCard = React.memo(function GameCard({
  game,
  colorIndex,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  game: Game;
  colorIndex: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (game: Game) => void;
}) {
  const coverColor = coverColors[colorIndex % coverColors.length];

  return (
    <Card className="group overflow-hidden">
      {/* Cover */}
      <div
        className={`relative h-40 cursor-pointer ${game.image_url ? "" : coverColor}`}
        onClick={() => onEdit(game.id)}
      >
        {game.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.image_url}
            alt={game.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <Gamepad2 className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2 font-arabic text-xl" dir="rtl">
                {game.title_ar || game.title}
              </p>
            </div>
          </div>
        )}
        <div className="absolute right-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(game.id)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(game.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{game.title}</CardTitle>
          <Switch
            checked={game.is_active}
            onCheckedChange={() => onToggleActive(game)}
            aria-label="Toggle active"
          />
        </div>
        <CardDescription className="line-clamp-2">
          {game.description || "No description"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-mono text-xs text-muted-foreground">
            {game.game_key}
          </span>
          {game.difficulty_level && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                levelColors[game.difficulty_level] || levelColors[1]
              }`}
            >
              {levelLabels[game.difficulty_level] || "Easy"}
            </span>
          )}
        </div>
        {game.target_skills?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {game.target_skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground"
              >
                {skill.replace(/-/g, " ")}
              </span>
            ))}
            {game.target_skills.length > 3 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                +{game.target_skills.length - 3} more
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default function GamesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");

  const { data: games, isLoading, error } = useGames();
  const deleteMutation = useDeleteGame();
  const updateMutation = useUpdateGame();

  const filteredGames = React.useMemo(() => {
    if (!games) return [];
    if (!searchQuery) return games;
    const query = searchQuery.toLowerCase();
    return games.filter(
      (game) =>
        game.title?.toLowerCase().includes(query) ||
        game.title_ar?.includes(searchQuery) ||
        game.game_key?.toLowerCase().includes(query) ||
        game.description?.toLowerCase().includes(query)
    );
  }, [games, searchQuery]);

  const handleEdit = React.useCallback(
    (id: string) => router.push(`/games/${id}`),
    [router]
  );

  const handleDelete = React.useCallback(
    (id: string) => {
      if (confirm("Are you sure you want to delete this game?")) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation]
  );

  const handleToggleActive = React.useCallback(
    (game: Game) => {
      updateMutation.mutate({
        gameId: game.id,
        data: { is_active: !game.is_active },
      });
    },
    [updateMutation]
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 p-12 text-center">
        <p className="text-destructive">Failed to load games</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Games</h1>
          <p className="text-muted-foreground">
            Create and manage mini-games for learners
          </p>
        </div>
        <Button onClick={() => router.push("/games/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Game
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search games..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Grid */}
      {!isLoading && filteredGames.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredGames.map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              colorIndex={index}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filteredGames.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Gamepad2 className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No games found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery
              ? "Try a different search term"
              : "Create your first mini-game"}
          </p>
          {!searchQuery && (
            <Button className="mt-4" onClick={() => router.push("/games/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Game
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
