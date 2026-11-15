"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useAssets } from "@/lib/hooks/useAssets";
import { AssetUploadModal, AssetEditModal, AssetLabelDialog } from "@/components/assets";
import type { Asset, AssetCategory } from "@/lib/types/assets";
import { toast } from "sonner";
import {
  AssetsHeader,
  AssetsFilters,
  AssetGrid,
  AssetTable,
  AssetsEmptyState,
} from "./_components";

export default function AssetsPage() {
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [labellingAsset, setLabellingAsset] = React.useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = React.useState<Asset | null>(null);

  const {
    assets,
    loading,
    error,
    selectedCategory,
    searchQuery,
    setCategory,
    setSearchQuery,
    selectedStatus,
    setStatus,
    uploadNewAsset,
    editAsset,
    changeAssetStatus,
    applyRegistryAsset,
  } = useAssets();

  const handleCopyUrl = React.useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  }, []);

  const handleUpload = React.useCallback(
    async (data: {
      displayName: string;
      category: AssetCategory;
      tags: string[];
      file: File;
    }) => {
      try {
        await uploadNewAsset(data);
        toast.success("Asset uploaded");
      } catch {
        toast.error("Failed to upload asset");
        throw new Error("Failed to upload asset");
      }
    },
    [uploadNewAsset]
  );

  // Library fields, or a replace when a new file is chosen (the old image is
  // superseded and keeps showing where it is already used).
  const handleSaveEdit = React.useCallback(
    async (
      asset: Asset,
      data: { displayName: string; category: AssetCategory; tags: string[]; file?: File }
    ) => {
      await editAsset(asset, data);
      toast.success(data.file ? "Image replaced" : "Asset updated");
    },
    [editAsset]
  );

  // Nothing is deleted (D9): retiring hides the image from the library.
  const handleRetire = React.useCallback(
    async (asset: Asset) => {
      if (!confirm("Retire this asset? It is hidden from the library but keeps showing where it is already used.")) return;
      try {
        await changeAssetStatus(asset, "retired");
        toast.success("Asset retired");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to retire asset");
      }
    },
    [changeAssetStatus]
  );

  const handleRestore = React.useCallback(
    async (asset: Asset) => {
      try {
        await changeAssetStatus(asset, "active");
        toast.success("Asset restored");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to restore asset");
      }
    },
    [changeAssetStatus]
  );

  const hasFilters = !!(searchQuery || selectedCategory || selectedStatus);

  return (
    <div className="space-y-6">
      <AssetsHeader onUpload={() => setIsUploadModalOpen(true)} />

      <AssetsFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setCategory}
        selectedStatus={selectedStatus}
        onStatusChange={setStatus}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 p-4 text-center text-destructive">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Assets Grid View */}
      {!loading && assets.length > 0 && viewMode === "grid" && (
        <AssetGrid
          assets={assets}
          onEdit={setEditingAsset}
          onLabel={setLabellingAsset}
          onRetire={handleRetire}
          onRestore={handleRestore}
          onCopyUrl={handleCopyUrl}
        />
      )}

      {/* Assets List View */}
      {!loading && assets.length > 0 && viewMode === "list" && (
        <AssetTable
          assets={assets}
          onEdit={setEditingAsset}
          onLabel={setLabellingAsset}
          onRetire={handleRetire}
          onRestore={handleRestore}
          onCopyUrl={handleCopyUrl}
        />
      )}

      {/* Empty State */}
      {!loading && assets.length === 0 && (
        <AssetsEmptyState
          hasFilters={hasFilters}
          onUpload={() => setIsUploadModalOpen(true)}
        />
      )}

      {/* Upload Modal */}
      <AssetUploadModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        onUpload={handleUpload}
        defaultCategory={selectedCategory}
      />

      {/* Edit Modal */}
      <AssetEditModal
        asset={editingAsset}
        open={!!editingAsset}
        onOpenChange={(open) => !open && setEditingAsset(null)}
        onSave={handleSaveEdit}
      />

      {/* Label Dialog */}
      <AssetLabelDialog
        assetId={labellingAsset?.registryId ?? null}
        name={labellingAsset?.displayName || labellingAsset?.name}
        open={!!labellingAsset}
        onOpenChange={(open) => !open && setLabellingAsset(null)}
        onLabelled={applyRegistryAsset}
      />
    </div>
  );
}
