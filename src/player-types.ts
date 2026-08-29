export interface PlayerPosition {
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';
  rank: number;
}

export interface PlayerRankings {
  ff: number | null;
  espn: number | null;
  fp: number | null;
  avg: number;
}

export interface RankingVector {
  x: number;
  y: number;
  magnitude: number;
  angle: number;
}

export interface Player {
  rank: number;
  name: string;
  team: string;
  position: PlayerPosition;
  price: number;
  bye: number;
  vector: RankingVector;
  consensusStrength: number;
  variance: number;
  rankings: PlayerRankings | null;
  /** Jeff Mans Top 200 merge — absent for players outside the list */
  jeff?: { rank: number; adp: number | null; high: boolean; sos: number | null } | null;
}
