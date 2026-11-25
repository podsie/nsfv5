import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "good" | "bad" | "warn" | "info";

export const Badge = ({
  tone = "neutral",
  title,
  children,
}: {
  tone?: BadgeTone;
  title?: string;
  children: ReactNode;
}) => (
  <span className={`badge badge-${tone}`} title={title}>
    {children}
  </span>
);
