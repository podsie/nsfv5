import { postTestFactsOf } from "./postTest";
import { lastProbabilitiesOf, targetSplitOf, unreviewedOf } from "./unreviewed";
import type { TracedSession } from "./traces";
import { describe, expect, it } from "vitest";
import { loadTsv, readRows, timeOf } from "./loadTsv";
import { summaryOf } from "./summary";
import { flattenTree, NO_FILTERS, treeOf } from "./tree";

const HEADERS = [
  "Anon Student Id",
  "Session Id",
  "Time",
  "Level (Phase)",
  "Problem Name",
  "Problem Start Time",
  "Outcome",
  "Input",
  "Condition Name",
  "Condition Type",
  "Condition Name",
  "Condition Type",
  "Class",
  "CF (Experiment ID)",
  "CF (Response Time)",
  "CF (Student Profile Id)",
  "CF (Enrollment Id)",
  "CF (Study Week)",
  "CF (Review Algorithm)",
  "CF (Session Position)",
  "CF (Question Serve Number)",
  "CF (Question Container Id)",
  "CF (Post Test Added Massed)",
];

interface Answer {
  student?: string;
  session: string;
  minute: number;
  phase: "assignment" | "review" | "posttest1" | "posttest2";
  schedule: string;
  container: number;
  correct?: boolean;
  condition?: string;
  serve?: number;
  seconds?: number | null;
  added?: string;
  week?: string;
}

const lineOf = (a: Answer) => {
  const time = `2026-01-06 15:${String(a.minute).padStart(2, "0")}:00.000`;
  const seconds = a.seconds === undefined ? 20 : a.seconds;
  return [
    a.student ?? "STUDENTA",
    a.session,
    time,
    a.phase,
    `Qüestion ${a.container}`,
    seconds === null ? "" : time,
    a.correct === false ? "INCORRECT" : "CORRECT",
    "Choice A",
    a.condition ?? "supermemo2",
    "algorithm",
    a.schedule,
    "MCQ",
    "CLASS1",
    "7",
    seconds === null ? "" : String(seconds),
    "profile-1",
    "41",
    a.week ?? "2026-01-05",
    a.phase === "review" ? "sm2" : "",
    "",
    a.serve === undefined ? "" : String(a.serve),
    String(a.container),
    a.added ?? "",
  ].join("\t");
};

const massed = (minute: number, serve: number, session = "55"): Answer => ({
  session,
  minute,
  phase: "review",
  schedule: "massed",
  container: 30,
  serve,
});

const valid: Answer[] = [
  {
    session: "assignment-8",
    minute: 0,
    phase: "assignment",
    schedule: "massed",
    container: 30,
  },
  {
    session: "assignment-8",
    minute: 1,
    phase: "assignment",
    schedule: "sm2",
    container: 31,
    correct: false,
  },
  massed(2, 1),
  { session: "55", minute: 3, phase: "review", schedule: "sm2", container: 31 },
  massed(4, 2),
  massed(5, 3),
  massed(6, 4),
  massed(7, 5),
  {
    session: "assignment-9",
    minute: 20,
    phase: "posttest1",
    schedule: "massed",
    container: 30,
    added: "TRUE",
  },
  {
    session: "assignment-9",
    minute: 21,
    phase: "posttest1",
    schedule: "sm2",
    container: 31,
    added: "FALSE",
  },
];

const load = (answers: Answer[]) =>
  loadTsv(
    new Blob([[HEADERS.join("\t"), ...answers.map(lineOf)].join("\n") + "\n"]),
    "test.tsv",
  );

const failedOf = async (answers: Answer[], withFewMassed = false) =>
  (await load(answers)).checks
    .filter((check) => check.count > 0)
    .map((check) => check.id)
    .filter((id) => id !== "review-weeks-short")
    .filter((id) => withFewMassed || id !== "post-test-few-massed");

describe("loadTsv", () => {
  it("groups rows into students and sessions", async () => {
    const dataset = await load(valid);
    expect(dataset.rowCount).toBe(10);
    expect(dataset.students).toHaveLength(1);
    expect(dataset.students[0].conditions).toEqual(["supermemo2"]);
    expect(
      dataset.sessions.map((s) => [
        s.sessionId,
        s.phase,
        s.rows.length,
        s.correct,
      ]),
    ).toEqual([
      ["assignment-8", "assignment", 2, 1],
      ["55", "review", 6, 6],
      ["assignment-9", "posttest1", 2, 2],
    ]);
    expect(dataset.rows.time[0]).toBe(timeOf("2026-01-06 15:00:00.000"));
  });

  it("reads a row's text back from the file, with characters over one byte", async () => {
    const dataset = await load(valid);
    const [row] = await readRows(dataset, [3]);
    expect(row[4]).toBe("Qüestion 31");
    expect(row).toHaveLength(HEADERS.length);
  });

  it("reads a file with no final newline and with CRLF line ends", async () => {
    const text = [HEADERS.join("\t"), ...valid.map(lineOf)].join("\r\n");
    const dataset = await loadTsv(new Blob([text]), "crlf.tsv");
    expect(dataset.rowCount).toBe(10);
    expect((await readRows(dataset, [9]))[0].at(-1)).toBe("FALSE");
  });

  it("refuses a file without the NSFv5 columns", async () => {
    await expect(
      loadTsv(new Blob(["Anon Student Id\tTime\nA\tB\n"]), "old.tsv"),
    ).rejects.toThrow("not an NSFv5 export");
  });
});

describe("the study rules", () => {
  it("pass on a file that keeps every rule", async () => {
    expect(await failedOf(valid)).toEqual([]);
  });

  it("flag a sixth massed answer", async () => {
    expect(
      await failedOf([...valid.slice(0, 8), massed(8, 6), ...valid.slice(8)]),
    ).toEqual(["massed-over-5"]);
  });

  it("flag a massed question with fewer than 5 answers as a notice", async () => {
    const dataset = await load(valid.filter((answer) => answer.serve !== 5));
    const [notice] = dataset.checks.filter((check) => check.count > 0);
    expect(notice).toMatchObject({
      id: "massed-under-5",
      severity: "notice",
      count: 1,
    });
    expect(dataset.sessions[1].issues).toEqual(["massed-under-5"]);
  });

  it("flag a review question from the other condition's algorithm", async () => {
    const answers = valid.map((answer) =>
      answer.minute === 3 ? { ...answer, schedule: "optimal_algo" } : answer,
    );
    expect(await failedOf(answers)).toEqual(["wrong-algorithm"]);
  });

  it("flag a massed question that the algorithm also picked, and one massed in a second session", async () => {
    const picked: Answer = {
      session: "56",
      minute: 10,
      phase: "review",
      schedule: "sm2",
      container: 30,
      week: "2026-01-12",
    };
    expect(
      await failedOf([...valid.slice(0, 8), picked, ...valid.slice(8)]),
    ).toEqual(["massed-and-picked"]);
    const again = { ...massed(10, 1, "56"), week: "2026-01-12" };
    expect(
      await failedOf([...valid.slice(0, 7), again, ...valid.slice(8)]),
    ).toEqual(expect.arrayContaining(["massed-two-sessions"]));
  });

  it("flag two massed sessions in one study week", async () => {
    const other = [1, 2, 3, 4, 5].map((serve) => ({
      ...massed(9 + serve, serve, "56"),
      container: 40,
    }));
    expect(
      await failedOf([...valid.slice(0, 8), ...other, ...valid.slice(8)]),
    ).toEqual(["two-massed-sessions"]);
  });

  it("flag a post test question answered twice, a missing start time, and a long response time", async () => {
    const repeat: Answer = { ...valid[9], minute: 22 };
    expect(await failedOf([...valid, repeat])).toEqual(["post-test-repeat"]);
    expect(
      await failedOf([{ ...valid[0], seconds: null }, ...valid.slice(1)]),
    ).toEqual(["no-start-time"]);
    expect(
      await failedOf([{ ...valid[0], seconds: 3601 }, ...valid.slice(1)]),
    ).toEqual(["over-an-hour"]);
  });

  it("flag a student with two conditions", async () => {
    const answers = valid.map((answer, index) =>
      index === 9 ? { ...answer, condition: "optimal" } : answer,
    );
    expect(await failedOf(answers)).toEqual(["two-conditions"]);
  });
});

describe("unfinished assignments", () => {
  const other: Answer[] = [
    {
      student: "STUDENTB",
      session: "assignment-8",
      minute: 30,
      phase: "assignment",
      schedule: "sm2",
      container: 30,
    },
  ];

  it("lists the assignment's questions that a student did not answer", async () => {
    const dataset = await load([...valid, ...other]);
    const [a, , , b] = dataset.sessions;
    expect([a.assignmentQuestions, a.unanswered]).toEqual([2, []]);
    expect([b.assignmentQuestions, b.unanswered]).toEqual([2, [31]]);
    expect(dataset.sessions[1].unanswered).toBeNull();
    expect(summaryOf(dataset).assignments).toEqual({
      sessions: 2,
      unfinished: 1,
      untouched: 0,
    });
    const tree = treeOf(dataset, { ...NO_FILTERS, unfinishedOnly: true });
    expect(tree[0].totals).toMatchObject({ students: 1, sessions: 1 });
  });
});

describe("the assignment attempts rule", () => {
  it("fails a second answer on one item of one assignment", async () => {
    const retry: Answer = {
      session: "assignment-8",
      minute: 1.5,
      phase: "assignment",
      schedule: "sm2",
      container: 31,
    };
    expect(await failedOf([...valid, retry])).toEqual(["assignment-repeat"]);
    expect(await failedOf(valid)).toEqual([]);
  });
});

describe("the review weeks notice", () => {
  it("counts the study weeks with review answers of each enrollment", async () => {
    const dataset = await load(valid);
    const check = dataset.checks.find(
      (one) => one.id === "review-weeks-short",
    )!;
    const weeks = new Set(
      dataset.sessions
        .filter((session) => session.phase === "review")
        .map((session) => session.week),
    ).size;
    expect(check.count).toBe(1);
    expect(check.sessions).toEqual([]);
    expect(check.perEnrollment).toEqual({
      enrollments: 1,
      min: weeks,
      max: weeks,
      mean: weeks,
      median: weeks,
    });
  });
});

describe("the never-reviewed items", () => {
  const extra: Answer[] = [
    {
      session: "assignment-8",
      minute: 1,
      phase: "assignment",
      schedule: "sm2",
      container: 32,
    },
    {
      session: "assignment-10",
      minute: 10,
      phase: "assignment",
      schedule: "sm2",
      container: 33,
      week: "2026-01-12",
    },
  ];

  it("counts a student's regular items with no review answer, without the massed item and an item that no review session followed", async () => {
    const summary = unreviewedOf(await load([...valid, ...extra]));
    expect(summary.conditions).toEqual([
      {
        condition: "supermemo2",
        students: 1,
        items: 2,
        mean: 1,
        median: 1,
        min: 1,
        max: 1,
        meanShare: 0.5,
      },
    ]);
    expect(
      summary.weeks.map((week) => [
        week.number,
        week.week,
        week.byCondition.supermemo2,
      ]),
    ).toEqual([[1, "2026-01-05", { items: 2, never: 1 }]]);
  });

  it("splits never-reviewed items by their probability at the last pick that had them", () => {
    const candidates = (pairs: [number, number][]) =>
      pairs.map(([questionContainerId, probability]) => ({
        questionContainerId,
        probability,
      }));
    const pickOf = (pickedAt: string, pairs: [number, number][]) => ({
      pickedAt,
      decision: {
        algorithm: { algorithm: "optimal", candidates: candidates(pairs) },
      },
    });
    const sessions = [
      {
        picks: [
          pickOf("2026-01-02", [
            [1, 0.9],
            [2, 0.4],
          ]),
          pickOf("2026-01-01", [
            [1, 0.5],
            [3, 0.2],
          ]),
        ],
      },
    ] as unknown as TracedSession[];
    const last = lastProbabilitiesOf(sessions, new Set([1, 2, 9]));
    expect(last.sort()).toEqual([0.4, 0.9]);
    expect(targetSplitOf([last], 0.85)).toEqual({
      students: 1,
      items: 2,
      below: 1,
      atOrAbove: 1,
      belowMedian: 0.4,
      atOrAboveMedian: 0.9,
    });
  });
});

describe("the post test notices", () => {
  it("flag a student who saw fewer than 10 massed questions in review", async () => {
    expect(await failedOf(valid, true)).toEqual(["post-test-few-massed"]);
    const dataset = await load(valid);
    const check = dataset.checks.find(
      (one) => one.id === "post-test-few-massed",
    )!;
    expect(check.count).toBe(1);
    expect(
      check.sessions.map((index) => dataset.sessions[index].phase),
    ).toEqual(["posttest1"]);
  });

  it("flag a post test question that the student never answered before", async () => {
    const unseen: Answer = {
      session: "assignment-9",
      minute: 22,
      phase: "posttest1",
      schedule: "sm2",
      container: 77,
      added: "FALSE",
    };
    const dataset = await load([...valid, unseen]);
    const check = dataset.checks.find((one) => one.id === "post-test-unseen")!;
    expect(check.count).toBe(1);
    expect(check.perEnrollment).toEqual({
      enrollments: 1,
      min: 1,
      max: 1,
      mean: 1,
      median: 1,
    });
    expect(check.sessions).toEqual([]);
    expect(dataset.sessions.flatMap((session) => session.issues)).not.toContain(
      "post-test-unseen",
    );
    expect(postTestFactsOf(dataset, dataset.sessions[2])).toEqual({
      massed: 1,
      added: 1,
      unseen: [77],
      massedInReview: 1,
    });
  });
});

describe("the summary and the tree", () => {
  it("count answers and right answers by phase, for the condition and each second condition", async () => {
    const summary = summaryOf(await load(valid));
    expect(summary.groups.map((group) => group.key)).toEqual([
      "supermemo2|",
      "supermemo2|sm2",
      "supermemo2|massed",
    ]);
    const cells = summary.byPhase.map((row) => [
      row.label,
      ...summary.groups.map((group) => {
        const cell = row.byGroup[group.key];
        return `${cell.correct}/${cell.answers}`;
      }),
    ]);
    expect(cells).toEqual([
      ["assignment", "1/2", "0/1", "1/1"],
      ["review", "6/6", "1/1", "5/5"],
      ["posttest1", "2/2", "1/1", "1/1"],
    ]);
    expect(summary.reviewWeeks).toHaveLength(1);
    expect(summary.reviewWeeks[0].byGroup["supermemo2|"].answers).toBe(6);
  });

  it("show a node's children when it is open, and only sessions that pass the filters", async () => {
    const dataset = await load(valid);
    const courses = treeOf(dataset, { ...NO_FILTERS, phase: "review" });
    expect(flattenTree(courses, new Set()).map((item) => item.kind)).toEqual([
      "course",
    ]);
    const open = new Set(["course:7", "class:7:CLASS1", "student:0"]);
    expect(flattenTree(courses, open).map((item) => item.kind)).toEqual([
      "course",
      "class",
      "student",
      "session",
    ]);
    expect(courses[0].totals).toMatchObject({
      students: 1,
      sessions: 1,
      answers: 6,
    });
    expect(treeOf(dataset, { ...NO_FILTERS, search: "nobody" })).toEqual([]);
  });
});
