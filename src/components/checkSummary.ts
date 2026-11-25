import type { CheckResult } from "../data/dataset";
import { countOf } from "./format";

const number = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 1 });

/** What broke a check: per enrollment when the check is counted that way, and by sessions otherwise. */
export const checkSummaryOf = (check: CheckResult): string => {
  const spread = check.perEnrollment;
  if (!spread)
    return `${number(check.count)} ${check.unit} in ${countOf(check.sessions.length, "session")}`;
  const unit = check.unit.charAt(0).toUpperCase() + check.unit.slice(1);
  return `${countOf(spread.enrollments, "enrollment")}. ${unit} per enrollment: min ${number(spread.min)}, median ${number(spread.median)}, mean ${number(spread.mean)}, max ${number(spread.max)}`;
};
