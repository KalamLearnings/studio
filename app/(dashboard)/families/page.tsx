import { redirect } from "next/navigation";
import { legacyRedirect } from "@/lib/connections/keys";

/** Families live on the Words page now (CG-1): `/families?family=<id>` opens that word there. */
export default function FamiliesPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  redirect(legacyRedirect("families", searchParams));
}
