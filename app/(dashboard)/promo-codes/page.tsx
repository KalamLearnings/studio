"use client";

import * as React from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  Ticket,
  Copy,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePromoCodes,
  useCreatePromoCode,
  useUpdatePromoCode,
  useDeletePromoCode,
} from "@/lib/hooks/usePromoCodes";
import type { PromoCode, PromoPlanType } from "@/lib/api/promoCodes";
import { toast } from "sonner";

const PLAN_LABELS: Record<PromoPlanType, string> = {
  monthly: "1 Month",
  two_month: "2 Months",
  three_month: "3 Months",
  six_month: "6 Months",
  yearly: "1 Year",
  lifetime: "Lifetime",
};

const PromoRow = React.memo(function PromoRow({
  promo,
  copiedCode,
  onCopy,
  onToggleActive,
  onDelete,
}: {
  promo: PromoCode;
  copiedCode: string | null;
  onCopy: (code: string) => void;
  onToggleActive: (id: string, currentlyActive: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <tr className="border-b">
      <td className="p-3">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-muted-foreground" />
          <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
            {promo.code}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onCopy(promo.code)}
          >
            {copiedCode === promo.code ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </td>
      <td className="p-3 text-muted-foreground">
        {promo.description || "No description"}
      </td>
      <td className="p-3">
        <span className="font-medium">
          {PLAN_LABELS[promo.plan_type] || promo.plan_type}
        </span>
      </td>
      <td className="p-3 text-muted-foreground">
        {promo.current_redemptions}
        {promo.max_redemptions && ` / ${promo.max_redemptions}`}
      </td>
      <td className="p-3 text-muted-foreground">
        {promo.expires_at
          ? new Date(promo.expires_at).toLocaleDateString()
          : "Never"}
      </td>
      <td className="p-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            promo.is_active
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {promo.is_active ? (
            <Check className="h-3 w-3" />
          ) : (
            <X className="h-3 w-3" />
          )}
          {promo.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="p-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onToggleActive(promo.id, promo.is_active)}
            >
              {promo.is_active ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Deactivate
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Activate
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(promo.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});

export default function PromoCodesPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
  const [newCode, setNewCode] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newPlanType, setNewPlanType] = React.useState<PromoPlanType>("monthly");
  const [newMaxRedemptions, setNewMaxRedemptions] = React.useState("");
  const [newExpiresAt, setNewExpiresAt] = React.useState("");

  const { data: promoCodes, isLoading, error } = usePromoCodes();
  const createMutation = useCreatePromoCode();
  const updateMutation = useUpdatePromoCode();
  const deleteMutation = useDeletePromoCode();

  const filteredCodes = React.useMemo(() => {
    if (!promoCodes) return [];
    if (!searchQuery) return promoCodes;

    const query = searchQuery.toLowerCase();
    return promoCodes.filter(
      (code) =>
        code.code.toLowerCase().includes(query) ||
        code.description?.toLowerCase().includes(query)
    );
  }, [promoCodes, searchQuery]);

  const stats = React.useMemo(() => {
    if (!promoCodes) {
      return { active: 0, totalRedemptions: 0, expiringSoon: 0, fullyRedeemed: 0 };
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      active: promoCodes.filter((c) => c.is_active).length,
      totalRedemptions: promoCodes.reduce(
        (sum, c) => sum + c.current_redemptions,
        0
      ),
      expiringSoon: promoCodes.filter((c) => {
        if (!c.expires_at) return false;
        const expiry = new Date(c.expires_at);
        return expiry > now && expiry <= thirtyDaysFromNow;
      }).length,
      fullyRedeemed: promoCodes.filter(
        (c) =>
          c.max_redemptions !== null &&
          c.max_redemptions > 0 &&
          c.current_redemptions >= c.max_redemptions
      ).length,
    };
  }, [promoCodes]);

  const handleCopyCode = React.useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  const handleToggleActive = React.useCallback(
    (id: string, currentlyActive: boolean) => {
      updateMutation.mutate({
        id,
        data: { is_active: !currentlyActive },
      });
    },
    [updateMutation]
  );

  const handleDelete = React.useCallback(
    (id: string) => {
      if (confirm("Are you sure you want to delete this promo code?")) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation]
  );

  const handleCreate = React.useCallback(async () => {
    if (!newCode.trim()) return;

    await createMutation.mutateAsync({
      code: newCode.toUpperCase(),
      plan_type: newPlanType,
      description: newDescription || undefined,
      max_redemptions: newMaxRedemptions
        ? parseInt(newMaxRedemptions, 10)
        : undefined,
      expires_at: newExpiresAt || undefined,
    });

    setIsCreateDialogOpen(false);
    setNewCode("");
    setNewDescription("");
    setNewPlanType("monthly");
    setNewMaxRedemptions("");
    setNewExpiresAt("");
  }, [
    newCode,
    newPlanType,
    newDescription,
    newMaxRedemptions,
    newExpiresAt,
    createMutation,
  ]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 p-12 text-center">
        <p className="text-destructive">Failed to load promo codes</p>
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
          <h1 className="text-2xl font-bold">Promo Codes</h1>
          <p className="text-muted-foreground">
            Manage promotional codes and discounts
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Code
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Codes</CardDescription>
            <CardTitle className="text-3xl">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Redemptions</CardDescription>
            <CardTitle className="text-3xl">{stats.totalRedemptions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expiring Soon</CardDescription>
            <CardTitle className="text-3xl">{stats.expiringSoon}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fully Redeemed</CardDescription>
            <CardTitle className="text-3xl">{stats.fullyRedeemed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search promo codes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Promo Codes Table */}
      {!isLoading && filteredCodes.length > 0 && (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left text-sm font-medium">Code</th>
                <th className="p-3 text-left text-sm font-medium">Description</th>
                <th className="p-3 text-left text-sm font-medium">Plan</th>
                <th className="p-3 text-left text-sm font-medium">Usage</th>
                <th className="p-3 text-left text-sm font-medium">Expires</th>
                <th className="p-3 text-left text-sm font-medium">Status</th>
                <th className="p-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCodes.map((promo) => (
                <PromoRow
                  key={promo.id}
                  promo={promo}
                  copiedCode={copiedCode}
                  onCopy={handleCopyCode}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredCodes.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Ticket className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No promo codes found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery
              ? "Try a different search term"
              : "Create your first promo code"}
          </p>
          {!searchQuery && (
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Code
            </Button>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Promo Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="e.g., SUMMER2024"
                className="uppercase"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="What is this code for?"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Plan Type</Label>
              <Select
                value={newPlanType}
                onValueChange={(v) => setNewPlanType(v as PromoPlanType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLAN_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="limit">Usage Limit</Label>
                <Input
                  id="limit"
                  type="number"
                  placeholder="Unlimited"
                  value={newMaxRedemptions}
                  onChange={(e) => setNewMaxRedemptions(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires">Expires</Label>
                <Input
                  id="expires"
                  type="date"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newCode.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Code"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
