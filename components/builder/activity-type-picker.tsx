"use client";

import * as React from "react";
import { Search, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ACTIVITY_TYPES,
  ACTIVITY_CATEGORIES,
  ACTIVITY_TYPE_CATEGORIES,
  getActivitiesByCategory,
  getActivityIcon,
  type ActivityCategory,
} from "@/lib/constants/curriculum";

// Local storage key for recent activities
const RECENT_ACTIVITIES_KEY = "kalam-recent-activities";
const MAX_RECENT_ACTIVITIES = 4;

// List of implemented activities (using string to avoid type errors with extended types)
const IMPLEMENTED_ACTIVITIES: string[] = [
  "show_letter_or_word",
  "animation_intro",
  "tap_letter_in_word",
  "trace_letter",
  "pop_balloons_with_letter",
  "break_time_minigame",
  "build_word_from_letters",
  "multiple_choice_question",
  "drag_items_to_target",
  "catch_fish_with_letter",
  "add_pizza_toppings_with_letter",
  "drag_dots_to_letter",
  "tap_dot_position",
  "activity_request",
  "letter_rain",
  "audio_letter_match",
  "memory_card_match",
  "color_letter",
  "letter_discrimination",
  "speech_practice",
  "grid_tap",
  "pick_from_tree",
  "pick_flowers",
  "tap_crescent_moons",
  "drag_to_animal_mouth",
  "feed_rabbit",
  "feed_baby",
  "piggy_bank",
  "snowflakes",
  "bear_honey",
  "fly_on_flowers",
  "deliver_envelope",
  "plant_seeds",
  "balance_scale",
  "ice_cream_stacking",
  "content_with_cards",
  "drag_hamza_to_letter",
  "drag_haraka_to_letter",
  "slingshot",
  "i_spy",
  "sound_blend",
  "match_pairs",
  "camel_narration",
];

function getRecentActivities(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_ACTIVITIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentActivity(type: string): void {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentActivities();
    const filtered = recent.filter((t) => t !== type);
    const updated = [type, ...filtered].slice(0, MAX_RECENT_ACTIVITIES);
    localStorage.setItem(RECENT_ACTIVITIES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

interface ActivityTypePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: { id: string; name: string }) => void;
}

export function ActivityTypePicker({
  open,
  onOpenChange,
  onSelect,
}: ActivityTypePickerProps) {
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] =
    React.useState<ActivityCategory>("all");
  const [recentActivities, setRecentActivities] = React.useState<string[]>([]);

  // Reset state each time the dialog opens
  React.useEffect(() => {
    if (open) {
      setRecentActivities(getRecentActivities());
      setSearch("");
      setSelectedCategory("all");
    }
  }, [open]);

  // Build activity list with metadata
  const activityTypes = React.useMemo(() => {
    return ACTIVITY_TYPES.map(({ value, label }) => ({
      type: value,
      label,
      icon: getActivityIcon(value),
      implemented: IMPLEMENTED_ACTIVITIES.includes(value),
      category: ACTIVITY_TYPE_CATEGORIES[value] || "misc",
    }));
  }, []);

  // Filter activities based on search and category
  const filteredActivities = React.useMemo(() => {
    let filtered = activityTypes;

    if (selectedCategory !== "all") {
      const categoryTypes = getActivitiesByCategory(selectedCategory);
      filtered = filtered.filter((a) => categoryTypes.includes(a.type));
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.label.toLowerCase().includes(query) ||
          a.type.toLowerCase().includes(query)
      );
    }

    // Implemented first, then alphabetical within each group.
    return [...filtered].sort((a, b) => {
      if (a.implemented !== b.implemented) return a.implemented ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  }, [activityTypes, selectedCategory, search]);

  // Get recent activities with metadata
  const recentActivityItems = React.useMemo(() => {
    return recentActivities
      .map((type) => activityTypes.find((a) => a.type === type))
      .filter(
        (a): a is NonNullable<typeof a> => a !== undefined && a.implemented
      );
  }, [recentActivities, activityTypes]);

  const handleSelectType = (type: string, label: string) => {
    saveRecentActivity(type);
    onSelect({ id: type, name: label });
    onOpenChange(false);
  };

  // Get count for each category (only implemented activities)
  const getCategoryCount = (categoryId: ActivityCategory): number => {
    if (categoryId === "all") {
      return activityTypes.filter((a) => a.implemented).length;
    }
    return activityTypes.filter(
      (a) => a.implemented && a.category === categoryId
    ).length;
  };

  const implementedCount = activityTypes.filter((a) => a.implemented).length;
  const filteredImplementedCount = filteredActivities.filter(
    (a) => a.implemented
  ).length;
  const showRecent = recentActivityItems.length > 0 && !search;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="flex-shrink-0 border-b px-5 py-4">
          <DialogTitle>Select Activity Type</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="flex-shrink-0 px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Two-pane: category sidebar + activity list */}
        <div className="flex min-h-0 flex-1 border-t">
          {/* Sidebar */}
          <nav className="w-44 flex-shrink-0 overflow-y-auto border-r py-2">
            {ACTIVITY_CATEGORIES.map((category) => {
              const count = getCategoryCount(category.id);
              const isSelected = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors",
                    isSelected
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <span className="text-base">{category.icon}</span>
                  <span className="flex-1 text-left">{category.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-xs font-semibold",
                      isSelected
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* List */}
          <div className="min-w-0 flex-1 overflow-y-auto">
            {showRecent && (
              <div className="px-3 pt-3">
                <h3 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recently Used
                </h3>
                {recentActivityItems.map((activity) => (
                  <ActivityRow
                    key={`recent-${activity.type}`}
                    icon={activity.icon}
                    label={activity.label}
                    onClick={() =>
                      handleSelectType(activity.type, activity.label)
                    }
                  />
                ))}
                <div className="mx-2 my-2 border-t" />
              </div>
            )}

            {filteredActivities.length > 0 ? (
              <div className="px-3 pb-3">
                {filteredActivities.map((activity) => (
                  <ActivityRow
                    key={activity.type}
                    icon={activity.icon}
                    label={activity.label}
                    disabled={!activity.implemented}
                    onClick={() =>
                      handleSelectType(activity.type, activity.label)
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <p className="text-sm">No activities found</p>
                <p className="mt-1 text-xs">
                  Try a different search or category
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex-shrink-0 flex-row items-center justify-between border-t px-5 py-3 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {filteredImplementedCount} of {implementedCount} activities
          </span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A single activity row in the list pane. */
function ActivityRow({
  icon,
  label,
  disabled = false,
  onClick,
}: {
  icon: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
        disabled ? "cursor-not-allowed opacity-50" : "hover:bg-primary/5"
      )}
    >
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-muted text-lg">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {label}
      </span>
      {disabled ? (
        <span className="flex-shrink-0 text-xs text-muted-foreground">
          Coming soon
        </span>
      ) : (
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
      )}
    </button>
  );
}
