import { describe, expect, it } from "vitest";
import { candidateDotsPathOf, neverChosenSeriesOf, type ChartGeometry } from "./chartGeometry";
import { decisionChartOf } from "./decisionChart";
import type { Pick, PickDecision, TracedSession } from "./traces";

const slot = {} as PickDecision["massedSlot"];

const pick = (
  sessionPosition: number,
  questionContainerId: number,
  decision: Omit<PickDecision, "massedSlot">,
  pickedAt = "2026-01-10T12:00:00.000Z",
): Pick => ({
  studySessionQuestionContainerId: sessionPosition,
  sessionPosition,
  serveIndex: 0,
  pickedAt,
  reviewAlgorithm: "optimal",
  source: decision.chosenBy === "algorithm" ? "optimal" : "massed",
  questionContainerId,
  decision: { ...decision, massedSlot: slot },
});

const optimal = (
  chosenContainerId: number,
  chances: [number, number, boolean?][],
): Omit<PickDecision, "massedSlot"> => ({
  chosenBy: "algorithm",
  algorithm: {
    algorithm: "optimal",
    at: "",
    targetProbability: 0.85,
    ability: 0,
    coefficients: { intercept: 0, itemHistory: 0, ppes: 0, ability: 0 },
    recentServedContainerIds: [],
    excludedContainerIds: [],
    candidates: chances.map(([questionContainerId, probability, recent]) => ({
      questionContainerId,
      probability,
      recent: recent ?? false,
      itemHistory: 0,
      ppes: 0,
      logit: 0,
    })),
    onlyRecentLeft: false,
    rule: "highest-below-target",
    chosenContainerId,
  },
});

const session = (
  studySessionId: number,
  startedAt: string,
  picks: Pick[],
  reviewAlgorithm: "sm2" | "optimal" = "optimal",
): TracedSession => ({
  enrollmentId: 1,
  courseId: 1,
  groupId: 1,
  studySessionId,
  reviewAlgorithm,
  startedAt,
  completedAt: null,
  picks,
});

const at = (iso: string) => new Date(iso).getTime();

describe("decisionChartOf", () => {
  it("numbers picks across sessions in time order, and keeps one series per container", () => {
    const chart = decisionChartOf([
      session(9, "2026-01-12T00:00:00.000Z", [
        pick(1, 30, optimal(30, [[30, 0.6], [31, 0.9]]), "2026-01-12T00:00:01.000Z"),
      ]),
      session(8, "2026-01-05T00:00:00.000Z", [
        pick(2, 31, optimal(31, [[30, 0.9, true], [31, 0.7]]), "2026-01-05T00:00:02.000Z"),
        pick(1, 40, { chosenBy: "massed-slot", algorithm: null }, "2026-01-05T00:00:01.000Z"),
      ]),
    ])!;
    expect(chart.algorithm).toBe("optimal");
    expect(chart.domain).toEqual([0, 1]);
    expect(chart.reference).toBe(0.85);
    expect(chart.blocks.map((b) => [b.sessionId, b.firstTrial, b.count])).toEqual([
      ["8", 1, 2],
      ["9", 3, 1],
    ]);
    expect(chart.events.map((e) => [e.trial, e.kind, e.value, e.correct])).toEqual([
      [1, "massed", null, null],
      [2, "value", 0.7, null],
      [3, "value", 0.6, null],
    ]);
    expect(chart.series.find((s) => s.questionContainerId === 30)?.points).toEqual([
      { trial: 2, value: 0.9, held: true, starts: true },
      { trial: 3, value: 0.6, held: false, starts: false },
    ]);
  });

  it("gives an assignment answer its own column in time order, and a pick the result of its answer", () => {
    const answer = (phase: string, sessionId: string, time: string, questionContainerId: number, correct: boolean) => ({
      phase,
      sessionId,
      at: at(time),
      questionContainerId,
      correct,
    });
    const chart = decisionChartOf(
      [
        session(1, "2026-01-10T00:00:00.000Z", [
          pick(1, 30, optimal(30, [[30, 0.6]]), "2026-01-10T00:00:05.000Z"),
          pick(2, 30, optimal(30, [[30, 0.7]]), "2026-01-10T00:01:00.000Z"),
          pick(3, 31, optimal(31, [[31, 0.7]]), "2026-01-10T00:02:00.000Z"),
        ]),
        session(2, "2026-01-17T00:00:00.000Z", [
          pick(1, 30, optimal(30, [[30, 0.5]]), "2026-01-17T00:00:05.000Z"),
        ]),
      ],
      [
        answer("posttest1", "assignment-9", "2026-05-01T00:00:00.000Z", 30, true),
        answer("assignment", "assignment-8", "2026-01-14T00:00:00.000Z", 31, false),
        answer("assignment", "assignment-7", "2026-01-08T00:00:00.000Z", 30, true),
        answer("review", "1", "2026-01-10T00:00:20.000Z", 30, false),
        answer("review", "1", "2026-01-10T00:01:20.000Z", 30, true),
        answer("review", "2", "2026-01-17T00:00:20.000Z", 30, true),
      ],
    )!;
    expect(chart.events.map((e) => [e.phase, e.kind, e.questionContainerId, e.correct])).toEqual([
      ["assignment", "work", 30, true],
      ["review", "value", 30, false],
      ["review", "value", 30, true],
      ["review", "value", 31, null],
      ["assignment", "work", 31, false],
      ["review", "value", 30, true],
      ["posttest1", "work", 30, true],
    ]);
    expect(chart.blocks.map((b) => [b.phase, b.firstTrial, b.count])).toEqual([
      ["assignment", 1, 1],
      ["review", 2, 3],
      ["assignment", 5, 1],
      ["review", 6, 1],
      ["posttest1", 7, 1],
    ]);
    expect(chart.series[0].points.map((p) => [p.trial, p.starts])).toEqual([
      [2, true],
      [3, false],
      [6, true],
    ]);
  });

  it("measures an SM2 candidate in days past its due date, and puts a candidate with no card in the unseen row", () => {
    const sm2 = (chosen: number): Omit<PickDecision, "massedSlot"> => ({
      chosenBy: "algorithm",
      algorithm: {
        algorithm: "sm2",
        recentContainerId: null,
        excludedContainerIds: [],
        chosenContainerId: chosen,
        candidates: [
          {
            questionContainerId: 50,
            card: { dueDate: "2026-01-08T12:00:00.000Z", interval: 1, eFactor: 2.5, streak: 0 },
            unseen: false,
            missed: false,
            waits: false,
            rank: chosen === 50 ? 1 : 2,
          },
          {
            questionContainerId: 51,
            card: null,
            unseen: true,
            missed: false,
            waits: false,
            rank: chosen === 51 ? 1 : 2,
          },
        ],
      },
    });
    const chart = decisionChartOf([
      session(
        1,
        "2026-01-10T00:00:00.000Z",
        [pick(1, 50, sm2(50)), pick(2, 51, sm2(51))],
        "sm2",
      ),
    ])!;
    expect(chart.reference).toBe(0);
    expect(chart.events.map((e) => [e.kind, e.value])).toEqual([
      ["value", 2],
      ["unseen", null],
    ]);
    expect(chart.series).toHaveLength(1);
    expect(chart.domain).toEqual([-1, 2]);
  });

  it("starts a new line when a candidate comes back after a pick that did not have it", () => {
    const chart = decisionChartOf([
      session(1, "2026-01-10T00:00:00.000Z", [
        pick(1, 30, optimal(30, [[30, 0.6], [31, 0.5]])),
        pick(2, 40, { chosenBy: "massed-slot", algorithm: null }),
        pick(3, 31, optimal(31, [[31, 0.5]])),
        pick(4, 31, optimal(31, [[30, 0.4], [31, 0.6]])),
      ]),
    ])!;
    const starts = (id: number) =>
      chart.series
        .find((s) => s.questionContainerId === id)!
        .points.map((point) => [point.trial, point.starts]);
    expect(starts(31)).toEqual([[1, true], [3, false], [4, false]]);
    expect(starts(30)).toEqual([[1, true], [4, true]]);
  });

  it("draws a dot for each candidate that a pick did not choose", () => {
    const chart = decisionChartOf([
      session(1, "2026-01-10T00:00:00.000Z", [
        pick(1, 30, optimal(30, [[30, 0.6], [31, 0.5]])),
        pick(2, 31, optimal(31, [[30, 0.4], [31, 0.6]])),
      ]),
    ])!;
    const geometry = { x: (trial: number) => trial, y: (value: number) => value } as ChartGeometry;
    expect(candidateDotsPathOf(chart, geometry).split("M").filter(Boolean).sort()).toEqual([
      "1.0 0.5h0",
      "2.0 0.4h0",
    ]);
  });

  it("finds the items that no review pick chose", () => {
    const chart = decisionChartOf([
      session(1, "2026-01-10T00:00:00.000Z", [
        pick(1, 30, optimal(30, [[30, 0.6], [31, 0.5], [32, 0.2]])),
        pick(2, 31, optimal(31, [[30, 0.4], [31, 0.6], [32, 0.2]])),
      ]),
    ])!;
    expect(neverChosenSeriesOf(chart).map((series) => series.questionContainerId)).toEqual([32]);
  });

  it("returns null with no pick", () => {
    expect(decisionChartOf([])).toBeNull();
  });
});
