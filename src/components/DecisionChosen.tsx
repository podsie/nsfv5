import { memo } from "react";
import type { ChartGeometry } from "../data/chartGeometry";
import type { DecisionChart } from "../data/decisionChart";

/** The dot of the item each review pick chose. The chart draws it last, so nothing covers it. */
export const DecisionChosen = memo(
  ({ chart, geometry }: { chart: DecisionChart; geometry: ChartGeometry }) => (
    <>
      {chart.events.map((event) => {
        const at = geometry.yOfEvent(event);
        return (
          at !== null && (
            <circle
              key={event.trial}
              className={`chart-chosen chart-chosen-${event.kind}`}
              cx={geometry.x(event.trial)}
              cy={at}
              r={4}
            />
          )
        );
      })}
    </>
  ),
);
