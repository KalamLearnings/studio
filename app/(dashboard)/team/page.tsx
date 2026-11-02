"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Plus, Trash2, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useStaff,
  useAddStaffMember,
  useRemoveStaffMember,
  staffErrorMessage,
  normalizeEmail,
} from "@/lib/hooks/useStaff";
import type { StaffMember } from "@/lib/api/staff";
import { getClientForEnv } from "@/lib/supabase/client";
import { useEnvironmentStore } from "@/lib/stores/environmentStore";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatLastSignIn(value: string | null): { label: string; title?: string } {
  if (!value) return { label: "Never" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { label: "Unknown" };
  return {
    label: formatDistanceToNow(date, { addSuffix: true }),
    title: date.toLocaleString(),
  };
}

function StaffRow({
  member,
  isCurrentUser,
  isOnlyMember,
  onRemove,
}: {
  member: StaffMember;
  isCurrentUser: boolean;
  isOnlyMember: boolean;
  onRemove: (member: StaffMember) => void;
}) {
  const lastSignIn = formatLastSignIn(member.lastSignInAt);

  return (
    <tr className="border-b last:border-b-0">
      <td className="p-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">{member.email}</span>
          {isCurrentUser && <Badge variant="secondary">You</Badge>}
        </div>
      </td>
      <td className="p-3 text-muted-foreground" title={lastSignIn.title}>
        {lastSignIn.label}
      </td>
      <td className="p-3 text-muted-foreground">
        {new Date(member.createdAt).toLocaleDateString()}
      </td>
      <td className="p-3 text-right">
        {!isCurrentUser && (
          <span
            title={isOnlyMember ? "The team needs at least one member" : undefined}
          >
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={isOnlyMember}
              onClick={() => onRemove(member)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </span>
        )}
      </td>
    </tr>
  );
}

export default function TeamPage() {
  const { environment } = useEnvironmentStore();
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [newEmail, setNewEmail] = React.useState("");
  const [emailTouched, setEmailTouched] = React.useState(false);
  const [pendingRemoval, setPendingRemoval] = React.useState<StaffMember | null>(null);

  const { data: members, isLoading, error } = useStaff();
  const addMutation = useAddStaffMember();
  const removeMutation = useRemoveStaffMember();

  React.useEffect(() => {
    const supabase = getClientForEnv(environment);
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, [environment]);

  const sortedMembers = React.useMemo(
    () =>
      [...(members ?? [])].sort((a, b) => a.email.localeCompare(b.email)),
    [members]
  );

  const trimmedEmail = newEmail.trim();
  const emailIsValid = EMAIL_PATTERN.test(trimmedEmail);
  const alreadyMember = sortedMembers.some(
    (m) => normalizeEmail(m.email) === normalizeEmail(trimmedEmail)
  );
  const emailError = !emailTouched || !trimmedEmail
    ? null
    : !emailIsValid
      ? "Enter a valid email address"
      : alreadyMember
        ? "Already on the team"
        : null;

  const resetAddDialog = React.useCallback(() => {
    setNewEmail("");
    setEmailTouched(false);
  }, []);

  const handleAddDialogChange = React.useCallback(
    (open: boolean) => {
      setIsAddDialogOpen(open);
      if (!open) resetAddDialog();
    },
    [resetAddDialog]
  );

  const handleAdd = React.useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      setEmailTouched(true);
      if (!emailIsValid || alreadyMember) return;
      try {
        await addMutation.mutateAsync(trimmedEmail);
        setIsAddDialogOpen(false);
        resetAddDialog();
      } catch {
        // toast shown by the mutation
      }
    },
    [emailIsValid, alreadyMember, trimmedEmail, addMutation, resetAddDialog]
  );

  const handleConfirmRemove = React.useCallback(async () => {
    if (!pendingRemoval) return;
    try {
      await removeMutation.mutateAsync(pendingRemoval);
    } catch {
      // toast shown by the mutation
    }
    setPendingRemoval(null);
  }, [pendingRemoval, removeMutation]);

  const isOnlyMember = sortedMembers.length <= 1;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 p-12 text-center">
        <p className="text-destructive">Failed to load the team</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {staffErrorMessage(error, "Something went wrong")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">
            People who can sign in to Studio
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add member
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && sortedMembers.length > 0 && (
        <div className="rounded-md border bg-background">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left text-sm font-medium">Email</th>
                <th className="p-3 text-left text-sm font-medium">Last sign-in</th>
                <th className="p-3 text-left text-sm font-medium">Account created</th>
                <th className="p-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((member) => (
                <StaffRow
                  key={member.userId}
                  member={member}
                  isCurrentUser={member.userId === currentUserId}
                  isOnlyMember={isOnlyMember}
                  onRemove={setPendingRemoval}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && sortedMembers.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No team members</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add someone by email to give them access to Studio
          </p>
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogChange}>
        <DialogContent>
          <form onSubmit={handleAdd}>
            <DialogHeader>
              <DialogTitle>Add team member</DialogTitle>
              <DialogDescription>
                They&apos;ll sign in to Studio with this email using a one-time code.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                autoComplete="off"
                autoFocus
                placeholder="name@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                aria-invalid={!!emailError}
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddDialogChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!emailIsValid || alreadyMember || addMutation.isPending}
              >
                {addMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add member"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pendingRemoval}
        onOpenChange={(open) => {
          if (!open && !removeMutation.isPending) setPendingRemoval(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove team member?</DialogTitle>
            <DialogDescription>
              {pendingRemoval?.email} will lose access to Studio.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingRemoval(null)}
              disabled={removeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
