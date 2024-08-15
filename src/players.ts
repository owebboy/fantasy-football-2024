export interface PlayerPosition {
  position: string;
  rank: number;
}

export interface Player {
  rank: number;
  name: string;
  team: string;
  position: PlayerPosition;
  price: number;
  bye: number;
}

export default async function getPlayers(): Promise<Player[]> {
  return (await import("./assets/players.json")).default;
}
