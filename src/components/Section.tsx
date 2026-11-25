import type { ReactNode } from "react";

export const Section = ({
  title,
  note,
  wide = false,
  children,
}: {
  title: string;
  note?: string;
  /** Takes the whole row of a grid. */
  wide?: boolean;
  children: ReactNode;
}) => (
  <section className={wide ? "card wide" : "card"}>
    <h3>{title}</h3>
    {note !== undefined && <p className="muted">{note}</p>}
    {children}
  </section>
);
