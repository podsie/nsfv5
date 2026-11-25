import type { ChartAnswer } from "./decisionChart";
import type { Dataset, Session } from "./dataset";

/** The answers of sessions in the answers file, as the chart reads them. */
export const chartAnswersOf = (
  dataset: Dataset,
  sessions: readonly Session[],
): ChartAnswer[] =>
  sessions.flatMap((session) =>
    session.rows.map((row) => ({
      phase: session.phase,
      sessionId: session.sessionId,
      at: dataset.rows.time[row],
      questionContainerId: dataset.rows.container[row],
      correct: dataset.rows.correct[row],
    })),
  );
