"use client";

import type { Asset } from "@/lib/types/assets";
import { AssetCard } from "./AssetCard";

interface AssetGridProps {
  assets: Asset[];
  onEdit: (asset: Asset) => void;
  onLabel: (asset: Asset) => void;
  onRetire: (asset: Asset) => void;
  onRestore: (asset: Asset) => void;
  onCopyUrl: (url: string) => void;
}

export function AssetGrid({
  assets,
  onEdit,
  onLabel,
  onRetire,
  onRestore,
  onCopyUrl,
}: AssetGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onEdit={onEdit}
          onLabel={onLabel}
          onRetire={onRetire}
          onRestore={onRestore}
          onCopyUrl={onCopyUrl}
        />
      ))}
    </div>
  );
}
