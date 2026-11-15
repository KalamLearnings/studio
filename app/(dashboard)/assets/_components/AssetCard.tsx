"use client";

import * as React from "react";
import {
  ImageIcon,
  MoreVertical,
  Trash2,
  Download,
  Copy,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Asset } from "@/lib/types/assets";
import { AssetStatusBadge } from "@/components/assets/AssetStatusBadge";

interface AssetCardProps {
  asset: Asset;
  onLabel: (asset: Asset) => void;
  onCopyUrl: (url: string) => void;
}

export const AssetCard = React.memo(function AssetCard({
  asset,
  onLabel,
  onCopyUrl,
}: AssetCardProps) {
  return (
    <Card className="group overflow-hidden">
      <div className="relative aspect-square bg-muted">
        {asset.url ? (
          <img
            src={asset.url}
            alt={asset.displayName || asset.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                disabled={asset.registryId === null}
                onClick={() => onLabel(asset)}
              >
                <Tag className="mr-2 h-4 w-4" />
                Label
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopyUrl(asset.url)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy URL
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={asset.url} download={asset.name}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Nothing is deleted (D9): retiring is a status change with no backend route yet. */}
              <DropdownMenuItem disabled>
                <Trash2 className="mr-2 h-4 w-4" />
                Retire (not available yet)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <CardContent className="p-3">
        <p className="truncate text-sm font-medium">
          {asset.displayName || asset.name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {asset.category && (
            <p className="text-xs text-muted-foreground capitalize">{asset.category}</p>
          )}
          <AssetStatusBadge status={asset.status} />
          {asset.tags && asset.tags.length > 0 && (
            <p className="text-xs text-muted-foreground">
              · {asset.tags.length} tag{asset.tags.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
