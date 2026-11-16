"use client";

/**
 * Sends a plan (`lib/connections/connect.ts`) and offers Undo in the toast:
 * Undo sends the inverse routes. The library is read again after each, so
 * the frame shows what the server has. A refusal shows in plain words.
 */

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { inverseOps, runOps, type Op } from "@/lib/connections/ops";
import { connectErrorText } from "@/lib/connections/refusals";
import { useWordsEditApi } from "./api";

export interface RunPlan {
  ops: Op[];
  /** The toast: plain text, then the Arabic it is about. */
  message: string;
  arabic?: string;
  /** Said after Undo when the undo leaves something behind (a created family stays). */
  undoNote?: string;
}

function ToastText({ text, arabic }: { text: string; arabic?: string }) {
  return (
    <span>
      {text}
      {arabic && (
        <span lang="ar" dir="rtl" className="ms-1.5 font-naskh text-base [unicode-bidi:isolate]">
          {arabic}
        </span>
      )}
    </span>
  );
}

export function useConnectRun() {
  const api = useWordsEditApi();
  const queryClient = useQueryClient();
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["connections"] });
    // Review reads the same rows under its own keys.
    void queryClient.invalidateQueries({ queryKey: ["word-families"] });
    void queryClient.invalidateQueries({ queryKey: ["concept-details"] });
  }, [queryClient]);

  const run = React.useCallback(
    async (plan: RunPlan): Promise<boolean> => {
      if (busy || plan.ops.length === 0) return false;
      setBusy(true);
      try {
        await runOps(api.connect, plan.ops);
      } catch (e) {
        toast.error(connectErrorText(e));
        await refresh();
        setBusy(false);
        return false;
      }
      await refresh();
      setBusy(false);
      const undo = async () => {
        try {
          await runOps(api.connect, inverseOps(plan.ops));
          toast.success(plan.undoNote ? `Undone. ${plan.undoNote}` : "Undone.");
        } catch (e) {
          toast.error(`Undo failed: ${connectErrorText(e)}`);
        }
        await refresh();
      };
      toast(<ToastText text={plan.message} arabic={plan.arabic} />, {
        duration: 8_000,
        action: { label: "Undo", onClick: () => void undo() },
      });
      return true;
    },
    [api, busy, refresh],
  );

  return { run, busy };
}
