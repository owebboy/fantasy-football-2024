import fs from 'node:fs';

// Jeff Mans Top 200 merge
//
// Reads jeff-mans-top-200-rankings.tsv (columns: rank | player | team | bye | adp | high | sos)
// and merges it into src/players.json:
//   - every matched player gets a `jeff` field: { rank, adp, high, sos }
//   - TSV players missing from src/players.json are appended as new player records
//     (positions below were verified via Wikipedia research, Aug 2026)
//
// Re-running is safe: previous `jeff` data is cleared first and players are never duplicated.

const TSV_PATH = 'jeff-mans-top-200-rankings.tsv';
const PLAYERS_PATH = 'src/players.json';

const normalize = (name) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/(jr|sr|iii|ii|iv|v)$/, '')
    .trim();

// Known name differences between the TSV and src/players.json (normalized forms)
const NAME_ALIASES = {
  kennygainwell: 'kennethgainwell',
};

// Normalized NFL team full name -> team code.
// Used to detect DST rows in the TSV and merge them by team code.
const TEAM_NAMES = {
  arizonacardinals: 'ARI',
  atlantafalcons: 'ATL',
  baltimoreravens: 'BAL',
  buffalobills: 'BUF',
  carolinapanthers: 'CAR',
  chicagobears: 'CHI',
  cincinnatibengals: 'CIN',
  clevelandbrowns: 'CLE',
  dallascowboys: 'DAL',
  denverbroncos: 'DEN',
  detroitlions: 'DET',
  greenbaypackers: 'GB',
  houstontexans: 'HOU',
  indianapoliscolts: 'IND',
  jacksonvillejaguars: 'JAX',
  kansascitychiefs: 'KC',
  lasvegasraiders: 'LV',
  losangeleschargers: 'LAC',
  losangelesrams: 'LAR',
  miamidolphins: 'MIA',
  minnesotavikings: 'MIN',
  newenglandpatriots: 'NE',
  neworleanssaints: 'NO',
  newyorkgiants: 'NYG',
  newyorkjets: 'NYJ',
  philadelphiaeagles: 'PHI',
  pittsburghsteelers: 'PIT',
  sanfrancisco49ers: 'SF',
  seattleseahawks: 'SEA',
  tampabaybuccaneers: 'TB',
  tennesseetitans: 'TEN',
  washingtoncommanders: 'WAS',
};

// Positions for TSV players missing from src/players.json (normalized name -> position).
// Verified via Wikipedia, Aug 2026:
//   Keenan Allen (WR, IND) · Sean Tucker (RB, TB) · Wil Lutz (K, DEN)
//   Jaylin Noel (WR, HOU) · Zachariah Branch (WR, ATL) · Tyler Bass (K, BUF)
//   Malachi Fields (WR, NYG) — DSTs are detected via TEAM_NAMES.
const MISSING_POSITIONS = {
  keenanallen: 'WR',
  seantucker: 'RB',
  willutz: 'K',
  jaylinnoel: 'WR',
  zachariahbranch: 'WR',
  tylerbass: 'K',
  malachifields: 'WR',
};

// Same price tiers as transform-data.js so appended players get consistent prices
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

function parseTsv(text) {
  return (
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split('\t'))
      // Skip header rows (e.g. "Rank Player Team Bye ADP High SOS") — data rows start with a number
      .filter((fields) => Number.isInteger(Number.parseInt(fields[0], 10)))
      .map((fields) => {
        const [rank, name, team, bye, adp, high, sos] = fields;
        return {
          rank: Number.parseInt(rank, 10),
          name: name.trim(),
          team: team.trim(),
          bye: Number.parseInt(bye, 10) || 0,
          adp: adp?.trim() ? Number.parseInt(adp, 10) : null,
          high: (high ?? '').trim() === '▲',
          sos: sos?.trim() ? Number.parseInt(sos, 10) : null,
        };
      })
  );
}

const isDstRow = (row) => TEAM_NAMES[normalize(row.name)] !== undefined;

// ---- merge ----
let players;
try {
  players = JSON.parse(fs.readFileSync(PLAYERS_PATH, 'utf8'));
} catch (err) {
  console.error(`[jeff] Failed to read ${PLAYERS_PATH}: ${err.message}`);
  process.exit(1);
}

// Index existing players
const byName = new Map(players.map((player) => [normalize(player.name), player]));
const dstByTeam = new Map(
  players
    .filter((player) => player.position.position === 'DST')
    .map((player) => [player.team, player]),
);

// Position rank counters continue from the existing pool
const positionRanks = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
for (const player of players) {
  positionRanks[player.position.position]++;
}

// Clear previous jeff data (makes re-runs idempotent)
for (const player of players) {
  delete player.jeff;
}

const rows = parseTsv(fs.readFileSync(TSV_PATH, 'utf8'));
let nameMatched = 0;
let dstMatched = 0;
let added = 0;
let unresolved = 0;

for (const row of rows) {
  const lookup = NAME_ALIASES[normalize(row.name)] ?? normalize(row.name);
  const player = byName.get(lookup) ?? (isDstRow(row) ? dstByTeam.get(row.team) : undefined);

  if (player) {
    player.jeff = { rank: row.rank, adp: row.adp, high: row.high, sos: row.sos };
    if (isDstRow(row)) {
      dstMatched++;
    } else {
      nameMatched++;
    }
    continue;
  }

  const position = isDstRow(row) ? 'DST' : MISSING_POSITIONS[normalize(row.name)];
  if (!position) {
    console.warn(
      `[jeff] No position known for unmatched row #${row.rank} "${row.name}" (${row.team})`,
    );
    unresolved++;
    continue;
  }

  positionRanks[position]++;
  players.push({
    rank: players.length + 1,
    name: row.name,
    team: row.team,
    position: { position, rank: positionRanks[position] },
    price: calculatePrice(row.rank),
    bye: row.bye,
    vector: { x: 0, y: 0, magnitude: 0, angle: 0 },
    consensusStrength: 0,
    variance: 0,
    rankings: null,
    jeff: { rank: row.rank, adp: row.adp, high: row.high, sos: row.sos },
  });
  added++;
}

fs.writeFileSync(PLAYERS_PATH, `${JSON.stringify(players, null, 2)}\n`);

console.log(
  `[jeff] ${rows.length} TSV rows -> ${nameMatched} name matches, ${dstMatched} DST matches, ` +
    `${added} players added, ${unresolved} unresolved; src/players.json now has ${players.length} players`,
);
