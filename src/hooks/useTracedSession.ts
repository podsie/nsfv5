import { useEffect, useState } from "react";
import {
  readTracedSession,
  type TracedSession,
  type TraceIndex,
} from "../data/traces";

/** The saved picks of a session, read from the decisions file. Null when it has none or while the read runs. */
export const useTracedSession = (
  traces: TraceIndex | null,
  key: string,
): TracedSession | null => {
  const [loaded, setLoaded] = useState<{
    key: string;
    session: TracedSession | null;
  } | null>(null);
  useEffect(() => {
    if (traces === null || !traces.sessions.has(key)) return;
    let cancelled = false;
    void readTracedSession(traces, key).then((session) => {
      if (!cancelled) setLoaded({ key, session });
    });
    return () => {
      cancelled = true;
    };
  }, [traces, key]);
  return loaded?.key === key ? loaded.session : null;
};
