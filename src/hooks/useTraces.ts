import { useCallback, useEffect, useState } from "react";
import { loadTraces, type TraceIndex } from "../data/traces";

export type TraceState =
  | { status: "empty" }
  | { status: "loading"; fileName: string; fraction: number }
  | { status: "failed"; message: string }
  | { status: "ready"; traces: TraceIndex };

/** Loads a decisions file from a chosen file, or from /decisions when the dev server has one. */
export const useTraces = () => {
  const [state, setState] = useState<TraceState>({ status: "empty" });

  const load = useCallback(async (blob: Blob, fileName: string) => {
    setState({ status: "loading", fileName, fraction: 0 });
    try {
      const traces = await loadTraces(blob, fileName, (fraction) =>
        setState({ status: "loading", fileName, fraction }),
      );
      setState({ status: "ready", traces });
    } catch (error) {
      setState({
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadServed = async () => {
      const response = await fetch("decisions").catch(() => null);
      // Only the dev server names the file. A static host can answer this address with a page.
      const fileName = response?.headers.get("X-File-Name") ?? null;
      if (cancelled || response?.status !== 200 || fileName === null) return;
      setState({ status: "loading", fileName, fraction: 0 });
      const blob = await response.blob();
      if (!cancelled) await load(blob, fileName);
    };
    void loadServed();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { state, load };
};
