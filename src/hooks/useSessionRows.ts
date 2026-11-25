import { useEffect, useState } from "react";
import type { Dataset, Session } from "../data/dataset";
import { readRows } from "../data/loadTsv";

/** The full column values of a session's rows, read from the file. Null while the read runs. */
export const useSessionRows = (
  dataset: Dataset,
  session: Session,
): string[][] | null => {
  const [loaded, setLoaded] = useState<{
    session: number;
    values: string[][];
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void readRows(dataset, session.rows).then((values) => {
      if (!cancelled) setLoaded({ session: session.index, values });
    });
    return () => {
      cancelled = true;
    };
  }, [dataset, session]);
  return loaded?.session === session.index ? loaded.values : null;
};
