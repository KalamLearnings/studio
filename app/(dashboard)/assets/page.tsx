"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useAssets } from "@/lib/hooks/useAssets";
import { AssetUploadModal, AssetEditModal } from "@/components/assets";
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
  const [editingAsset, setEditingAsset] = React.useState<Asset | null>(null);

  const {
    assets,
    loading,
    error,
    selectedCategory,
    searchQuery,
    setCategory,
    setSearchQuery,
    uploadNewAsset,
    updateExistingAsset,
    removeAsset,
  } = useAssets();

  const handleCopyUrl = React.useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  }, []);

  const handleEdit = React.useCallback((asset: Asset) => {
    setEditingAsset(asset);
  }, []);

  const handleSaveEdit = React.useCallback(
    async (
      id: string,
      data: {
        displayName?: string;
        category?: AssetCategory;
        tags?: string[];
        file?: File;
      }
    ) => {
      try {
        await updateExistingAsset(id, data);
        toast.success("Asset updated");
      } catch {
        toast.error("Failed to update asset");
        throw new Error("Failed to update asset");
      }
    },
    [updateExistingAsset]
  );

  const handleDelete = React.useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this asset?")) return;
      try {
        await removeAsset(id);
        toast.success("Asset deleted");
      } catch {
        toast.error("Failed to delete asset");
      }
    },
    [removeAsset]
  );

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

  const hasFilters = !!(searchQuery || selectedCategory);

  return (
    <div className="space-y-6">
      <AssetsHeader onUpload={() => setIsUploadModalOpen(true)} />

      <AssetsFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setCategory}
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
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopyUrl={handleCopyUrl}
        />
      )}

      {/* Assets List View */}
      {!loading && assets.length > 0 && viewMode === "list" && (
        <AssetTable
          assets={assets}
          onEdit={handleEdit}
          onDelete={handleDelete}
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
    </div>
  );
}
