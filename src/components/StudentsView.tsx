import { useMemo, useState } from "react";
import type { Dataset, Session } from "../data/dataset";
import { selectionOf } from "../data/selection";
import type { TraceIndex } from "../data/traces";
import {
  branchKeysOf,
  branchKeysToStudent,
  filterOptionsOf,
  flattenTree,
  treeOf,
  type Filters,
} from "../data/tree";
import { FilterBar } from "./FilterBar";
import { SessionDetail } from "./SessionDetail";
import { StudentDetail } from "./StudentDetail";
import { TreeList } from "./TreeList";

export const StudentsView = ({
  dataset,
  traces,
  filters,
  onFiltersChange,
  enrollmentId,
  sessionId,
  onOpen,
}: {
  dataset: Dataset;
  traces: TraceIndex | null;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  /** The open student, or the student of the open session. */
  enrollmentId: string | null;
  sessionId: string | null;
  onOpen: (enrollmentId: string, sessionId: string | null) => void;
}) => {
  const selection = useMemo(
    () => selectionOf(dataset, enrollmentId, sessionId),
    [dataset, enrollmentId, sessionId],
  );
  const [open, setOpen] = useState<ReadonlySet<string>>(
    () => new Set(branchKeysToStudent(dataset, enrollmentId)),
  );
  const openSession = (session: Session) =>
    onOpen(dataset.students[session.student].enrollmentId, session.sessionId);
  const options = useMemo(() => filterOptionsOf(dataset), [dataset]);
  const courses = useMemo(
    () => treeOf(dataset, filters, traces?.enrollments),
    [dataset, filters, traces],
  );
  const narrowed =
    filters.search.trim() !== "" ||
    filters.check !== "" ||
    filters.unfinishedOnly ||
    (filters.tracedOnly && traces !== null);
  const shownOpen = useMemo(
    () =>
      narrowed ? new Set([...open, ...branchKeysOf(courses, false)]) : open,
    [narrowed, open, courses],
  );
  const items = useMemo(
    () => flattenTree(courses, shownOpen),
    [courses, shownOpen],
  );
  const toggle = (key: string) => {
    const next = new Set(open);
    if (!next.delete(key)) next.add(key);
    setOpen(next);
  };
  const selectedKey =
    selection === null ? null : `${selection.kind}:${selection.index}`;
  return (
    <div className="students">
      <div className="students-left card">
        <FilterBar
          filters={filters}
          options={options}
          tracedLabel={
            traces === null
              ? null
              : `Only the ${traces.enrollments.size} students with decisions`
          }
          onChange={onFiltersChange}
          onExpand={() => setOpen(new Set(branchKeysOf(courses, false)))}
          onCollapse={() => setOpen(new Set())}
        />
        <TreeList
          dataset={dataset}
          traces={traces}
          items={items}
          open={shownOpen}
          selectedKey={selectedKey}
          emptyText="No session matches these filters."
          onToggle={toggle}
          onSelect={(item) => {
            if (item.kind === "student")
              onOpen(item.student.enrollmentId, null);
            if (item.kind === "session") openSession(item.session);
          }}
        />
      </div>
      <div className="students-right card">
        {selection === null && (
          <p className="muted pad">Select a student or a session.</p>
        )}
        {selection?.kind === "student" && (
          <StudentDetail
            key={selection.index}
            dataset={dataset}
            traces={traces}
            student={dataset.students[selection.index]}
            onOpenSession={openSession}
          />
        )}
        {selection?.kind === "session" && (
          <SessionDetail
            key={selection.index}
            dataset={dataset}
            traces={traces}
            session={dataset.sessions[selection.index]}
          />
        )}
      </div>
    </div>
  );
};
