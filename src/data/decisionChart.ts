import type { Pick, TracedSession } from "./traces";

const DAY_MS = 86_400_000;

/** One answer of the student in the answers file. */
export interface ChartAnswer {
  phase: string;
  sessionId: string;
  /** Milliseconds since the epoch. */
  at: number;
  questionContainerId: number;
  correct: boolean;
}

/**
 * Where an event's dot sits: on the value scale, in the unseen row, or in the
 * massed row. "work" is an assignment or a post test answer, which no pick chose.
 */
export type ChartEventKind = "value" | "unseen" | "massed" | "work";

/** One column of the chart: a review pick, or an assignment or post test answer. */
export interface ChartEvent {
  /** 1 for the student's first event, in time order. */
  trial: number;
  phase: string;
  sessionId: string;
  at: number;
  questionContainerId: number;
  /** Null for a pick with no answer in the answers file. */
  correct: boolean | null;
  pick: Pick | null;
  kind: ChartEventKind;
  /** The chosen candidate's value at the pick. Null outside the value scale. */
  value: number | null;
}

export interface ChartPoint {
  trial: number;
  value: number;
  /** Optimal: the candidate was in the last 5 served. SM2: the candidate waits because it served last. */
  held: boolean;
  /** The pick before this one that ran the algorithm did not have the candidate, so no line joins the two. */
  starts: boolean;
}

export interface ChartSeries {
  questionContainerId: number;
  points: ChartPoint[];
}

/** A run of events of one assignment, post test, or review session. */
export interface ChartBlock {
  phase: string;
  sessionId: string;
  at: number;
  firstTrial: number;
  count: number;
}

/**
 * Every answer of a student in time order, and what each review pick read. An
 * Optimal value is a candidate's chance of a correct answer. An SM2 value is
 * the days from a candidate's due date to the pick, so a positive value is
 * overdue.
 */
export interface DecisionChart {
  algorithm: "sm2" | "optimal";
  events: ChartEvent[];
  series: ChartSeries[];
  blocks: ChartBlock[];
  domain: [number, number];
  /** Optimal's target chance, or SM2's due line at 0. */
  reference: number;
}

const daysOverdue = (pickedAt: string, dueDate: string) =>
  (new Date(pickedAt).getTime() - new Date(dueDate).getTime()) / DAY_MS;

const candidatesOf = (pick: Pick) => {
  const decision = pick.decision.algorithm;
  if (decision === null) return [];
  if (decision.algorithm === "optimal")
    return decision.candidates.map((candidate) => ({
      questionContainerId: candidate.questionContainerId,
      value: candidate.probability as number | null,
      held: candidate.recent,
    }));
  return decision.candidates.map((candidate) => ({
    questionContainerId: candidate.questionContainerId,
    value: candidate.card
      ? daysOverdue(pick.pickedAt, candidate.card.dueDate)
      : null,
    held: candidate.waits,
  }));
};

type Candidates = ReturnType<typeof candidatesOf>;

const kindOf = (pick: Pick, candidates: Candidates) => {
  const chosen =
    pick.decision.chosenBy === "algorithm"
      ? candidates.find(
          (candidate) =>
            candidate.questionContainerId === pick.questionContainerId,
        )
      : undefined;
  const value = chosen?.value ?? null;
  const kind: ChartEventKind =
    chosen === undefined ? "massed" : value === null ? "unseen" : "value";
  return { kind, value };
};

/**
 * The picks of a session in place order, each with the result of its answer.
 * A pick takes the session's next answer on the same question container.
 */
const pickEventsOf = (session: TracedSession, answers: ChartAnswer[]) => {
  let next = 0;
  return [...session.picks]
    .sort((a, b) => a.sessionPosition - b.sessionPosition)
    .map((pick) => {
      const found = answers.findIndex(
        (answer, index) =>
          index >= next && answer.questionContainerId === pick.questionContainerId,
      );
      if (found !== -1) next = found + 1;
      const candidates = candidatesOf(pick);
      return {
        phase: "review",
        sessionId: String(session.studySessionId),
        at: new Date(pick.pickedAt).getTime(),
        questionContainerId: pick.questionContainerId,
        correct: found === -1 ? null : answers[found].correct,
        pick,
        candidates,
        ...kindOf(pick, candidates),
      };
    });
};

export const decisionChartOf = (
  traced: readonly TracedSession[],
  answers: readonly ChartAnswer[] = [],
): DecisionChart | null => {
  const sessions = [...traced].sort(
    (a, b) =>
      a.startedAt.localeCompare(b.startedAt) ||
      a.studySessionId - b.studySessionId,
  );
  if (sessions.length === 0) return null;
  const algorithm = sessions[0].reviewAlgorithm;
  const reviewAnswers = new Map<string, ChartAnswer[]>();
  for (const answer of answers) {
    if (answer.phase !== "review") continue;
    const list = reviewAnswers.get(answer.sessionId);
    if (list) list.push(answer);
    else reviewAnswers.set(answer.sessionId, [answer]);
  }
  const ordered = [
    ...sessions.flatMap((session) =>
      pickEventsOf(
        session,
        reviewAnswers.get(String(session.studySessionId)) ?? [],
      ),
    ),
    ...answers
      .filter((answer) => answer.phase !== "review")
      .map((answer) => ({
        ...answer,
        correct: answer.correct as boolean | null,
        pick: null,
        candidates: [] as Candidates,
        kind: "work" as ChartEventKind,
        value: null,
      })),
  ].sort((a, b) => a.at - b.at);
  if (!ordered.some((event) => event.pick !== null)) return null;

  const events: ChartEvent[] = [];
  const blocks: ChartBlock[] = [];
  const series = new Map<number, ChartPoint[]>();
  const lastRun = new Map<number, number>();
  let run = 0;
  let low = Infinity;
  let high = -Infinity;
  for (const { candidates, ...event } of ordered) {
    const trial = events.length + 1;
    events.push({ ...event, trial });
    const block = blocks.at(-1);
    if (block?.sessionId === event.sessionId) block.count += 1;
    else
      blocks.push({
        phase: event.phase,
        sessionId: event.sessionId,
        at: event.at,
        firstTrial: trial,
        count: 1,
      });
    if (event.pick?.decision.algorithm == null) continue;
    run += 1;
    for (const candidate of candidates) {
      if (candidate.value === null) continue;
      low = Math.min(low, candidate.value);
      high = Math.max(high, candidate.value);
      const point = {
        trial,
        value: candidate.value,
        held: candidate.held,
        starts: lastRun.get(candidate.questionContainerId) !== run - 1,
      };
      lastRun.set(candidate.questionContainerId, run);
      const points = series.get(candidate.questionContainerId);
      if (points) points.push(point);
      else series.set(candidate.questionContainerId, [point]);
    }
  }
  return {
    algorithm,
    events,
    blocks,
    series: [...series].map(([questionContainerId, points]) => ({
      questionContainerId,
      points,
    })),
    domain:
      algorithm === "optimal"
        ? [0, 1]
        : [
            Math.min(-1, Math.floor(Math.min(low, 0))),
            Math.max(1, Math.ceil(Math.max(high, 0))),
          ],
    reference:
      algorithm === "optimal"
        ? (events
            .map((event) => event.pick?.decision.algorithm)
            .find((decision) => decision?.algorithm === "optimal")
            ?.targetProbability ?? 0.85)
        : 0,
  };
};
