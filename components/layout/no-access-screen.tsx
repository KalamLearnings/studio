"use client";

import { LogOut, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface NoAccessScreenProps {
  email?: string;
  onSignOut: () => void;
}

export function NoAccessScreen({ email, onSignOut }: NoAccessScreenProps) {
  return (
    <div className="flex h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>You don&apos;t have access to Studio</CardTitle>
          <CardDescription>
            {email ? (
              <>
                You&apos;re signed in as{" "}
                <span className="font-medium text-foreground">{email}</span>,
                which isn&apos;t on the Studio team.
              </>
            ) : (
              "This account isn't on the Studio team."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ask a team member to add you. If you were just added, sign out and
            sign in again.
          </p>
          <Button onClick={onSignOut} className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
