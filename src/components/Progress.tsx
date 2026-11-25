export const Progress = ({
  label,
  fraction,
}: {
  label: string;
  fraction: number;
}) => (
  <div className="picker">
    <p>{label}</p>
    <div className="progress">
      <div style={{ width: `${Math.round(fraction * 100)}%` }} />
    </div>
  </div>
);
