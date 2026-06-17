"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CategoryOption {
  value: string;
  label: string;
  icon?: string;
  description?: string;
}

interface CategorySelectorProps<T extends string> {
  categories: CategoryOption[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  columns?: 3 | 4;
}

export function CategorySelector<T extends string>({
  categories,
  value,
  onChange,
  label = "Category",
  columns = 4,
}: CategorySelectorProps<T>) {
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div
        className={cn(
          "grid gap-2",
          columns === 3 ? "grid-cols-3" : "grid-cols-4"
        )}
      >
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => onChange(cat.value as T)}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-sm",
              value === cat.value
                ? "border-primary bg-primary/5 text-primary"
                : "border-transparent bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            title={cat.description}
          >
            {cat.icon && <span className="text-lg">{cat.icon}</span>}
            <span className="font-medium text-center">{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
