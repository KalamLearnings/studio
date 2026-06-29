"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface NodeNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the chosen name when the user confirms. Cancel/close creates nothing. */
  onConfirm: (name: string) => void;
}

const DEFAULT_NAME = "New Node";

/**
 * Asks for a node name before creating a node. Replaces the old one-click "+"
 * that instantly created a "New Node" — that was easy to fat-finger and left
 * stray nodes behind. Cancel (or closing) creates nothing.
 */
export function NodeNameModal({ open, onOpenChange, onConfirm }: NodeNameModalProps) {
  const [name, setName] = React.useState(DEFAULT_NAME);

  // Reset to the default each time the modal opens.
  React.useEffect(() => {
    if (open) setName(DEFAULT_NAME);
  }, [open]);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Node</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="node-name">Name</Label>
          <Input
            id="node-name"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirm();
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
