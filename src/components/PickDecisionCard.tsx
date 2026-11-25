import type { OptimalDecision, Pick, Sm2Decision } from "../data/traces";
import { Badge } from "./Badge";
import { CandidateTable } from "./CandidateTable";
import { PICK_LABELS as labels } from "./pickLabels";

const chosenCell = (containerId: number, chosen: boolean) =>
  chosen ? `${containerId} (${labels.chosenMark})` : String(containerId);

const Sm2Candidates = ({ decision }: { decision: Sm2Decision }) => (
  <>
    <p>{labels.sm2.recent(decision.recentContainerId)}</p>
    <CandidateTable
      headers={[labels.container, ...labels.sm2.headers]}
      emptyLabel={labels.noCandidates}
      rows={decision.candidates.map((candidate) => ({
        key: candidate.rank,
        chosen: candidate.rank === 1,
        cells: [
          chosenCell(candidate.questionContainerId, candidate.rank === 1),
          String(candidate.rank),
          candidate.unseen ? labels.yes : "",
          candidate.missed ? labels.yes : "",
          candidate.waits ? labels.yes : "",
          candidate.card?.dueDate ?? labels.sm2.noCard,
          candidate.card ? String(candidate.card.interval) : "",
          candidate.card ? candidate.card.eFactor.toFixed(2) : "",
          candidate.card ? String(candidate.card.streak) : "",
          candidate.card?.lastReviewedAt ?? "",
        ],
      }))}
    />
  </>
);

const OptimalCandidates = ({ decision }: { decision: OptimalDecision }) => (
  <>
    <p>{labels.optimal.summary(decision)}</p>
    {decision.rule && (
      <p>
        <strong>{labels.optimal.rule[decision.rule]}</strong>
      </p>
    )}
    {decision.onlyRecentLeft && <p>{labels.optimal.onlyRecentLeft}</p>}
    <CandidateTable
      headers={[labels.container, ...labels.optimal.headers]}
      emptyLabel={labels.noCandidates}
      rows={[...decision.candidates]
        .sort((a, b) => b.probability - a.probability)
        .map((candidate) => {
          const chosen =
            candidate.questionContainerId === decision.chosenContainerId;
          return {
            key: candidate.questionContainerId,
            chosen,
            cells: [
              chosenCell(candidate.questionContainerId, chosen),
              candidate.probability.toFixed(4),
              candidate.recent ? labels.yes : "",
              candidate.itemHistory.toFixed(4),
              candidate.ppes.toFixed(4),
              candidate.logit.toFixed(4),
            ],
          };
        })}
    />
  </>
);

/** One saved pick: the chosen question, what chose it, the massed slot check, and the candidates. */
export const PickDecisionCard = ({
  pick,
  title,
}: {
  pick: Pick;
  title: string;
}) => {
  const { massedSlot: slot, algorithm } = pick.decision;
  return (
    <section className="card">
      <header className="pick-head">
        <h3>{title}</h3>
        <span>Item {pick.questionContainerId}</span>
        <Badge tone="info">{labels.source[pick.source]}</Badge>
        <span className="muted pick-time">{pick.pickedAt}</span>
      </header>
      <p>
        <strong>{labels.chosenBy[pick.decision.chosenBy]}</strong>
      </p>
      <h4>{labels.massedSlot}</h4>
      <p>
        {slot.hasMassedQuestion
          ? labels.massedFacts(slot)
          : labels.noMassedQuestion}
      </p>
      <p>
        {slot.draw === null || slot.chance === null
          ? labels.noDraw
          : labels.draw(slot.draw, slot.chance)}
      </p>
      {slot.takenThisWeek && <p>{labels.weekTaken}</p>}
      {algorithm === null && <p className="muted">{labels.algorithmSkipped}</p>}
      {algorithm?.algorithm === "sm2" && <Sm2Candidates decision={algorithm} />}
      {algorithm?.algorithm === "optimal" && (
        <OptimalCandidates decision={algorithm} />
      )}
    </section>
  );
};
