import { useCallback, useEffect, useState } from "react";
import type { Dataset } from "../data/dataset";
import { loadTsv } from "../data/loadTsv";

export type LoadState =
  | { status: "empty" }
  | { status: "loading"; fileName: string; fraction: number }
  | { status: "failed"; message: string }
  | { status: "ready"; dataset: Dataset };

/** Loads a TSV from a chosen file, or from /tsv when the dev server has one. */
export const useDataset = () => {
  const [state, setState] = useState<LoadState>({ status: "empty" });

  const load = useCallback(async (blob: Blob, fileName: string) => {
    setState({ status: "loading", fileName, fraction: 0 });
    try {
      const dataset = await loadTsv(blob, fileName, (fraction) =>
        setState({ status: "loading", fileName, fraction }),
      );
      setState({ status: "ready", dataset });
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
      const response = await fetch("tsv").catch(() => null);
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

  const clear = useCallback(() => setState({ status: "empty" }), []);
  return { state, load, clear };
};
