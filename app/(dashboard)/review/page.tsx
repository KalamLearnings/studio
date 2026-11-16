"use client";

/**
 * Review (CW-1): one workspace for every content decision. The old pages
 * (`/families`, `/concepts`, `/review/{blend,words,drafts,phrases}`) keep
 * working until CW-12 removes them.
 */

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ReviewWorkspace } from "@/components/review/ReviewWorkspace";
import { parseReviewUrl } from "@/lib/review/url";

function ReviewFromUrl() {
  const params = useSearchParams();
  // Read once: the workspace owns the state from here and writes it back to the URL.
  const [initial] = React.useState(() => parseReviewUrl(params));
  return <ReviewWorkspace initial={initial} />;
}

export default function ReviewPage() {
  return (
    <React.Suspense fallback={null}>
      <ReviewFromUrl />
    </React.Suspense>
  );
}
