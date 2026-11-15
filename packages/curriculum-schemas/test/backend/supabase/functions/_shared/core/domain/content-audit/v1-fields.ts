/**
 * The v1 compatibility rule (CONTENT_MODEL_DESIGN.md section 6, CM-B31, review F8, R2):
 * for every activity, every field the v1 app reads keeps the same value; new fields v1
 * ignores are allowed.
 *
 * v1 (`mobile-app`) reads `POST /curriculum/nodes/activities` and flattens each activity
 * into the object its components receive (`app/(app)/lesson/[nodeId].tsx:180-187`):
 * `{ id, type, nodeId, sequenceNumber, instruction, ...config }`. The config spread comes
 * last, so a config key can override an envelope key. `v1View` builds that object, and the
 * fixture (`tests/golden/v1-fields.json`) lists, per activity type, the paths v1 reads on it.
 *
 * Path syntax: `a.b` walks keys, `a[]` walks every element of an array, `length` on an array
 * or string is its length. The value at the end of a path is compared whole: strings,
 * numbers and booleans exactly; objects key by key, where every key present before must
 * hold the same value after and extra keys after are allowed (v1 ignores them); arrays by
 * length and element. A path marked `strict` compares objects exactly (v1 iterates keys).
 * Presence counts: a read field that appears or disappears is a difference.
 *
 * Pure: no I/O. `scripts/golden/v1-fields.ts` builds deliveries and runs the comparison.
 */

export interface V1FieldPath {
  path: string;
  /** `file:line` in mobile-app where v1 reads it. */
  reads: string[];
  uncertain?: boolean;
  strict?: boolean;
  note?: string;
}

export interface V1TypeFields {
  aliases?: string[];
  files?: string[];
  paths: V1FieldPath[];
  note?: string;
}

export interface V1FieldFixture {
  version: number;
  /** Paths v1 reads on every activity (engine, preloader, lesson screen). */
  common: V1TypeFields;
  types: Record<string, V1TypeFields>;
}

/** One activity as `POST /curriculum/nodes/activities` returns it. */
export interface DeliveredActivity {
  id: string;
  sequence_number?: number | null;
  type: string;
  instruction?: unknown;
  config?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface DeliveredNode {
  nodeId: string;
  activities: DeliveredActivity[];
}

/** The object v1's activity components receive (`lesson/[nodeId].tsx:180-187`). */
export function v1View(activity: DeliveredActivity, nodeId: string): Record<string, unknown> {
  return {
    id: activity.id,
    type: activity.type,
    nodeId,
    sequenceNumber: activity.sequence_number,
    instruction: activity.instruction,
    ...(activity.config ?? {}),
  };
}

/** The v1 type a stored type renders as (aliases such as `write` share an entry). */
export function v1TypeKey(fixture: V1FieldFixture, type: string): string | null {
  if (fixture.types[type]) return type;
  for (const [key, entry] of Object.entries(fixture.types)) {
    if (entry.aliases?.includes(type)) return key;
  }
  return null;
}

/** The paths compared for one activity type: the common paths plus the type's own. */
export function pathsForType(fixture: V1FieldFixture, type: string): V1FieldPath[] {
  const key = v1TypeKey(fixture, type);
  const own = key ? fixture.types[key].paths : [];
  const seen = new Set<string>();
  const out: V1FieldPath[] = [];
  for (const p of [...fixture.common.paths, ...own]) {
    const id = `${p.path}|${p.strict ? 's' : ''}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(p);
  }
  return out;
}

/** Marks a value that is not there (distinct from `null`, which JSON can carry). */
export const ABSENT: unique symbol = Symbol('absent');
type Value = unknown | typeof ABSENT;

/** Marks a non-array where a path expects an array (`a[]`). */
interface NotArray {
  notArray: unknown;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function step(current: Value, key: string): Value {
  if (current === ABSENT || current === null || current === undefined) return ABSENT;
  if (key === 'length' && (Array.isArray(current) || typeof current === 'string')) {
    return current.length;
  }
  if (isObject(current)) return key in current ? current[key] : ABSENT;
  return ABSENT;
}

/** Every concrete location a path reaches, with its value (`ABSENT` when not there). */
export function readPath(root: unknown, path: string): Map<string, Value> {
  let frontier = new Map<string, Value>([['', root]]);
  /** Array lengths and non-arrays met at `[]`: results, not walked further. */
  const ends = new Map<string, Value>();
  for (const segment of path.split('.')) {
    const many = segment.endsWith('[]');
    const key = many ? segment.slice(0, -2) : segment;
    const next = new Map<string, Value>();
    for (const [at, value] of frontier) {
      const here = key ? step(value, key) : value;
      const base = at ? (key ? `${at}.${key}` : at) : key;
      if (!many) {
        next.set(base, here);
        continue;
      }
      if (here === ABSENT) {
        next.set(`${base}[]`, ABSENT);
      } else if (Array.isArray(here)) {
        ends.set(`${base}[]#length`, here.length);
        here.forEach((item, i) => next.set(`${base}[${i}]`, item));
      } else {
        ends.set(`${base}[]`, { notArray: here } satisfies NotArray);
      }
    }
    frontier = next;
  }
  return new Map([...ends, ...frontier]);
}

function canonical(v: unknown): string {
  return JSON.stringify(
    v,
    (_k, value) =>
      isObject(value)
        ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, value[k]]))
        : value,
  );
}

/** Same for v1: see the module header for the rule. */
export function sameForV1(before: Value, after: Value, strict = false): boolean {
  if (before === ABSENT || after === ABSENT) return before === after;
  if (strict) return canonical(before) === canonical(after);
  if (Array.isArray(before)) {
    return Array.isArray(after) && before.length === after.length &&
      before.every((item, i) => sameForV1(item, after[i]));
  }
  if (isObject(before)) {
    return isObject(after) &&
      Object.keys(before).every((k) => k in after && sameForV1(before[k], after[k]));
  }
  return before === after;
}

export type V1DifferenceKind = 'value' | 'activity-removed' | 'activity-added' | 'order';

export interface V1Difference {
  kind: V1DifferenceKind;
  nodeId: string;
  activityId?: string;
  type?: string;
  /** The fixture path, and the concrete location it reached. */
  path?: string;
  at?: string;
  before?: unknown;
  after?: unknown;
}

export interface V1TypeSummary {
  type: string;
  /** The fixture entry it was checked against, or null (v1 has no component for it). */
  v1Type: string | null;
  activities: number;
  paths: number;
  checks: number;
  differences: number;
}

export interface V1Report {
  nodes: number;
  activities: number;
  checks: number;
  differences: V1Difference[];
  types: V1TypeSummary[];
}

function shown(v: Value): unknown {
  return v === ABSENT ? '(absent)' : v;
}

/** Compare two deliveries field by field, over the paths v1 reads for each type. */
export function compareV1Deliveries(
  before: readonly DeliveredNode[],
  after: readonly DeliveredNode[],
  fixture: V1FieldFixture,
): V1Report {
  const afterByNode = new Map(after.map((n) => [n.nodeId, n.activities]));
  const beforeNodes = new Set(before.map((n) => n.nodeId));
  const differences: V1Difference[] = [];
  const types = new Map<string, V1TypeSummary>();
  let activities = 0;
  let checks = 0;

  const summary = (type: string): V1TypeSummary => {
    let s = types.get(type);
    if (!s) {
      s = {
        type,
        v1Type: v1TypeKey(fixture, type),
        activities: 0,
        paths: pathsForType(fixture, type).length,
        checks: 0,
        differences: 0,
      };
      types.set(type, s);
    }
    return s;
  };

  for (const node of before) {
    const afterActivities = afterByNode.get(node.nodeId) ?? [];
    const afterById = new Map(afterActivities.map((a) => [a.id, a]));
    const beforeIds = node.activities.map((a) => a.id);
    const afterIds = afterActivities.map((a) => a.id);

    for (const a of node.activities) {
      activities++;
      const s = summary(a.type);
      s.activities++;
      const b = afterById.get(a.id);
      if (!b) {
        s.differences++;
        differences.push({
          kind: 'activity-removed',
          nodeId: node.nodeId,
          activityId: a.id,
          type: a.type,
        });
        continue;
      }
      const va = v1View(a, node.nodeId);
      const vb = v1View(b, node.nodeId);
      for (const p of pathsForType(fixture, a.type)) {
        const ra = readPath(va, p.path);
        const rb = readPath(vb, p.path);
        for (const at of new Set([...ra.keys(), ...rb.keys()])) {
          const x = ra.has(at) ? ra.get(at) : ABSENT;
          const y = rb.has(at) ? rb.get(at) : ABSENT;
          checks++;
          s.checks++;
          if (sameForV1(x, y, p.strict)) continue;
          s.differences++;
          differences.push({
            kind: 'value',
            nodeId: node.nodeId,
            activityId: a.id,
            type: a.type,
            path: p.path,
            at,
            before: shown(x),
            after: shown(y),
          });
        }
      }
    }

    const beforeSet = new Set(beforeIds);
    for (const b of afterActivities) {
      if (beforeSet.has(b.id)) continue;
      summary(b.type).differences++;
      differences.push({
        kind: 'activity-added',
        nodeId: node.nodeId,
        activityId: b.id,
        type: b.type,
      });
    }
    const kept = afterIds.filter((id) => beforeSet.has(id));
    const keptBefore = beforeIds.filter((id) => afterById.has(id));
    if (kept.join(',') !== keptBefore.join(',')) {
      differences.push({ kind: 'order', nodeId: node.nodeId, before: keptBefore, after: kept });
    }
  }

  for (const node of after) {
    if (beforeNodes.has(node.nodeId)) continue;
    for (const b of node.activities) {
      summary(b.type).differences++;
      differences.push({
        kind: 'activity-added',
        nodeId: node.nodeId,
        activityId: b.id,
        type: b.type,
      });
    }
  }

  return {
    nodes: before.length,
    activities,
    checks,
    differences,
    types: [...types.values()].sort((x, y) => x.type.localeCompare(y.type)),
  };
}
