/**
 * The decision ledger behind Review's Undo (CW-3, owner answer 7). Pure: the
 * timer functions are injected, so tests drive it with fake timers.
 *
 * Two kinds of decision:
 * - `inverse`: sent at once; Undo sends the inverse route (approve and
 *   withdraw, note and clear, reads-as and clear).
 * - `hold`: a one-way decision (draft approve or reject, take review, split
 *   review, fulfil, decline, a respelling) is held for `holdMs` before it is
 *   sent, so Undo cancels it and nothing reaches the server.
 *
 * Undo works on the newest decision that is still inside its window (`holdMs`
 * from when it was made). After that a reversible decision is undone from the
 * pane (Withdraw approval, Clear note), never from the toast.
 */

export type DecisionMode = "inverse" | "hold";

export interface DecisionInput {
  /** The inbox item the decision is about. */
  itemKey: string;
  mode: DecisionMode;
  /** Sends the decision. Rejects with the reason to show. */
  run: () => Promise<void>;
  /** Sends the inverse (inverse decisions only). */
  undo?: () => Promise<void>;
}

export type DecisionStatus =
  | "held" // waiting out the hold; Undo cancels
  | "sending"
  | "done"
  | "failed"
  | "cancelled" // a held decision undone before it was sent
  | "undoing"
  | "undone"
  | "undo_failed";

export interface Decision extends DecisionInput {
  id: number;
  status: DecisionStatus;
  createdAt: number;
  error?: unknown;
}

export interface LedgerTimers {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

export interface LedgerOptions {
  holdMs?: number;
  timers?: LedgerTimers;
  /** Called after every status change. */
  onChange?: (d: Decision) => void;
}

export const HOLD_MS = 5_000;

/** Statuses after which nothing more happens to a decision. */
export const SETTLED: ReadonlySet<DecisionStatus> = new Set<DecisionStatus>(["done", "failed", "cancelled", "undone", "undo_failed"]);

const realTimers: LedgerTimers = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (h) => globalThis.clearTimeout(h as ReturnType<typeof setTimeout>),
};

export class DecisionLedger {
  private readonly holdMs: number;
  private readonly timers: LedgerTimers;
  private readonly onChange?: (d: Decision) => void;
  private readonly decisions: Decision[] = [];
  private readonly holds = new Map<number, unknown>();
  private seq = 0;

  constructor(opts: LedgerOptions = {}) {
    this.holdMs = opts.holdMs ?? HOLD_MS;
    this.timers = opts.timers ?? realTimers;
    this.onChange = opts.onChange;
  }

  /** Records a decision: held ones wait `holdMs`, inverse ones are sent now. */
  submit(input: DecisionInput): Decision {
    if (input.mode === "inverse" && !input.undo) throw new Error("An inverse decision needs an undo.");
    const d: Decision = { ...input, id: ++this.seq, status: input.mode === "hold" ? "held" : "sending", createdAt: this.timers.now() };
    this.decisions.push(d);
    this.emit(d);
    if (d.mode === "hold") {
      this.holds.set(d.id, this.timers.setTimeout(() => void this.send(d), this.holdMs));
    } else {
      void this.send(d);
    }
    return d;
  }

  /** The newest decision Undo would act on, if any. */
  undoable(): Decision | null {
    const now = this.timers.now();
    for (let i = this.decisions.length - 1; i >= 0; i--) {
      const d = this.decisions[i];
      if (now - d.createdAt > this.holdMs) return null;
      if (d.status === "held" || (d.mode === "inverse" && (d.status === "done" || d.status === "sending"))) return d;
    }
    return null;
  }

  /** Undoes the newest undoable decision. Resolves to it, or null when there is nothing to undo. */
  async undo(): Promise<Decision | null> {
    const d = this.undoable();
    if (!d) return null;
    if (d.status === "held") {
      this.timers.clearTimeout(this.holds.get(d.id));
      this.holds.delete(d.id);
      this.set(d, "cancelled");
      return d;
    }
    // An inverse decision still being sent: let it land before sending the inverse.
    if (d.status === "sending") await this.whenSettled(d);
    if (d.status !== "done") return d;
    this.set(d, "undoing");
    try {
      await d.undo!();
      this.set(d, "undone");
    } catch (e) {
      d.error = e;
      this.set(d, "undo_failed");
    }
    return d;
  }

  /** Sends every held decision now (the page is closing). */
  flush(): void {
    for (const d of this.decisions) {
      if (d.status !== "held") continue;
      this.timers.clearTimeout(this.holds.get(d.id));
      this.holds.delete(d.id);
      void this.send(d);
    }
  }

  /** Decisions not settled yet (held, sending or undoing). */
  open(): Decision[] {
    return this.decisions.filter((d) => !SETTLED.has(d.status));
  }

  private readonly waiters = new Map<number, Array<() => void>>();

  private whenSettled(d: Decision): Promise<void> {
    return new Promise((resolve) => {
      const list = this.waiters.get(d.id) ?? [];
      list.push(resolve);
      this.waiters.set(d.id, list);
    });
  }

  private async send(d: Decision): Promise<void> {
    this.holds.delete(d.id);
    if (d.status === "held") this.set(d, "sending");
    try {
      await d.run();
      this.set(d, "done");
    } catch (e) {
      d.error = e;
      this.set(d, "failed");
    }
    const waiting = this.waiters.get(d.id);
    this.waiters.delete(d.id);
    waiting?.forEach((w) => w());
  }

  private set(d: Decision, status: DecisionStatus): void {
    d.status = status;
    this.emit(d);
  }

  private emit(d: Decision): void {
    this.onChange?.({ ...d });
  }
}
