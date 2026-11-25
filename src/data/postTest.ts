import type { Dataset, Session, Student } from "./dataset";

/** A student's post test has this many of their massed questions when they saw that many in review. */
export const POST_TEST_MASSED_COUNT = 10;

export const isPostTest = (phase: string) => phase.startsWith("posttest");

export interface PostTestFacts {
  /** Answers on the student's massed questions. */
  massed: number;
  /** Of those, the answers on questions that the student's copy added. */
  added: number;
  /** The question containers the student never answered in an assignment or a review before this post test. */
  unseen: number[];
  /** The massed questions the student answered in review, in the whole file. */
  massedInReview: number;
}

/** What a post test session shows about the two cases the study expects: a question the student never practised, and fewer than ten massed questions. */
export const postTestFactsOf = (
  dataset: Dataset,
  session: Session,
): PostTestFacts => {
  const { rows, schedules } = dataset;
  const massedSchedule = schedules.indexOf("massed");
  const firstAt = rows.time[session.rows[0]];
  const practised = new Set<number>();
  const massedInReview = new Set<number>();
  for (const index of dataset.students[session.student].sessions) {
    const other = dataset.sessions[index];
    if (isPostTest(other.phase)) continue;
    for (const row of other.rows) {
      if (other.phase === "review" && rows.schedule[row] === massedSchedule)
        massedInReview.add(rows.container[row]);
      if (rows.time[row] < firstAt) practised.add(rows.container[row]);
    }
  }
  return {
    massed: session.rows.filter((row) => rows.schedule[row] === massedSchedule)
      .length,
    added: session.rows.filter((row) => rows.added[row] === "TRUE").length,
    unseen: [
      ...new Set(
        session.rows
          .map((row) => rows.container[row])
          .filter((container) => !practised.has(container)),
      ),
    ],
    massedInReview: massedInReview.size,
  };
};

/** The post test question containers an enrollment never answered in an assignment or a review before the post test that asked them. A container counts once across both post tests. */
export const unseenPostTestQuestionsOf = (
  dataset: Dataset,
  student: Student,
): number[] => [
  ...new Set(
    student.sessions
      .map((index) => dataset.sessions[index])
      .filter((session) => isPostTest(session.phase))
      .flatMap((session) => postTestFactsOf(dataset, session).unseen),
  ),
];
