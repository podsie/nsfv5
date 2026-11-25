import { useMemo, useState } from "react";
import { chartAnswersOf } from "../data/chartAnswers";
import { decisionChartOf } from "../data/decisionChart";
import { isPostTest, postTestFactsOf } from "../data/postTest";
import { DecisionChart } from "./DecisionChart";
import { checkOf } from "../data/checks";
import { columnIndexesOf } from "../data/columns";
import type { Dataset, Session } from "../data/dataset";
import { percentOf } from "../data/summary";
import { traceKeyOf, type TraceIndex } from "../data/traces";
import { useSessionRows } from "../hooks/useSessionRows";
import { useTracedSession } from "../hooks/useTracedSession";
import { PickDecisionCard } from "./PickDecisionCard";
import { PICK_LABELS } from "./pickLabels";
import { Badge } from "./Badge";
import { DataTable } from "./DataTable";
import { countOf, phaseLabelOf, shortTimeOf } from "./format";

interface Line {
  row: number;
  values: string[] | null;
}

const RowColumns = ({
  headers,
  values,
}: {
  headers: string[];
  values: string[];
}) => (
  <dl className="columns">
    {headers.map((header, index) => (
      <div key={`${index}:${header}`}>
        <dt>{header}</dt>
        <dd>{values[index] || <span className="muted">empty</span>}</dd>
      </div>
    ))}
  </dl>
);

export const SessionDetail = ({
  dataset,
  traces,
  session,
}: {
  dataset: Dataset;
  traces: TraceIndex | null;
  session: Session;
}) => {
  const values = useSessionRows(dataset, session);
  const traced = useTracedSession(
    traces,
    traceKeyOf(
      dataset.students[session.student].enrollmentId,
      session.sessionId,
    ),
  );
  const pickAt = new Map(
    (traced?.picks ?? []).map((pick) => [String(pick.sessionPosition), pick]),
  );
  const [openRow, setOpenRow] = useState<number | null>(null);
  const postTest = useMemo(
    () =>
      isPostTest(session.phase) ? postTestFactsOf(dataset, session) : null,
    [dataset, session],
  );
  const chart = useMemo(
    () =>
      traced === null
        ? null
        : decisionChartOf([traced], chartAnswersOf(dataset, [session])),
    [traced, dataset, session],
  );
  const at = columnIndexesOf(dataset.headers);
  const student = dataset.students[session.student];
  const { rows, schedules } = dataset;
  const lines: Line[] = session.rows.map((row, index) => ({
    row,
    values: values?.[index] ?? null,
  }));
  const text = (line: Line, column: number) => line.values?.[column] ?? "";
  const open = lines.find((line) => line.row === openRow);
  const pickOf = (line: Line) => pickAt.get(text(line, at.position));
  const openPick = open === undefined ? undefined : pickOf(open);
  const answered = new Set(lines.map((line) => text(line, at.position)));
  const unanswered =
    values === null
      ? []
      : (traced?.picks ?? []).filter(
          (pick) => !answered.has(String(pick.sessionPosition)),
        );
  return (
    <div className="stack">
      <header className="detail-head">
        <h3>
          {phaseLabelOf(session.phase)} session {session.sessionId}
        </h3>
        <p className="muted">
          Student <code>{student.anonId}</code> ·{" "}
          {student.conditions.join(" + ")} · study week {session.week} ·{" "}
          {countOf(session.rows.length, "answer")} ·{" "}
          {percentOf(session.correct, session.rows.length)} correct
        </p>
        {session.unanswered !== null && (
          <p>
            <Badge tone={session.unanswered.length === 0 ? "good" : "bad"}>
              {session.unanswered.length === 0 ? "Finished" : "Not finished"}
            </Badge>{" "}
            The student answered{" "}
            {session.assignmentQuestions! - session.unanswered.length} of the
            assignment's {session.assignmentQuestions} questions.
            {session.unanswered.length > 0 &&
              ` No answer for item ${session.unanswered.join(", ")}.`}
          </p>
        )}
        {postTest !== null && (
          <p>
            {postTest.massed} answers are on the student's massed questions.{" "}
            {postTest.added} of those questions were added to this student's
            copy of the post test. The student had {postTest.massedInReview}{" "}
            massed {postTest.massedInReview === 1 ? "question" : "questions"} in
            review.
          </p>
        )}
        {session.issues.map((id) => {
          const check = checkOf(id);
          return (
            <p key={id}>
              <Badge tone={check?.severity === "error" ? "bad" : "warn"}>
                {check?.severity === "error" ? "Fail" : "Notice"}
              </Badge>{" "}
              {check?.label}
            </p>
          );
        })}
      </header>
      {chart !== null && (
        <DecisionChart
          chart={chart}
          activeTrial={
            chart.events.find((event) => event.pick === openPick)?.trial ?? null
          }
          onSelect={(event) => {
            const line = lines.find((line) => pickOf(line) === event.pick);
            if (line) setOpenRow(line.row === openRow ? null : line.row);
          }}
        />
      )}
      <DataTable
        rows={lines}
        rowKey={(line) => line.row}
        selectedKey={openRow}
        onRowClick={(line) =>
          setOpenRow(line.row === openRow ? null : line.row)
        }
        columns={[
          {
            header: "Time (UTC)",
            cell: (line) => shortTimeOf(rows.time[line.row]),
          },
          {
            header: "Place",
            align: "right",
            cell: (line) => text(line, at.position),
          },
          {
            header: "Serve",
            align: "right",
            cell: (line) => rows.serve[line.row] || "",
          },
          {
            header: "Second condition",
            cell: (line) => schedules[rows.schedule[line.row]],
          },
          {
            header: "Item",
            align: "right",
            cell: (line) =>
              rows.container[line.row] === -1 ? "" : rows.container[line.row],
          },
          {
            header: "Question",
            cell: (line) => (
              <span className="clip">{text(line, at.problem)}</span>
            ),
          },
          {
            header: "Answer",
            cell: (line) => (
              <span className="clip">{text(line, at.input)}</span>
            ),
          },
          {
            header: "Outcome",
            cell: (line) => (
              <Badge tone={rows.correct[line.row] ? "good" : "bad"}>
                {rows.correct[line.row] ? "Correct" : "Incorrect"}
              </Badge>
            ),
          },
          {
            header: "Seconds",
            align: "right",
            cell: (line) =>
              rows.responseTime[line.row] === -1
                ? ""
                : rows.responseTime[line.row].toLocaleString("en-US"),
          },
          {
            header: "Added",
            cell: (line) => (rows.added[line.row] === "TRUE" ? "Massed" : ""),
          },
          ...(traced === null
            ? []
            : [
                {
                  header: "Decision",
                  cell: (line: Line) => {
                    const pick = pickOf(line);
                    return pick
                      ? PICK_LABELS.chosenByShort[pick.decision.chosenBy]
                      : "";
                  },
                },
              ]),
        ]}
      />
      {traced !== null && openPick === undefined && (
        <p className="muted">
          Click an answer to see how its question was picked.
        </p>
      )}
      {openPick !== undefined && (
        <PickDecisionCard
          pick={openPick}
          title={`Decision for place ${openPick.sessionPosition}`}
        />
      )}
      {open?.values != null && (
        <section className="card">
          <h3>All columns of the selected answer</h3>
          <RowColumns headers={dataset.headers} values={open.values} />
        </section>
      )}
      {unanswered.map((pick) => (
        <PickDecisionCard
          key={pick.studySessionQuestionContainerId}
          pick={pick}
          title={`Decision for place ${pick.sessionPosition} (no answer in the file)`}
        />
      ))}
    </div>
  );
};
