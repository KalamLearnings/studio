import { redirect } from "next/navigation";
import { legacyRedirect } from "@/lib/connections/keys";

/** Meanings (concepts) live on the Words page now (CG-1): `/concepts?concept=<slug>` opens that meaning there. */
export default function ConceptsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  redirect(legacyRedirect("concepts", searchParams));
}
