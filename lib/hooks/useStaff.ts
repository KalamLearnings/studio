/**
 * React Query hooks for Studio staff (team) management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import {
  listStaff,
  addStaffMember,
  removeStaffMember,
  type StaffMember,
} from '@/lib/api/staff';

const STAFF_QUERY_KEY = ['staff'] as const;

export function staffErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'CANNOT_REMOVE_SELF':
        return "You can't remove yourself from the team.";
      case 'LAST_STAFF_MEMBER':
        return "You can't remove the last team member.";
      case 'NOT_STAFF':
        return 'That person is no longer on the team.';
    }
    if (error.status === 403) {
      return "You don't have permission to manage the team. If you were just added, sign out and sign in again.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useStaff() {
  return useQuery({
    queryKey: STAFF_QUERY_KEY,
    queryFn: listStaff,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useAddStaffMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => addStaffMember(normalizeEmail(email)),
    onSuccess: ({ created, alreadyStaff }) => {
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      if (created) {
        toast.success('Added. They can sign in to Studio with this email.');
      } else if (alreadyStaff) {
        toast.info('Already on the team.');
      } else {
        toast.success(
          'Access granted. They can sign in to Studio with this email. If they are already signed in, they need to sign out and sign in again.'
        );
      }
    },
    onError: (error) => {
      toast.error(staffErrorMessage(error, 'Failed to add team member'));
    },
  });
}

export function useRemoveStaffMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (member: StaffMember) => removeStaffMember(member.userId),
    onSuccess: (_result, member) => {
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      toast.success(`Removed ${member.email} from the team.`);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'NOT_STAFF') {
        queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      }
      toast.error(staffErrorMessage(error, 'Failed to remove team member'));
    },
  });
}
