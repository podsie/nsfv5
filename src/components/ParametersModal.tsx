import type { LktParameters } from "../data/traces";
import { DataTable } from "./DataTable";
import { Modal } from "./Modal";

interface Entry {
  name: string;
  value: string;
  use: string;
}

const entriesOf = (p: LktParameters): { title: string; entries: Entry[] }[] => [
  {
    title: "Selection",
    entries: [
      {
        name: "Target probability",
        value: String(p.targetProbability),
        use: "A pick happens while any item is below the target. The pick is the item whose probability is closest to the target, above or below.",
      },
      {
        name: "Recently served",
        value: String(p.recentServedWindow),
        use: "The most recently served items, up to this many, are excluded unless no other item remains.",
      },
    ],
  },
  {
    title: "Coefficients of the logit",
    entries: [
      { name: "Intercept", value: String(p.intercept), use: "" },
      {
        name: "Item history",
        value: String(p.itemHistoryCoefficient),
        use: "Multiplies the logitdec of the student's outcomes on the item.",
      },
      {
        name: "PPES",
        value: String(p.ppesCoefficient),
        use: "Multiplies the item's PPES term.",
      },
      {
        name: "Student ability",
        value: String(p.abilityCoefficient),
        use: "Multiplies the logitdec of the student's outcomes on all items.",
      },
    ],
  },
  {
    title: "Nonlinear parameters",
    entries: [
      {
        name: "Student decay",
        value: String(p.abilityDecay),
        use: "Decay d of the student ability logitdec.",
      },
      {
        name: "Student-item decay",
        value: String(p.itemHistoryDecay),
        use: "Decay d of the item history logitdec.",
      },
      {
        name: "PPES alpha",
        value: String(p.power),
        use: "Power on the count of earlier right answers.",
      },
      {
        name: "PPES beta",
        value: String(p.baseDecay),
        use: "Base decay with the weighted age.",
      },
      {
        name: "PPES gamma",
        value: String(p.spacingEffect),
        use: "Added decay for each unit of spacing.",
      },
      {
        name: "PPES delta",
        value: String(p.timeWindow),
        use: "Weight of each earlier answer's age in the weighted age.",
      },
      {
        name: "Outcome window",
        value: String(p.outcomeWindow),
        use: "A logitdec reads at most this many earlier outcomes.",
      },
    ],
  },
];

export const ParametersModal = ({
  parameters,
  open,
  onClose,
}: {
  parameters: LktParameters;
  open: boolean;
  onClose: () => void;
}) => (
  <Modal
    title="Optimal model parameters"
    closeLabel="Close"
    open={open}
    onClose={onClose}
  >
    <pre className="formula">
      {`probability = 1 / (1 + e^-logit)
logit  = intercept
       + item history coefficient × logitdec(outcomes on the question)
       + PPES coefficient × PPES
       + student ability coefficient × logitdec(outcomes on every question)
PPES   = right answers^alpha × weighted age^-(beta + gamma × spacing)`}
    </pre>
    {entriesOf(parameters).map((group) => (
      <section key={group.title}>
        <h4>{group.title}</h4>
        <DataTable
          rows={group.entries}
          rowKey={(entry) => entry.name}
          columns={[
            { header: "Parameter", cell: (entry) => entry.name },
            {
              header: "Value",
              align: "right",
              cell: (entry) => <code>{entry.value}</code>,
            },
            {
              header: "Use",
              cell: (entry) => <span className="wrap">{entry.use}</span>,
            },
          ]}
        />
      </section>
    ))}
  </Modal>
);
