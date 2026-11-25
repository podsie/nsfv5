import type { CheckResult } from "../data/dataset";
import { Badge } from "./Badge";
import { checkSummaryOf } from "./checkSummary";
import { Section } from "./Section";

const toneOf = (check: CheckResult) => {
  if (check.count === 0) return "good";
  return check.severity === "error" ? "bad" : "warn";
};

const statusOf = (check: CheckResult) => {
  if (check.count === 0) return "Pass";
  return check.severity === "error" ? "Fail" : "Notice";
};

export const ChecksView = ({
  checks,
  onShowSessions,
}: {
  checks: CheckResult[];
  onShowSessions: (checkId: string) => void;
}) => (
  <Section title="Study rules" note="A notice does not break a study rule.">
    <ul className="checks">
      {checks.map((check) => (
        <li key={check.id}>
          <Badge tone={toneOf(check)}>{statusOf(check)}</Badge>
          <span className="check-label">{check.label}</span>
          {check.count > 0 && (
            <>
              <span className="muted">{checkSummaryOf(check)}</span>
              {check.sessions.length > 0 && (
                <button
                  className="link"
                  onClick={() => onShowSessions(check.id)}
                >
                  Show sessions
                </button>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  </Section>
);
