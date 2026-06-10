"use client";

import * as React from "react";

interface UseResizablePanelOptions {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  offsetLeft?: number;
}

export function useResizablePanel({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  offsetLeft = 80,
}: UseResizablePanelOptions) {
  const [width, setWidth] = React.useState(defaultWidth);
  const [isResizing, setIsResizing] = React.useState(false);

  // Load saved width from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsedWidth = parseInt(saved, 10);
      if (!isNaN(parsedWidth) && parsedWidth >= minWidth && parsedWidth <= maxWidth) {
        setWidth(parsedWidth);
      }
    }
  }, [storageKey, minWidth, maxWidth]);

  // Handle resize
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(maxWidth, Math.max(minWidth, e.clientX - offsetLeft));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem(storageKey, width.toString());
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, width, storageKey, minWidth, maxWidth, offsetLeft]);

  return {
    width,
    isResizing,
    handleMouseDown,
  };
}
