import { col } from "../styles/utils";
import { inferQueryOutput } from "../utils/trpc";
import { Rating } from "./Rating";

export const SpotInfo = ({ spot }: { spot: inferQueryOutput<"getSpot"> }) => {
  return (
    <div
      css={`
        ${col}
        gap: var(--gap-list);
        p {
          color: var(--text-2);
        }
      `}
    >
      <div>
        <h4>{spot.name}</h4>
        <p>
          {spot.city}, {spot.state}
        </p>
        {spot.numWings > 0 && <p>{spot.numWings.toLocaleString()} wings</p>}
      </div>
      {spot.rating ? (
        <Rating displayValue={spot.rating} />
      ) : (
        <span>🚫 No wings</span>
      )}
    </div>
  );
};
