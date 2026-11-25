import { scanLines } from "./scanLines";

/** The SuperMemo 2 card of a candidate. */
export interface Sm2Card {
  dueDate: string;
  interval: number;
  eFactor: number;
  streak: number;
  lastReviewedAt?: string | null;
}

export interface MassedSlotDecision {
  hasMassedQuestion: boolean;
  massedContainerId: number | null;
  massedServed: number;
  attemptsAnswered: number;
  massedServesLeft: number;
  placesLeft: number;
  chance: number | null;
  draw: number | null;
  servesNow: boolean;
  weekStart: string;
  takenThisWeek: boolean;
}

export interface Sm2Decision {
  algorithm: "sm2";
  recentContainerId: number | null;
  excludedContainerIds: number[];
  candidates: {
    questionContainerId: number;
    card: Sm2Card | null;
    unseen: boolean;
    missed: boolean;
    waits: boolean;
    rank: number;
  }[];
  chosenContainerId: number | null;
}

export interface OptimalDecision {
  algorithm: "optimal";
  at: string;
  targetProbability: number;
  ability: number;
  coefficients: {
    intercept: number;
    itemHistory: number;
    ppes: number;
    ability: number;
  };
  recentServedContainerIds: number[];
  excludedContainerIds: number[];
  candidates: {
    questionContainerId: number;
    itemHistory: number;
    ppes: number;
    logit: number;
    probability: number;
    recent: boolean;
  }[];
  onlyRecentLeft: boolean;
  rule: "closest-to-target" | "highest-below-target" | null;
  chosenContainerId: number | null;
}

export interface PickDecision {
  massedSlot: MassedSlotDecision;
  algorithm: Sm2Decision | OptimalDecision | null;
  chosenBy: "massed-slot" | "algorithm" | "massed-fallback";
}

/** One saved pick, as scripts/nsfv5-export/exportPickTraces.ts in the Podsie repository writes it. */
export interface Pick {
  studySessionQuestionContainerId: number;
  /** Equals CF (Session Position) of the pick's answer in the TSV. */
  sessionPosition: number;
  serveIndex: number;
  pickedAt: string;
  reviewAlgorithm: "sm2" | "optimal";
  source: "sm2" | "optimal" | "massed";
  questionContainerId: number;
  decision: PickDecision;
}

export interface TracedSession {
  enrollmentId: number;
  courseId: number;
  groupId: number;
  studySessionId: number;
  reviewAlgorithm: "sm2" | "optimal";
  startedAt: string;
  completedAt: string | null;
  picks: Pick[];
}

/** The Optimal model's parameters, as the Podsie code that wrote the file has them. */
export interface LktParameters {
  intercept: number;
  itemHistoryCoefficient: number;
  ppesCoefficient: number;
  abilityCoefficient: number;
  abilityDecay: number;
  itemHistoryDecay: number;
  power: number;
  baseDecay: number;
  spacingEffect: number;
  timeWindow: number;
  outcomeWindow: number;
  targetProbability: number;
  recentServedWindow: number;
}

export interface TraceIndex {
  fileName: string;
  /** From the file's parameters line, or null when the file has none. */
  parameters: LktParameters | null;
  blob: Blob;
  /** Byte range of each session's line, by traceKeyOf. */
  sessions: Map<string, { offset: number; length: number }>;
  /** The enrollment ids that have a saved pick. */
  enrollments: Set<string>;
}

export const traceKeyOf = (
  enrollmentId: string | number,
  studySessionId: string | number,
) => `${enrollmentId}|${studySessionId}`;

const HEAD_BYTES = 400;
const ENROLLMENT = /"enrollmentId"\s*:\s*(\d+)/;
const PARAMETERS = /^\{"kind"\s*:\s*"parameters"/;
const SESSION = /"studySessionId"\s*:\s*(\d+)/;

/**
 * Indexes a JSON Lines file of traced sessions. It reads the two ids from the
 * start of each line and leaves the picks in the file. readTracedSession
 * reads a session's line when the session is opened.
 */
export const loadTraces = async (
  blob: Blob,
  fileName: string,
  onProgress: (fraction: number) => void = () => {},
): Promise<TraceIndex> => {
  const index: TraceIndex = {
    fileName,
    parameters: null,
    blob,
    sessions: new Map(),
    enrollments: new Set(),
  };
  const decoder = new TextDecoder();
  await scanLines(
    blob,
    (bytes, offset) => {
      if (bytes.length === 0) return;
      const head = decoder.decode(bytes.subarray(0, HEAD_BYTES));
      if (PARAMETERS.test(head)) {
        const line = JSON.parse(decoder.decode(bytes)) as {
          lktParameters: LktParameters;
        };
        index.parameters = line.lktParameters;
        return;
      }
      const enrollment = ENROLLMENT.exec(head)?.[1];
      const session = SESSION.exec(head)?.[1];
      if (enrollment === undefined || session === undefined)
        throw new Error(
          "This file is not an NSFv5 decisions file. A line has no enrollmentId and studySessionId.",
        );
      index.enrollments.add(enrollment);
      index.sessions.set(traceKeyOf(enrollment, session), {
        offset,
        length: bytes.length,
      });
    },
    onProgress,
  );
  if (index.sessions.size === 0) throw new Error("The file has no session.");
  return index;
};

export const readTracedSession = async (
  index: TraceIndex,
  key: string,
): Promise<TracedSession | null> => {
  const range = index.sessions.get(key);
  if (range === undefined) return null;
  const text = await index.blob
    .slice(range.offset, range.offset + range.length)
    .text();
  return JSON.parse(text) as TracedSession;
};

/** The keys of every session of an enrollment in the file. */
export const sessionKeysOf = (
  index: TraceIndex,
  enrollmentId: string | number,
): string[] => {
  const prefix = `${enrollmentId}|`;
  return [...index.sessions.keys()].filter((key) => key.startsWith(prefix));
};
