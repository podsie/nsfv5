import { useMemo, useState } from "react";
import type { Dataset, Session, Student } from "../data/dataset";
import { chartAnswersOf } from "../data/chartAnswers";
import { decisionChartOf, type ChartEvent } from "../data/decisionChart";
import type { TraceIndex } from "../data/traces";
import { useTracedStudent } from "../hooks/useTracedStudent";
import { CHART_LABELS } from "./chartLabels";
import { DecisionChart } from "./DecisionChart";
import { PickDecisionCard } from "./PickDecisionCard";
import { unseenPostTestQuestionsOf } from "../data/postTest";
import { neverReviewedItemsOf } from "../data/unreviewed";
import { NeverReviewedTable } from "./NeverReviewedTable";
import { percentOf } from "../data/summary";
import { Badge } from "./Badge";
import { DataTable } from "./DataTable";
import { phaseLabelOf, shortTimeOf } from "./format";

export const StudentDetail = ({
  dataset,
  traces,
  student,
  onOpenSession,
}: {
  dataset: Dataset;
  traces: TraceIndex | null;
  student: Student;
  onOpenSession: (session: Session) => void;
}) => {
  const { rows, schedules } = dataset;
  const massed = schedules.indexOf("massed");
  const sessions = student.sessions.map((index) => dataset.sessions[index]);
  const traced = useTracedStudent(traces, student.enrollmentId);
  const chart = useMemo(
    () =>
      traced === null
        ? null
        : decisionChartOf(
            traced,
            chartAnswersOf(
              dataset,
              student.sessions.map((index) => dataset.sessions[index]),
            ),
          ),
    [traced, student, dataset],
  );
  const unseen = useMemo(
    () => unseenPostTestQuestionsOf(dataset, student),
    [dataset, student],
  );
  const neverReviewed = useMemo(
    () =>
      chart === null
        ? []
        : neverReviewedItemsOf(
            dataset,
            student,
            chart.series.map((series) => series.questionContainerId),
          ),
    [chart, dataset, student],
  );
  const [active, setActive] = useState<ChartEvent | null>(null);
  return (
    <div className="stack">
      <header className="detail-head">
        <h3>
          Student <code>{student.anonId}</code>
        </h3>
        <p className="muted">
          {student.conditions.join(" + ")} · course {student.courseId} · class{" "}
          {student.classId} · enrollment {student.enrollmentId} · profile{" "}
          {student.profileId}
        </p>
        {unseen.length > 0 && (
          <p>
            {unseen.length} post test questions were new to this student, with
            no earlier answer in an assignment or a review: items{" "}
            {unseen.join(", ")}.
          </p>
        )}
      </header>
      {traces?.enrollments.has(student.enrollmentId) && chart === null && (
        <p className="muted">{CHART_LABELS.loading}</p>
      )}
      {chart !== null && (
        <DecisionChart
          chart={chart}
          activeTrial={active?.trial ?? null}
          onSelect={(event) =>
            setActive(event.trial === active?.trial ? null : event)
          }
        />
      )}
      {active?.pick != null && (
        <PickDecisionCard
          pick={active.pick}
          title={CHART_LABELS.cardTitle(active)}
        />
      )}
      {chart !== null && (
        <NeverReviewedTable
          title={`Items never reviewed (${neverReviewed.length})`}
          empty="Every item has a review answer."
          headers={{
            item: "Item",
            week: "Study week",
            answeredAt: "Assignment answer (UTC)",
            answer: "Result",
          }}
          answerLabels={{ correct: "Correct", incorrect: "Incorrect" }}
          items={neverReviewed}
        />
      )}
      <DataTable
        rows={sessions}
        rowKey={(session) => session.index}
        onRowClick={onOpenSession}
        columns={[
          { header: "Study week", cell: (session) => session.week },
          { header: "Phase", cell: (session) => phaseLabelOf(session.phase) },
          { header: "Session", cell: (session) => session.sessionId },
          {
            header: "First answer (UTC)",
            cell: (session) => shortTimeOf(rows.time[session.rows[0]]),
          },
          {
            header: "Answers",
            align: "right",
            cell: (session) => session.rows.length,
          },
          {
            header: "Questions",
            align: "right",
            cell: (session) =>
              session.unanswered === null ? (
                ""
              ) : session.unanswered.length === 0 ? (
                `${session.assignmentQuestions} of ${session.assignmentQuestions}`
              ) : (
                <Badge tone="bad">
                  {session.assignmentQuestions! - session.unanswered.length} of{" "}
                  {session.assignmentQuestions}
                </Badge>
              ),
          },
          {
            header: "Massed",
            align: "right",
            cell: (session) =>
              session.phase === "review"
                ? session.rows.filter((row) => rows.schedule[row] === massed)
                    .length
                : "",
          },
          {
            header: "Correct",
            align: "right",
            cell: (session) => percentOf(session.correct, session.rows.length),
          },
          {
            header: "Rules",
            cell: (session) =>
              session.issues.length > 0 && (
                <Badge tone="warn">{session.issues.length}</Badge>
              ),
          },
        ]}
      />
    </div>
  );
};
