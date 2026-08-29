import fs from 'node:fs';

// 2026 NFL bye weeks — sourced from Sharp Football Analysis (May 31, 2026)
// https://www.sharpfootballanalysis.com/analysis/nfl-bye-weeks/
const byeWeeks = {
  ARI: 14,
  ATL: 11,
  BAL: 13,
  BUF: 7,
  CAR: 5,
  CHI: 10,
  CIN: 6,
  CLE: 11,
  DAL: 14,
  DEN: 10,
  DET: 6,
  GB: 11,
  HOU: 8,
  IND: 13,
  JAX: 7,
  KC: 5,
  LAC: 7,
  LAR: 11,
  LV: 13,
  MIA: 6,
  MIN: 6,
  NE: 11,
  NO: 8,
  NYG: 8,
  NYJ: 13,
  PHI: 10,
  PIT: 9,
  SEA: 11,
  SF: 8,
  TB: 10,
  TEN: 9,
  WAS: 7,
};

// Price calculation based on rank
function calculatePrice(rank) {
  if (rank <= 10) return Math.max(60 - rank * 2, 45);
  if (rank <= 20) return Math.max(50 - (rank - 10) * 2, 30);
  if (rank <= 30) return Math.max(35 - (rank - 20) * 2, 20);
  if (rank <= 50) return Math.max(25 - Math.floor((rank - 30) / 2), 10);
  if (rank <= 75) return Math.max(15 - Math.floor((rank - 50) / 3), 5);
  if (rank <= 100) return Math.max(8 - Math.floor((rank - 75) / 5), 2);
  if (rank <= 150) return Math.max(3 - Math.floor((rank - 100) / 20), 1);
  return 0;
}

// Calculate vector coordinates for ranking compass
function calculateRankingVector(entry) {
  // Get ranks, null if missing
  const ffRank = entry.fleaflickerRank || null;
  const espnRank = entry.espnRank || null;
  const fpRank = entry.fantasyprosRank || null;

  // Normalize ranks to 0-1 scale (higher rank number → worse rank)
  const normalize = (rank) => (rank - 1) / 299;

  // Only include sources that have actual data
  const ffNorm = ffRank !== null ? normalize(ffRank) : 0;
  const espnNorm = espnRank !== null ? normalize(espnRank) : 0;
  const fpNorm = fpRank !== null ? normalize(fpRank) : 0;

  // Calculate vector components
  // FF is North (up), ESPN is Southeast, FP is Southwest
  // Missing sources contribute zero (no pull in their direction)
  const ffVector = { x: 0, y: -ffNorm };
  const espnVector = { x: espnNorm * Math.SQRT1_2, y: espnNorm * Math.SQRT1_2 };
  const fpVector = { x: -fpNorm * Math.SQRT1_2, y: fpNorm * Math.SQRT1_2 };

  // Sum vectors to get resultant
  const resultX = ffVector.x + espnVector.x + fpVector.x;
  const resultY = ffVector.y + espnVector.y + fpVector.y;

  // Calculate magnitude and angle
  const magnitude = Math.sqrt(resultX * resultX + resultY * resultY);
  const angle = Math.atan2(resultY, resultX) * (180 / Math.PI);

  // Calculate variance between available sources only
  const ranks = [ffRank, espnRank, fpRank].filter((r) => r !== null);
  let variance = 0;
  let averageRank = espnRank || fpRank || ffRank || 300;

  if (ranks.length > 1) {
    averageRank = Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length);
    variance = Math.sqrt(ranks.reduce((sum, r) => sum + (r - averageRank) ** 2, 0) / ranks.length);
  }

  // Determine consensus strength based on variance
  let consensusStrength;
  if (ranks.length < 2) {
    consensusStrength = 0; // No consensus data
  } else if (variance <= 5) {
    consensusStrength = 1; // Strong consensus
  } else if (variance <= 15) {
    consensusStrength = 0.75; // Moderate consensus
  } else if (variance <= 30) {
    consensusStrength = 0.5; // Weak consensus
  } else {
    consensusStrength = 0.25; // High variance
  }

  return {
    vector: {
      x: Math.round(resultX * 100) / 100,
      y: Math.round(resultY * 100) / 100,
      magnitude: Math.round(magnitude * 100) / 100,
      angle: Math.round(angle),
    },
    consensusStrength,
    variance: Math.round(variance * 10) / 10,
    averageRank,
  };
}

// Read and parse the merged data
let mergedData;
try {
  mergedData = JSON.parse(fs.readFileSync('merged-all.json', 'utf8'));
} catch (err) {
  console.error('Failed to read merged-all.json:', err.message);
  process.exit(1);
}

// Filter for entries with Fleaflicker rankings (Fleaflicker is our primary source)
const qualityEntries = mergedData
  .filter((entry) => {
    // Must have Fleaflicker ranking and basic player info
    return entry.fleaflickerRank && entry.name && entry.team && entry.position;
  })
  .sort((a, b) => a.fleaflickerRank - b.fleaflickerRank);

// Map position strings to valid positions
const positionMap = {
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  TE: 'TE',
  K: 'K',
  DST: 'DST',
  'D/ST': 'DST',
};

// Create the transformed players array
const players = [];
let overallRank = 1;

// Take top 300 players by Fleaflicker rank (including K/DST if they're ranked high enough)
const topPlayers = qualityEntries.slice(0, 300);

// Track position ranks
const positionRanks = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };

topPlayers.forEach((entry) => {
  const position = positionMap[entry.position] || entry.position;
  if (!positionMap[entry.position]) {
    console.warn(`Unknown position "${entry.position}" for ${entry.name} — using as-is`);
  }
  positionRanks[position]++;

  const rankingData = calculateRankingVector(entry);

  players.push({
    rank: overallRank++,
    name: entry.name,
    team: entry.team,
    position: {
      position: position,
      rank: positionRanks[position],
    },
    price: calculatePrice(overallRank - 1),
    bye: byeWeeks[entry.team] || 0,
    vector: rankingData.vector,
    consensusStrength: rankingData.consensusStrength,
    variance: rankingData.variance,
    rankings: {
      ff: entry.fleaflickerRank || null,
      espn: entry.espnRank || null,
      fp: entry.fantasyprosRank || null,
      avg: rankingData.averageRank,
    },
  });
});

// Write generated player data to JSON (interfaces live in src/player-types.ts)
fs.writeFileSync('src/players.json', JSON.stringify(players.slice(0, 300), null, 2));
console.log(`Wrote ${players.length} players to src/players.json`);
