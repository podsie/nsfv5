import type { MassedSlotDecision, OptimalDecision } from "../data/traces";

const fixed = (value: number, digits = 3) => value.toFixed(digits);

/** The wording of the Podsie admin report of saved picks. */
export const PICK_LABELS = {
  source: { sm2: "SM2", optimal: "Optimal", massed: "Massed" },
  chosenBy: {
    "massed-slot": "The massed question was served",
    algorithm: "Chosen by the algorithm",
    "massed-fallback":
      "No candidate was left, so the massed question was served",
  },
  chosenByShort: {
    "massed-slot": "Massed slot",
    algorithm: "Algorithm",
    "massed-fallback": "Massed fallback",
  },
  massedSlot: "Massed slot",
  noMassedQuestion: "This session has no massed question.",
  massedFacts: (slot: MassedSlotDecision) =>
    `Massed item ${slot.massedContainerId}: ${slot.massedServed} served, ${slot.massedServesLeft} left, ${slot.attemptsAnswered} attempts answered, ${slot.placesLeft} places left in the window.`,
  noDraw: "No draw was needed.",
  draw: (draw: number, chance: number) =>
    `Draw ${fixed(draw)} against probability ${fixed(chance)}.`,
  weekTaken:
    "The student already had a massed question in another session this week.",
  algorithmSkipped: "The algorithm did not run.",
  container: "Item",
  chosenMark: "Chosen",
  noCandidates: "No candidates.",
  yes: "Yes",
  sm2: {
    recent: (containerId: number | null) =>
      containerId === null
        ? "No item was served before this one."
        : `Item ${containerId} was served last, so it is skipped while another candidate remains.`,
    headers: [
      "Rank",
      "Unseen",
      "Missed in this session",
      "Served last",
      "Due",
      "Interval (days)",
      "eFactor",
      "Streak",
      "Last reviewed",
    ],
    noCard: "No card",
  },
  optimal: {
    summary: (decision: OptimalDecision) =>
      `Target ${fixed(decision.targetProbability, 2)}. Student ability ${fixed(decision.ability)}. Last 5 served: ${decision.recentServedContainerIds.join(", ") || "none"}.`,
    rule: {
      "closest-to-target": "Probability closest to the target",
      "highest-below-target": "Highest probability below the target",
    },
    onlyRecentLeft:
      "Every candidate was among the last 5 served, so none was excluded.",
    headers: ["Probability", "In last 5", "Item history", "PPES", "Logit"],
  },
};
