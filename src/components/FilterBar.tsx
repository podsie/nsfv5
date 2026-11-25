import { CHECKS } from "../data/checks";
import type { Filters } from "../data/tree";
import { phaseLabelOf } from "./format";

const Select = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) => (
  <label className="field">
    <span>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">All</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const plain = (values: string[]) =>
  values.map((value) => ({ value, label: value }));

export const FilterBar = ({
  filters,
  options,
  tracedLabel,
  onChange,
  onExpand,
  onCollapse,
}: {
  filters: Filters;
  /** The label of the traced-only box, or null when no decisions file is open. */
  tracedLabel: string | null;
  options: { conditions: string[]; phases: string[]; weeks: string[] };
  onChange: (filters: Filters) => void;
  onExpand: () => void;
  onCollapse: () => void;
}) => {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  return (
    <div className="filters">
      <label className="field field-wide">
        <span>Student</span>
        <input
          type="search"
          placeholder="Anonymous id, enrollment id, or profile id"
          value={filters.search}
          onChange={(event) => set({ search: event.target.value })}
        />
      </label>
      <Select
        label="Condition"
        value={filters.condition}
        options={plain(options.conditions)}
        onChange={(condition) => set({ condition })}
      />
      <Select
        label="Phase"
        value={filters.phase}
        options={options.phases.map((value) => ({
          value,
          label: phaseLabelOf(value),
        }))}
        onChange={(phase) => set({ phase })}
      />
      <Select
        label="Study week"
        value={filters.week}
        options={plain(options.weeks)}
        onChange={(week) => set({ week })}
      />
      <Select
        label="Rule"
        value={filters.check}
        options={[
          { value: "any", label: "Any fail or notice" },
          ...CHECKS.map((check) => ({ value: check.id, label: check.label })),
        ]}
        onChange={(check) => set({ check })}
      />
      <label className="field check-field">
        <input
          type="checkbox"
          checked={filters.unfinishedOnly}
          onChange={(event) => set({ unfinishedOnly: event.target.checked })}
        />
        Only unfinished assignments
      </label>
      {tracedLabel !== null && (
        <label className="field check-field">
          <input
            type="checkbox"
            checked={filters.tracedOnly}
            onChange={(event) => set({ tracedOnly: event.target.checked })}
          />
          {tracedLabel}
        </label>
      )}
      <div className="filter-actions">
        <button className="link" onClick={onExpand}>
          Expand all
        </button>
        <button className="link" onClick={onCollapse}>
          Collapse all
        </button>
      </div>
    </div>
  );
};
