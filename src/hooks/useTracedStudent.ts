import { useEffect, useState } from "react";
import {
  readTracedSession,
  sessionKeysOf,
  type TracedSession,
  type TraceIndex,
} from "../data/traces";

/** Every saved session of a student, read from the decisions file. Null when the student has none or while the read runs. */
export const useTracedStudent = (
  traces: TraceIndex | null,
  enrollmentId: string,
): TracedSession[] | null => {
  const [loaded, setLoaded] = useState<{
    enrollmentId: string;
    sessions: TracedSession[];
  } | null>(null);
  useEffect(() => {
    if (traces === null || !traces.enrollments.has(enrollmentId)) return;
    let cancelled = false;
    void Promise.all(
      sessionKeysOf(traces, enrollmentId).map((key) =>
        readTracedSession(traces, key),
      ),
    ).then((sessions) => {
      if (!cancelled)
        setLoaded({
          enrollmentId,
          sessions: sessions.filter((session) => session !== null),
        });
    });
    return () => {
      cancelled = true;
    };
  }, [traces, enrollmentId]);
  return loaded?.enrollmentId === enrollmentId ? loaded.sessions : null;
};
