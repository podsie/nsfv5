/** A labelled on/off switch. */
export const Switch = ({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    className={on ? "switch switch-on" : "switch"}
    onClick={() => onChange(!on)}
  >
    <span className="switch-track">
      <span className="switch-thumb" />
    </span>
    {label}
  </button>
);
