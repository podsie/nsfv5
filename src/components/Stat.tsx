export const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="stat">
    <div className="stat-value">{value}</div>
    <div className="muted">{label}</div>
  </div>
);
