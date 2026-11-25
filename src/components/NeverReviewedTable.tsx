import type { NeverReviewedItem } from "../data/unreviewed";
import { DataTable } from "./DataTable";
import { shortTimeOf } from "./format";
import { Section } from "./Section";

export const NeverReviewedTable = ({
  title,
  empty,
  headers,
  answerLabels,
  items,
}: {
  title: string;
  empty: string;
  headers: {
    item: string;
    week: string;
    answeredAt: string;
    answer: string;
  };
  answerLabels: { correct: string; incorrect: string };
  items: NeverReviewedItem[];
}) => {
  const weeks = [...new Set(items.map((row) => row.assignment?.week ?? ""))];
  return (
    <Section title={title}>
      {items.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <DataTable
          rows={items}
          rowKey={(row) => row.item}
          rowClass={(row) =>
            weeks.indexOf(row.assignment?.week ?? "") % 2 === 1 ? "band" : ""
          }
          columns={[
            { header: headers.item, cell: (row) => row.item },
            { header: headers.week, cell: (row) => row.assignment?.week ?? "" },
            {
              header: headers.answeredAt,
              cell: (row) =>
                row.answeredAt === null ? "" : shortTimeOf(row.answeredAt),
            },
            {
              header: headers.answer,
              cell: (row) =>
                row.correct === null
                  ? ""
                  : row.correct
                    ? answerLabels.correct
                    : answerLabels.incorrect,
            },
          ]}
        />
      )}
    </Section>
  );
};
