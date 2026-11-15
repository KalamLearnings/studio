/** Whether the signed-in staff member may approve phrases (CM-S11), read from the session like `useCurriculumLead`. */

import { useEffect, useState } from 'react';
import { getClientForEnv } from '@/lib/supabase/client';
import { useEnvironmentStore } from '@/lib/stores/environmentStore';
import { isPhraseReviewer } from '@/lib/phrases/phraseReview';

export function usePhraseReviewer(): boolean {
  const { environment } = useEnvironmentStore();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    getClientForEnv(environment)
      .auth.getUser()
      .then(({ data: { user } }) => setOk(isPhraseReviewer(user)));
  }, [environment]);
  return ok;
}
