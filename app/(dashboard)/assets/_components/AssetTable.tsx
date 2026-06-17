"use client";

import {
  ImageIcon,
  MoreVertical,
  Trash2,
  Download,
  Copy,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Asset } from "@/lib/types/assets";

interface AssetTableProps {
  assets: Asset[];
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
  onCopyUrl: (url: string) => void;
}

export function AssetTable({ assets, onEdit, onDelete, onCopyUrl }: AssetTableProps) {
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left text-sm font-medium">Name</th>
            <th className="p-3 text-left text-sm font-medium">Category</th>
            <th className="p-3 text-left text-sm font-medium">Tags</th>
            <th className="p-3 text-left text-sm font-medium">Created</th>
            <th className="p-3 text-right text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id} className="border-b hover:bg-muted/50">
              <td className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted overflow-hidden flex-shrink-0">
                    {asset.url ? (
                      <img
                        src={asset.url}
                        alt={asset.displayName || asset.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="font-medium truncate max-w-[200px]">
                    {asset.displayName || asset.name}
                  </span>
                </div>
              </td>
              <td className="p-3 text-muted-foreground capitalize">
                {asset.category}
              </td>
              <td className="p-3 text-muted-foreground text-sm">
                {asset.tags && asset.tags.length > 0
                  ? asset.tags.slice(0, 3).join(", ") +
                    (asset.tags.length > 3 ? "..." : "")
                  : "-"}
              </td>
              <td className="p-3 text-muted-foreground">
                {asset.createdAt
                  ? new Date(asset.createdAt).toLocaleDateString()
                  : "N/A"}
              </td>
              <td className="p-3 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(asset)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
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
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(asset.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
