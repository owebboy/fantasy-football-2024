import type { Player, PlayerPosition } from "../players";
import _ from "lodash";

export const chunkedPlayers = (players: Player[]) => {
  return players
    .reduce((acc: Player[][], player, idx) => {
      const chunkIdx = Math.floor(idx / 12);
      if (!acc[chunkIdx]) {
        acc[chunkIdx] = [];
      }
      acc[chunkIdx].push(player);
      return acc;
    }, [])
    .map((round, idx) => (idx % 2 === 0 ? round : round.reverse()));
};

export const calculatePositionColor = (
  position: PlayerPosition["position"]
) => {
  switch (position) {
    case "QB":
      return "#00509E";
    case "RB":
      return "#228B22";
    case "WR":
      return "#C60C30";
    case "TE":
      return "#c46c00";
    case "DST":
      return "#6A0DAD";
    case "K":
      return "#333333";
    default:
      return "black";
  }
};

export const currentPick = (draft: Player[]) => {
  const currentPick = draft.length + 1;
  return currentPick;
};

export const currentRound = (draft: Player[]) => {
  const currentRound = Math.ceil((draft.length + 1) / 12);
  return currentRound || 1;
};

export const findPlayer = (player: Player, arr: Player[]) => {
  return arr.find((p) => p.name === player.name);
};

export const togglePlayer = (player: Player, arr: Player[]) => {
  if (findPlayer(player, arr)) {
    return arr.filter((p) => p !== player);
  }

  return [...arr, player];
};
