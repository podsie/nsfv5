import { describe, expect, it } from "vitest";
import { loadTraces, readTracedSession, traceKeyOf } from "./traces";

const session = (enrollmentId: number, studySessionId: number, picks: number) => ({
  enrollmentId,
  courseId: 7,
  groupId: 3,
  studySessionId,
  reviewAlgorithm: "sm2",
  startedAt: "2026-01-06T15:00:00.000Z",
  completedAt: null,
  picks: Array.from({ length: picks }, (_, index) => ({
    studySessionQuestionContainerId: 100 + index,
    sessionPosition: index + 1,
    serveIndex: 0,
    pickedAt: "2026-01-06T15:00:00.000Z",
    reviewAlgorithm: "sm2",
    source: "sm2",
    questionContainerId: 30 + index,
    decision: { note: "é".repeat(300) },
  })),
});

const blobOf = (sessions: object[]) =>
  new Blob([sessions.map((line) => JSON.stringify(line)).join("\n") + "\n"]);

describe("loadTraces", () => {
  it("indexes each session by enrollment and session, and reads its picks back", async () => {
    const traces = await loadTraces(
      blobOf([session(41, 55, 2), session(41, 56, 3), session(42, 57, 1)]),
      "picks.jsonl",
    );
    expect([...traces.enrollments]).toEqual(["41", "42"]);
    expect(traces.sessions.size).toBe(3);
    const read = await readTracedSession(traces, traceKeyOf("41", "56"));
    expect(read?.picks.map((pick) => pick.sessionPosition)).toEqual([1, 2, 3]);
    expect(await readTracedSession(traces, traceKeyOf("41", "99"))).toBeNull();
  });

  it("reads the ids of a line that Postgres wrote with spaces around the colons", async () => {
    const line = '{"enrollmentId" : 12, "courseId" : 44, "studySessionId" : 960, "picks" : []}\n';
    const traces = await loadTraces(new Blob([line]), "picks.jsonl");
    expect(traces.sessions.has(traceKeyOf(12, 960))).toBe(true);
  });

  it("reads the model parameters from the parameters line", async () => {
    const parameters = { kind: "parameters", lktParameters: { targetProbability: 0.85 } };
    const traces = await loadTraces(blobOf([parameters, session(41, 55, 1)]), "picks.jsonl");
    expect(traces.parameters?.targetProbability).toBe(0.85);
    expect(traces.sessions.size).toBe(1);
    expect((await loadTraces(blobOf([session(41, 55, 1)]), "old.jsonl")).parameters).toBeNull();
  });

  it("refuses a file that is not a decisions file", async () => {
    await expect(
      loadTraces(new Blob(['{"other":1}\n']), "x.jsonl"),
    ).rejects.toThrow("not an NSFv5 decisions file");
  });
});
