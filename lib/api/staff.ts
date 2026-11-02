/**
 * API Client for Studio staff (team) management
 * All functions throw on error - wrap in try/catch
 */

import { fetchWithAuth } from './client';

// ============================================================================
// TYPES
// ============================================================================

export interface StaffMember {
  userId: string;
  email: string;
  lastSignInAt: string | null;
  createdAt: string;
}

export interface AddStaffMemberResult {
  member: StaffMember;
  created: boolean;
  alreadyStaff: boolean;
}

export type StaffErrorCode =
  | 'CANNOT_REMOVE_SELF'
  | 'LAST_STAFF_MEMBER'
  | 'NOT_STAFF';

// ============================================================================
// API FUNCTIONS
// ============================================================================

const STAFF_PATH = '/admin/staff';

export async function listStaff(): Promise<StaffMember[]> {
  return fetchWithAuth<StaffMember[]>(STAFF_PATH);
}

export async function addStaffMember(email: string): Promise<AddStaffMemberResult> {
  return fetchWithAuth<AddStaffMemberResult>(STAFF_PATH, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function removeStaffMember(userId: string): Promise<{ userId: string }> {
  return fetchWithAuth<{ userId: string }>(
    `${STAFF_PATH}/${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  );
}
