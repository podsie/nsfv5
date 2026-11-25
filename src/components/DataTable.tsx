import type { ReactNode } from "react";

export interface Column<T> {
  header: string;
  align?: "right";
  cell: (row: T) => ReactNode;
}

export const DataTable = <T,>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selectedKey,
  rowClass,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  selectedKey?: string | number | null;
  rowClass?: (row: T) => string;
}) => (
  <div className="table-scroll">
    <table className="table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.header} className={column.align}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            className={[
              onRowClick ? "clickable" : "",
              selectedKey === rowKey(row) ? "selected" : "",
              rowClass?.(row) ?? "",
            ].join(" ")}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns.map((column) => (
              <td key={column.header} className={column.align}>
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
