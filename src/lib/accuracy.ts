import _ from "lodash";
import type { Player } from "../players";

export function calculateDraftMetrics(draft: Player[]) {
  return draft.map((player, actualPick) => {
    const { rank } = player;
    const error = Math.abs(rank - (actualPick + 1));
    const accuracy = _.round(1 - error / rank, 2);

    // Map accuracy to HSL color
    const hue = Math.round(accuracy * 120); // 0 (red) to 120 (green)
    const saturation = 100; // Full saturation
    const lightness = 50; // Medium lightness

    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

    return {
      rank,
      actualPick: actualPick + 1,
      accuracy,
      color, // Include the color in the returned object
    };
  });
}

export const displayPercent = (num: number) => {
  return _.round(num * 100, 0);
};

export type DraftMetrics = ReturnType<typeof calculateDraftMetrics>;
