"use client";

import * as React from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  LayoutTemplate,
  Copy,
  Play,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useActivityTemplates,
  useDeleteActivityTemplate,
} from "@/lib/hooks/useTemplates";
import type { ActivityTemplate } from "@/lib/schemas/curriculum";

const activityTypes = [
  { value: "all", label: "All Types" },
  { value: "show_letter_or_word", label: "Show Letter/Word" },
  { value: "tap_letter_in_word", label: "Tap Letter" },
  { value: "trace_letter", label: "Trace Letter" },
  { value: "pop_balloons_with_letter", label: "Pop Balloons" },
  { value: "multiple_choice_question", label: "Multiple Choice" },
  { value: "break_time_minigame", label: "Break Time" },
];

const TemplateCard = React.memo(function TemplateCard({
  template,
  onDelete,
}: {
  template: ActivityTemplate;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <LayoutTemplate className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{template.name?.en || "Untitled"}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {template.type?.replace(/_/g, " ") || "Activity"}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Play className="mr-2 h-4 w-4" />
                Use Template
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(template.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="line-clamp-2 mb-4">
          {template.description?.en || "No description"}
        </CardDescription>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {template.category && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {template.category}
            </span>
          )}
          <span>
            {template.created_at
              ? new Date(template.created_at).toLocaleDateString()
              : "N/A"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
});

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activityType, setActivityType] = React.useState("all");

  const { data: templates, isLoading, error } = useActivityTemplates(
    activityType !== "all" ? { type: activityType } : undefined
  );
  const deleteMutation = useDeleteActivityTemplate();

  const filteredTemplates = React.useMemo(() => {
    if (!templates) return [];
    if (!searchQuery) return templates;

    const query = searchQuery.toLowerCase();
    return templates.filter(
      (template) =>
        template.name?.en?.toLowerCase().includes(query) ||
        template.description?.en?.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  const handleDelete = React.useCallback(
    (id: string) => {
      if (confirm("Are you sure you want to delete this template?")) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation]
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 p-12 text-center">
        <p className="text-destructive">Failed to load templates</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-muted-foreground">
            Reusable activity templates for quick curriculum creation
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={activityType} onValueChange={setActivityType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {activityTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Templates Grid */}
      {!isLoading && filteredTemplates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTemplates.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <LayoutTemplate className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No templates found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery || activityType !== "all"
              ? "Try adjusting your filters"
              : "Create your first activity template"}
          </p>
          {!searchQuery && activityType === "all" && (
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
