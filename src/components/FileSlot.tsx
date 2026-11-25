/** One of the two files of a simulation: what it is, how its name ends, what is open, and a button to choose it. */
export const FileSlot = ({
  name,
  suffix,
  note,
  status,
  failed,
  buttonLabel,
  accept,
  onFile,
}: {
  name: string;
  suffix: string;
  note?: string;
  /** The open file's name, a progress line, or that none is open. */
  status: string;
  failed: boolean;
  buttonLabel: string;
  accept: string;
  onFile: (file: File) => void;
}) => (
  <div className="file-slot">
    <h3>
      {name} <code>{suffix}</code>
      {note && <span className="muted"> ({note})</span>}
    </h3>
    {status !== "" && (
      <p className={failed ? "error" : "file-status"}>{status}</p>
    )}
    <label className="button">
      {buttonLabel}
      <input
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </label>
  </div>
);
