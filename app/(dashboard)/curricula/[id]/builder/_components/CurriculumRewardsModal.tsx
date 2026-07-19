"use client";

import * as React from "react";
import { Gift, Loader2, Trash2 } from "lucide-react";
import {
  useCurriculumRewards,
  useAddCurriculumReward,
  useRemoveCurriculumReward,
  useShopItems,
} from "@/lib/hooks/useShopItems";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CurriculumRewardsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curriculumId: string;
  curriculumTitle: string;
}

/**
 * Manages which shop items a child is awarded for completing this curriculum.
 *
 * The grant fires server-side on the curriculum_newly_completed transition and
 * is idempotent, so a child who re-completes never re-earns. Rewards are
 * revealed in the app's gift-box modal in sort_order.
 */
export function CurriculumRewardsModal({
  open,
  onOpenChange,
  curriculumId,
  curriculumTitle,
}: CurriculumRewardsModalProps) {
  const [selectedItemId, setSelectedItemId] = React.useState<string>("");

  const { data: rewards, isLoading } = useCurriculumRewards(open ? curriculumId : null);
  const { data: stickers } = useShopItems("sticker");
  const addMutation = useAddCurriculumReward();
  const removeMutation = useRemoveCurriculumReward(curriculumId);

  React.useEffect(() => {
    if (open) setSelectedItemId("");
  }, [open]);

  // Don't offer items this curriculum already awards
  const availableStickers = React.useMemo(() => {
    if (!stickers) return [];
    const taken = new Set((rewards ?? []).map((r) => r.item_id));
    return stickers.filter((s) => !taken.has(s.id) && s.is_active);
  }, [stickers, rewards]);

  const handleAdd = React.useCallback(async () => {
    if (!selectedItemId) return;
    await addMutation.mutateAsync({
      curriculumId,
      itemId: selectedItemId,
      sortOrder: rewards?.length ?? 0,
    });
    setSelectedItemId("");
  }, [selectedItemId, curriculumId, rewards, addMutation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Completion Rewards
          </DialogTitle>
          <DialogDescription>
            Stickers awarded when a child finishes “{curriculumTitle}”. Revealed in
            the gift box at the end of the last lesson.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !rewards || rewards.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No rewards yet. Children finishing this curriculum see no gift box.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                    {reward.shop_items?.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={reward.shop_items.image_url}
                        alt={reward.shop_items.name}
                        className="h-full w-full object-contain"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {reward.shop_items?.name ?? "Unknown item"}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {reward.shop_items?.category}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMutation.mutate(reward.id)}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 border-t pt-4">
            <div className="flex-1 space-y-2">
              <Select
                value={selectedItemId}
                onValueChange={setSelectedItemId}
                disabled={availableStickers.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      availableStickers.length === 0
                        ? "No stickers available"
                        : "Choose a sticker…"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableStickers.map((sticker) => (
                    <SelectItem key={sticker.id} value={sticker.id}>
                      {sticker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={!selectedItemId || addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </div>

          {stickers && stickers.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No stickers exist yet — create one in Shop first.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
