import { useState, type DragEvent, type ReactNode } from "react";

/** The start page: a drop area for both files of a simulation, with one slot for each. */
export const SimulationPicker = ({
  title,
  hint,
  notice,
  error,
  continueLabel,
  onContinue,
  onFiles,
  children,
}: {
  title: string;
  hint: string;
  notice: string;
  error: string | null;
  continueLabel: string;
  /** Opens the explorer. Null until the answers file is read. */
  onContinue: (() => void) | null;
  onFiles: (files: File[]) => void;
  /** The two file slots. */
  children: ReactNode;
}) => {
  const [over, setOver] = useState(false);
  const drop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    onFiles([...event.dataTransfer.files]);
  };
  return (
    <div
      className={`picker picker-wide ${over ? "picker-over" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
    >
      <h2>{title}</h2>
      <div className="file-slots">{children}</div>
      {error !== null && <p className="error">{error}</p>}
      <p className="muted">{hint}</p>
      <button
        className="button primary"
        disabled={onContinue === null}
        onClick={() => onContinue?.()}
      >
        {continueLabel}
      </button>
      <p className="notice">{notice}</p>
    </div>
  );
};
