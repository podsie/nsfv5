const pad = (n: number) => String(n).padStart(2, "0");

/** "Jan 6, 14:00:28" in UTC. */
export const shortTimeOf = (ms: number): string => {
  const at = new Date(ms);
  const month = at.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${month} ${at.getUTCDate()}, ${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}:${pad(at.getUTCSeconds())}`;
};

export const countOf = (n: number, one: string, many = `${one}s`): string =>
  `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

export const PHASE_LABELS: Record<string, string> = {
  assignment: "Assignment",
  review: "Review",
  posttest1: "Post test 1",
  posttest2: "Post test 2",
};

export const phaseLabelOf = (phase: string) => PHASE_LABELS[phase] ?? phase;
