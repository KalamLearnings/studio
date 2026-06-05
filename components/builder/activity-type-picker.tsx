"use client";

import * as React from "react";
import { Search, X, FileText } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACTIVITY_TYPES,
  ACTIVITY_CATEGORIES,
  ACTIVITY_TYPE_CATEGORIES,
  getActivitiesByCategory,
  getActivityIcon,
  type ActivityCategory,
} from "@/lib/constants/curriculum";
import { useActivityTemplates } from "@/lib/hooks/useTemplates";
import type { ActivityTemplate } from "@/lib/schemas/curriculum";
// Local storage key for recent activities
const RECENT_ACTIVITIES_KEY = "kalam-recent-activities";
const MAX_RECENT_ACTIVITIES = 4;

// List of implemented activities (using string to avoid type errors with extended types)
const IMPLEMENTED_ACTIVITIES: string[] = [
  "show_letter_or_word",
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
  onSelectTemplate?: (template: ActivityTemplate, variables: Record<string, string>) => void;
}

export function ActivityTypePicker({
  open,
  onOpenChange,
  onSelect,
  onSelectTemplate,
}: ActivityTypePickerProps) {
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] =
    React.useState<ActivityCategory>("all");
  const [recentActivities, setRecentActivities] = React.useState<string[]>([]);

  // Template state
  const [useTemplate, setUseTemplate] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<ActivityTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = React.useState<Record<string, string>>({});

  // Fetch templates
  const { data: templates, isLoading: isLoadingTemplates } = useActivityTemplates();

  // Load recent activities on mount
  React.useEffect(() => {
    if (open) {
      setRecentActivities(getRecentActivities());
      setSearch("");
      setSelectedCategory("all");
      setUseTemplate(false);
      setSelectedTemplate(null);
      setTemplateVariables({});
    }
  }, [open]);

  // Reset template variables when template changes
  React.useEffect(() => {
    if (selectedTemplate) {
      const initialVariables: Record<string, string> = {};
      selectedTemplate.required_fields.forEach(field => {
        initialVariables[field] = "";
      });
      setTemplateVariables(initialVariables);
    }
  }, [selectedTemplate]);

  // Handle template submission
  const handleTemplateSubmit = () => {
    if (!selectedTemplate || !onSelectTemplate) return;

    // Check all required fields are filled
    const allFilled = selectedTemplate.required_fields.every(
      field => templateVariables[field]?.trim()
    );
    if (!allFilled) {
      alert("Please fill in all required fields");
      return;
    }

    onSelectTemplate(selectedTemplate, templateVariables);
    onOpenChange(false);
  };

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

    // Filter by category
    if (selectedCategory !== "all") {
      const categoryTypes = getActivitiesByCategory(selectedCategory);
      filtered = filtered.filter((a) => categoryTypes.includes(a.type));
    }

    // Filter by search query
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.label.toLowerCase().includes(query) ||
          a.type.toLowerCase().includes(query)
      );
    }

    return filtered;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Select Activity Type</DialogTitle>
        </DialogHeader>

        {/* Template Toggle */}
        {onSelectTemplate && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md flex-shrink-0">
            <Checkbox
              id="use-template"
              checked={useTemplate}
              onCheckedChange={(checked) => {
                setUseTemplate(checked === true);
                if (!checked) {
                  setSelectedTemplate(null);
                  setTemplateVariables({});
                }
              }}
            />
            <Label htmlFor="use-template" className="text-sm font-medium cursor-pointer">
              Create from template
            </Label>
          </div>
        )}

        {/* Template Selection Mode */}
        {useTemplate ? (
          <div className="flex-1 overflow-y-auto space-y-4">
            <div>
              <Label className="text-sm font-medium">Select Template *</Label>
              {isLoadingTemplates ? (
                <p className="text-sm text-muted-foreground mt-2">Loading templates...</p>
              ) : (
                <Select
                  value={selectedTemplate?.id || ""}
                  onValueChange={(value) => {
                    const template = templates?.find(t => t.id === value);
                    setSelectedTemplate(template || null);
                  }}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="-- Select a template --" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{template.name.en}</span>
                          <span className="text-muted-foreground">({template.type})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Template Variables */}
            {selectedTemplate && (
              <div className="space-y-3 p-4 bg-blue-50 rounded-md border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900">Template Variables</h4>
                {selectedTemplate.required_fields.map((field) => (
                  <div key={field}>
                    <Label className="text-sm font-medium">{field} *</Label>
                    <Input
                      value={templateVariables[field] || ""}
                      onChange={(e) =>
                        setTemplateVariables({
                          ...templateVariables,
                          [field]: e.target.value,
                        })
                      }
                      className="mt-1"
                      placeholder={`Enter ${field}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="relative flex-shrink-0">
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

            {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          {ACTIVITY_CATEGORIES.map((category) => {
            const count = getCategoryCount(category.id);
            const isSelected = selectedCategory === category.id;
            return (
              <Button
                key={category.id}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="gap-2"
              >
                <span>{category.icon}</span>
                <span>{category.label}</span>
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Recent Activities */}
        {recentActivityItems.length > 0 &&
          !search &&
          selectedCategory === "all" && (
            <div className="flex-shrink-0">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Recently Used
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recentActivityItems.map((activity) => (
                  <button
                    key={activity.type}
                    onClick={() =>
                      handleSelectType(activity.type, activity.label)
                    }
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all whitespace-nowrap"
                  >
                    <span className="text-xl">{activity.icon}</span>
                    <span className="text-sm font-medium text-primary">
                      {activity.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

            {/* Activity Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {filteredActivities.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 pr-2">
                  {filteredActivities.map((activity) => (
                    <button
                      key={activity.type}
                      onClick={() =>
                        handleSelectType(activity.type, activity.label)
                      }
                      disabled={!activity.implemented}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all text-left",
                        activity.implemented
                          ? "border-border hover:border-primary hover:bg-primary/5 cursor-pointer"
                          : "border-border/50 bg-muted/50 cursor-not-allowed opacity-50"
                      )}
                    >
                      <div className="text-2xl mb-1">{activity.icon}</div>
                      <div className="text-xs font-medium leading-tight">
                        {activity.label}
                      </div>
                      {!activity.implemented && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Coming soon
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <p className="text-sm">No activities found</p>
                  <p className="text-xs mt-1">
                    Try a different search or category
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <DialogFooter className="flex-row justify-between sm:justify-between flex-shrink-0">
          {useTemplate ? (
            <>
              <span className="text-xs text-muted-foreground">
                {selectedTemplate ? `Template: ${selectedTemplate.name.en}` : "Select a template"}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleTemplateSubmit}
                  disabled={!selectedTemplate}
                >
                  Create from Template
                </Button>
              </div>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">
                {filteredActivities.filter((a) => a.implemented).length} of{" "}
                {activityTypes.filter((a) => a.implemented).length} activities
              </span>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
