import type { TraceState } from "../hooks/useTraces";
import { FILE_LABELS as labels } from "./fileLabels";
import { countOf } from "./format";

const textOf = (state: TraceState) => {
  if (state.status === "loading")
    return `Reading ${state.fileName} (${Math.round(state.fraction * 100)}%)`;
  if (state.status === "failed") return state.message;
  if (state.status === "ready")
    return `${state.traces.fileName} · ${countOf(state.traces.enrollments.size, "student")} in ${countOf(state.traces.sessions.size, "session")}`;
  return labels.none;
};

export const DecisionsControl = ({
  state,
  onFile,
  onShowParameters,
}: {
  state: TraceState;
  /** Opens the model parameters, or null when the file has none. */
  onShowParameters: (() => void) | null;
  onFile: (file: File) => void;
}) => (
  <p className={state.status === "failed" ? "error" : "muted"}>
    <strong>{labels.decisions.name}</strong> {textOf(state)}{" "}
    <label className="link">
      {state.status === "ready"
        ? labels.decisions.another
        : `${labels.decisions.choose} (${labels.decisions.suffix})`}
      <input
        type="file"
        accept={labels.decisions.accept}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </label>
    {onShowParameters !== null && " · "}
    {onShowParameters !== null && (
      <button className="link" onClick={onShowParameters}>
        Model parameters
      </button>
    )}
  </p>
);
