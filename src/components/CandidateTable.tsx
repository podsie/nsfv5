export const CandidateTable = ({
  headers,
  rows,
  emptyLabel,
}: {
  headers: string[];
  rows: { key: number; chosen: boolean; cells: string[] }[];
  emptyLabel: string;
}) =>
  rows.length === 0 ? (
    <p className="muted">{emptyLabel}</p>
  ) : (
    <div className="scroll-x">
      <table className="table candidates">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={row.chosen ? "chosen" : ""}>
              {row.cells.map((cell, index) => (
                <td key={headers[index]}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
