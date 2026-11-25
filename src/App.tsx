import { useState } from "react";
import { ChecksView } from "./components/ChecksView";
import { FILE_LABELS as labels } from "./components/fileLabels";
import { FileSlot } from "./components/FileSlot";
import { SimulationPicker } from "./components/SimulationPicker";
import { sameSimulation, sortSimulationFiles } from "./data/simulationFiles";
import { countOf } from "./components/format";
import { Progress } from "./components/Progress";
import { StudentsView } from "./components/StudentsView";
import { SummaryView } from "./components/SummaryView";
import { Tabs } from "./components/Tabs";
import type { Dataset } from "./data/dataset";
import { NO_FILTERS, type Filters } from "./data/tree";
import type { TraceIndex } from "./data/traces";
import { useDataset, type LoadState } from "./hooks/useDataset";
import { useTraces, type TraceState } from "./hooks/useTraces";
import { DecisionsControl } from "./components/DecisionsControl";
import { ParametersModal } from "./components/ParametersModal";

import { usePageLocation, type Tab } from "./hooks/usePageLocation";

const Explorer = ({
  dataset,
  traces,
}: {
  dataset: Dataset;
  traces: TraceIndex | null;
}) => {
  const { location, go } = usePageLocation();
  const { tab } = location;
  const setTab = (next: Tab) =>
    go({ tab: next, enrollmentId: null, sessionId: null });
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const failing = dataset.checks.filter(
    (check) => check.severity === "error" && check.count > 0,
  ).length;
  return (
    <>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "summary", label: "Summary" },
          { value: "rules", label: "Study rules", count: failing },
          { value: "students", label: "Students and sessions" },
        ]}
      />
      {tab === "summary" && <SummaryView dataset={dataset} traces={traces} />}
      {tab === "rules" && (
        <ChecksView
          checks={dataset.checks}
          onShowSessions={(check) => {
            setFilters({ ...NO_FILTERS, check });
            setTab("students");
          }}
        />
      )}
      {tab === "students" && (
        <StudentsView
          dataset={dataset}
          traces={traces}
          filters={filters}
          onFiltersChange={setFilters}
          enrollmentId={location.enrollmentId}
          sessionId={location.sessionId}
          onOpen={(enrollmentId, sessionId) =>
            go({ tab: "students", enrollmentId, sessionId })
          }
        />
      )}
    </>
  );
};

const traceStatusOf = (state: TraceState) => {
  if (state.status === "loading")
    return labels.reading(state.fileName, state.fraction);
  if (state.status === "failed") return state.message;
  if (state.status === "ready") return state.traces.fileName;
  return labels.none;
};

const answersStatusOf = (state: LoadState) => {
  if (state.status === "loading")
    return labels.reading(state.fileName, state.fraction);
  if (state.status === "failed") return state.message;
  if (state.status === "ready") return state.dataset.fileName;
  return "";
};

export const App = () => {
  const { state, load, clear } = useDataset();
  const { state: traceState, load: loadTraceFile } = useTraces();
  const [parametersOpen, setParametersOpen] = useState(false);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const parameters =
    traceState.status === "ready" ? traceState.traces.parameters : null;
  const openFiles = (files: File[]) => {
    const sorted = sortSimulationFiles(files);
    setUnknown(sorted.unknown);
    if (sorted.answers) void load(sorted.answers, sorted.answers.name);
    if (sorted.decisions)
      void loadTraceFile(sorted.decisions, sorted.decisions.name);
  };
  const pickFiles = (files: File[]) => {
    setPicking(true);
    openFiles(files);
  };
  const showPicker =
    picking || state.status === "empty" || state.status === "failed";
  const mismatch =
    state.status === "ready" &&
    traceState.status === "ready" &&
    !sameSimulation(state.dataset.fileName, traceState.traces.fileName);
  return (
    <div className="page">
      <header className="page-head">
        <h1>NSFv5 data explorer</h1>
        {state.status === "ready" && !showPicker && (
          <p className="muted">
            <strong>{labels.answers.name}</strong> {state.dataset.fileName} ·{" "}
            {countOf(state.dataset.rowCount, "answer")}{" "}
            <button
              className="link"
              onClick={() => {
                clear();
                setPicking(true);
              }}
            >
              {labels.answers.another}
            </button>
          </p>
        )}
        {state.status === "ready" && !showPicker && (
          <DecisionsControl
            state={traceState}
            onFile={(file) => openFiles([file])}
            onShowParameters={
              parameters === null ? null : () => setParametersOpen(true)
            }
          />
        )}
        {mismatch && (
          <p className="error">
            {labels.mismatch(
              state.dataset.fileName,
              traceState.traces.fileName,
            )}
          </p>
        )}
      </header>
      {showPicker && (
        <SimulationPicker
          continueLabel={labels.continue}
          onContinue={state.status === "ready" ? () => setPicking(false) : null}
          title={labels.title}
          hint={labels.hint}
          notice={labels.notice}
          error={unknown.length > 0 ? labels.unknown(unknown) : null}
          onFiles={pickFiles}
        >
          <FileSlot
            name={labels.answers.name}
            suffix={labels.answers.suffix}
            status={answersStatusOf(state)}
            failed={state.status === "failed"}
            buttonLabel={labels.answers.choose}
            accept={labels.answers.accept}
            onFile={(file) => pickFiles([file])}
          />
          <FileSlot
            name={labels.decisions.name}
            suffix={labels.decisions.suffix}
            note={labels.decisions.note}
            status={
              traceState.status === "empty" ? "" : traceStatusOf(traceState)
            }
            failed={traceState.status === "failed"}
            buttonLabel={labels.decisions.choose}
            accept={labels.decisions.accept}
            onFile={(file) => pickFiles([file])}
          />
        </SimulationPicker>
      )}
      {parameters !== null && (
        <ParametersModal
          parameters={parameters}
          open={parametersOpen}
          onClose={() => setParametersOpen(false)}
        />
      )}
      {state.status === "loading" && !showPicker && (
        <Progress
          label={`Reading ${state.fileName}`}
          fraction={state.fraction}
        />
      )}
      {state.status === "ready" && !showPicker && (
        <Explorer
          key={state.dataset.fileName}
          dataset={state.dataset}
          traces={traceState.status === "ready" ? traceState.traces : null}
        />
      )}
    </div>
  );
};
