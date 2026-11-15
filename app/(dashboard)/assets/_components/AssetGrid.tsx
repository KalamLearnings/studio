"use client";

import type { Asset } from "@/lib/types/assets";
import { AssetCard } from "./AssetCard";

interface AssetGridProps {
  assets: Asset[];
  onLabel: (asset: Asset) => void;
  onCopyUrl: (url: string) => void;
}

export function AssetGrid({ assets, onLabel, onCopyUrl }: AssetGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onLabel={onLabel}
          onCopyUrl={onCopyUrl}
        />
      ))}
    </div>
  );
}
