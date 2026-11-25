import type { Dataset, Session } from "../data/dataset";
import { percentOf } from "../data/summary";
import { traceKeyOf, type TraceIndex } from "../data/traces";
import type { Totals, TreeItem } from "../data/tree";
import { useVirtualList } from "../hooks/useVirtualList";
import { Badge } from "./Badge";
import { countOf, phaseLabelOf, shortTimeOf } from "./format";

const LINE_HEIGHT = 32;

const TotalsText = ({
  totals,
  withStudents,
}: {
  totals: Totals;
  withStudents: boolean;
}) => (
  <span className="muted line-meta">
    {withStudents && `${countOf(totals.students, "student")} · `}
    {countOf(totals.sessions, "session")} · {countOf(totals.answers, "answer")}{" "}
    · {percentOf(totals.correct, totals.answers)} correct
  </span>
);

const Flag = ({ count }: { count: number }) =>
  count > 0 ? (
    <Badge tone="warn" title="Sessions with a fail or a notice">
      {count}
    </Badge>
  ) : null;

const AssignmentProgress = ({ session }: { session: Session }) =>
  session.unanswered === null || session.unanswered.length === 0 ? null : (
    <Badge tone="bad" title="Questions answered, out of the assignment's total">
      {session.assignmentQuestions! - session.unanswered.length} of{" "}
      {session.assignmentQuestions} questions
    </Badge>
  );

const LineContent = ({
  item,
  dataset,
  traces,
}: {
  item: TreeItem;
  dataset: Dataset;
  traces: TraceIndex | null;
}) => {
  if (item.kind === "course")
    return (
      <>
        <strong>Course {item.courseId}</strong>
        <TotalsText totals={item.totals} withStudents />
        <Flag count={item.totals.flagged} />
      </>
    );
  if (item.kind === "class")
    return (
      <>
        <strong>Class {item.classId}</strong>
        <TotalsText totals={item.totals} withStudents />
        <Flag count={item.totals.flagged} />
      </>
    );
  if (item.kind === "student")
    return (
      <>
        <code>{item.student.anonId}</code>
        <Badge tone="info">{item.student.conditions.join(" + ")}</Badge>
        {traces?.enrollments.has(item.student.enrollmentId) && (
          <Badge tone="good">Decisions</Badge>
        )}
        <TotalsText totals={item.totals} withStudents={false} />
        <Flag count={item.totals.flagged} />
      </>
    );
  const { session } = item;
  return (
    <>
      <Badge>{phaseLabelOf(session.phase)}</Badge>
      <span>{session.sessionId}</span>
      {traces?.sessions.has(
        traceKeyOf(
          dataset.students[session.student].enrollmentId,
          session.sessionId,
        ),
      ) && <Badge tone="good">Decisions</Badge>}
      <span className="muted line-meta">
        {shortTimeOf(dataset.rows.time[session.rows[0]])} ·{" "}
        {countOf(session.rows.length, "answer")} ·{" "}
        {percentOf(session.correct, session.rows.length)} correct
      </span>
      <AssignmentProgress session={session} />
      <Flag count={session.issues.length} />
    </>
  );
};

export const TreeList = ({
  dataset,
  traces,
  items,
  open,
  selectedKey,
  emptyText,
  onToggle,
  onSelect,
}: {
  dataset: Dataset;
  traces: TraceIndex | null;
  items: TreeItem[];
  open: ReadonlySet<string>;
  selectedKey: string | null;
  emptyText: string;
  onToggle: (key: string) => void;
  onSelect: (item: TreeItem) => void;
}) => {
  const list = useVirtualList(items.length, LINE_HEIGHT);
  if (items.length === 0) return <p className="muted pad">{emptyText}</p>;
  return (
    <div className="tree" ref={list.ref} onScroll={list.onScroll}>
      <div style={{ height: list.totalHeight }}>
        <div style={{ transform: `translateY(${list.offset}px)` }}>
          {items.slice(list.first, list.last).map((item) => (
            <div
              key={item.key}
              className={`line ${item.key === selectedKey ? "selected" : ""}`}
              style={{ height: LINE_HEIGHT, paddingLeft: 8 + item.depth * 20 }}
              onClick={() => {
                if (item.kind !== "session") onToggle(item.key);
                if (item.kind === "session" || item.kind === "student")
                  onSelect(item);
              }}
            >
              <span className="twisty">
                {item.kind === "session" ? "" : open.has(item.key) ? "▾" : "▸"}
              </span>
              <LineContent item={item} dataset={dataset} traces={traces} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
