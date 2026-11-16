"use client";

/** Puts the page's title into the app header's slot (components/layout/header.tsx). */

import * as React from "react";
import { createPortal } from "react-dom";
import { PAGE_HEADER_SLOT_ID } from "@/components/layout/header";

export function HeaderSlot({ children }: { children: React.ReactNode }) {
  const [el, setEl] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => setEl(document.getElementById(PAGE_HEADER_SLOT_ID)), []);
  return el ? createPortal(children, el) : null;
}
