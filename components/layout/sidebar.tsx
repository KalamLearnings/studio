"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Image,
  Volume2,
  Type,
  BookMarked,
  Gamepad2,
  LayoutTemplate,
  Ticket,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { title: "Curricula", href: "/curricula", icon: BookOpen },
  { title: "Assets", href: "/assets", icon: Image },
  { title: "Audio", href: "/audio", icon: Volume2 },
  { title: "Words", href: "/words", icon: Type },
  { title: "Books", href: "/books", icon: BookMarked },
  { title: "Games", href: "/games", icon: Gamepad2 },
  { title: "Templates", href: "/templates", icon: LayoutTemplate },
  { title: "Promos", href: "/promo-codes", icon: Ticket },
];

const bottomNavItems: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  onSignOut?: () => void;
}

export function Sidebar({ onSignOut }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-20 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Logo / Brand */}
      <div className="flex h-16 items-center justify-center border-b">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
          K
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="flex flex-col items-center gap-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-center transition-colors w-full",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-6 w-6 shrink-0" />
                <span className="text-[10px] font-medium leading-tight">
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom Nav */}
      <div className="border-t px-2 py-4">
        <nav className="flex flex-col items-center gap-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-center transition-colors w-full",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-6 w-6 shrink-0" />
                <span className="text-[10px] font-medium leading-tight">
                  {item.title}
                </span>
              </Link>
            );
          })}

          {/* Sign Out */}
          <Button
            variant="ghost"
            onClick={onSignOut}
            className="flex flex-col items-center gap-1 h-auto px-2 py-2.5 w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-6 w-6 shrink-0" />
            <span className="text-[10px] font-medium leading-tight">
              Sign Out
            </span>
          </Button>
        </nav>
      </div>
    </aside>
  );
}
