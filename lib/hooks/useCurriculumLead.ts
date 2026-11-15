/** Whether the signed-in staff member is a curriculum lead (CM-S9), read from the session like the team page. */

import { useEffect, useState } from 'react';
import { getClientForEnv } from '@/lib/supabase/client';
import { useEnvironmentStore } from '@/lib/stores/environmentStore';
import { isCurriculumLead } from '@/lib/generation/drafts';

export function useCurriculumLead(): boolean {
  const { environment } = useEnvironmentStore();
  const [lead, setLead] = useState(false);
  useEffect(() => {
    getClientForEnv(environment)
      .auth.getUser()
      .then(({ data: { user } }) => setLead(isCurriculumLead(user)));
  }, [environment]);
  return lead;
}
