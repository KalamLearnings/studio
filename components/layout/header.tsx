"use client";

import { ThemeToggle } from "./theme-toggle";
import { EnvironmentIndicator } from "./environment-banner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Search } from "lucide-react";
import type { Environment } from "@/lib/stores/environmentStore";

interface HeaderProps {
  title?: string;
  environment: Environment;
  onEnvironmentClick?: () => void;
  user?: { email?: string } | null;
}

export function Header({ title, environment, onEnvironmentClick, user }: HeaderProps) {
  const userEmail = user?.email || "";
  const userInitial = userEmail.charAt(0).toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-xl font-semibold">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Search className="h-4 w-4" />
          <span className="sr-only">Search</span>
        </Button>

        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button>

        <EnvironmentIndicator
          environment={environment}
          onClick={onEnvironmentClick}
        />

        <ThemeToggle />

        {user && (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {userInitial}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </header>
  );
}
