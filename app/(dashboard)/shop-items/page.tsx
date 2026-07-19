"use client";

import * as React from "react";
import { Loader2, Plus, ShoppingBag, Trash2, Pencil } from "lucide-react";
import {
  useShopItems,
  useCreateShopItem,
  useUpdateShopItem,
  useDeleteShopItem,
} from "@/lib/hooks/useShopItems";
import type { ShopItem, ShopItemCategory } from "@/lib/services/shopItemsService";
import { MediaEmptyState } from "@/components/media";
import { CoverImageField } from "@/components/books-games/CoverImageField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CATEGORIES: ShopItemCategory[] = [
  "sticker",
  "avatar",
  "hat",
  "background",
  "book",
  "game",
];

interface ItemFormState {
  category: ShopItemCategory;
  name: string;
  name_ar: string;
  image_url: string;
  price: number;
  is_premium: boolean;
  is_active: boolean;
}

const EMPTY_FORM: ItemFormState = {
  category: "sticker",
  name: "",
  name_ar: "",
  image_url: "",
  price: 0,
  is_premium: false,
  is_active: true,
};

export default function ShopItemsPage() {
  // Stickers are the reason this page exists, so default the filter there.
  const [categoryFilter, setCategoryFilter] = React.useState<ShopItemCategory>("sticker");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ShopItem | null>(null);
  const [form, setForm] = React.useState<ItemFormState>(EMPTY_FORM);

  const { data: items, isLoading, error } = useShopItems(categoryFilter);
  const createMutation = useCreateShopItem();
  const updateMutation = useUpdateShopItem();
  const deleteMutation = useDeleteShopItem();

  const update = <K extends keyof ItemFormState>(key: K, value: ItemFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = React.useCallback(() => {
    setEditingItem(null);
    setForm({ ...EMPTY_FORM, category: categoryFilter });
    setDialogOpen(true);
  }, [categoryFilter]);

  const openEdit = React.useCallback((item: ShopItem) => {
    setEditingItem(item);
    setForm({
      category: item.category,
      name: item.name,
      name_ar: item.name_ar ?? "",
      image_url: item.image_url,
      price: item.price,
      is_premium: item.is_premium,
      is_active: item.is_active,
    });
    setDialogOpen(true);
  }, []);

  const handleDelete = React.useCallback(
    (item: ShopItem) => {
      if (confirm(`Delete "${item.name}"?`)) {
        deleteMutation.mutate(item.id);
      }
    },
    [deleteMutation]
  );

  const canSave = form.name.trim().length > 0 && form.image_url.trim().length > 0;

  const handleSave = React.useCallback(async () => {
    if (!canSave) return;

    const payload = {
      category: form.category,
      name: form.name.trim(),
      name_ar: form.name_ar.trim() || null,
      image_url: form.image_url,
      price: form.price,
      is_premium: form.is_premium,
      is_active: form.is_active,
    };

    if (editingItem) {
      await updateMutation.mutateAsync({ itemId: editingItem.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }

    setDialogOpen(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
  }, [canSave, form, editingItem, updateMutation, createMutation]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 p-12 text-center">
        <p className="text-destructive">Failed to load shop items</p>
        <p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Shop Items</h1>
          <p className="text-sm text-muted-foreground">
            Stickers awarded on curriculum completion, plus other shop content
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as ShopItemCategory)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}s
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Item
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !items || items.length === 0 ? (
        <MediaEmptyState
          icon={ShoppingBag}
          title={`No ${categoryFilter}s found`}
          description={`Create your first ${categoryFilter}`}
          hasFilters={false}
          actionLabel="Create Item"
          onAction={openCreate}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                  {item.name_ar && (
                    <p className="truncate font-arabic text-sm text-muted-foreground" dir="rtl">
                      {item.name_ar}
                    </p>
                  )}
                </div>
                {!item.is_active && <Badge variant="secondary">Inactive</Badge>}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEdit(item)}
                >
                  <Pencil className="mr-2 h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(item)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "New Item"}</DialogTitle>
            <DialogDescription>
              Stickers are earned by completing a curriculum, so they are normally
              free and not premium.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => update("category", v as ShopItemCategory)}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Alif Star"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name_ar">Name (Arabic)</Label>
              <Input
                id="name_ar"
                dir="rtl"
                className="font-arabic"
                value={form.name_ar}
                onChange={(e) => update("name_ar", e.target.value)}
              />
            </div>

            <CoverImageField
              value={form.image_url}
              onChange={(url) => update("image_url", url)}
              aspectClassName="aspect-square"
              label="Image"
              required
            />

            <div className="space-y-2">
              <Label htmlFor="price">Price (coins)</Label>
              <Input
                id="price"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => update("price", Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Leave at 0 for earned rewards.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.is_premium}
                  onCheckedChange={(c) => update("is_premium", !!c)}
                />
                Premium only
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.is_active}
                  onCheckedChange={(c) => update("is_active", !!c)}
                />
                Active
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave || isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem ? "Save Changes" : "Create Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
