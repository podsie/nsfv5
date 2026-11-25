export interface TabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export const Tabs = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) => (
  <nav className="tabs">
    {options.map((option) => (
      <button
        key={option.value}
        className={option.value === value ? "tab tab-active" : "tab"}
        onClick={() => onChange(option.value)}
      >
        {option.label}
        {option.count !== undefined && option.count > 0 && (
          <span className="tab-count">
            {option.count.toLocaleString("en-US")}
          </span>
        )}
      </button>
    ))}
  </nav>
);
