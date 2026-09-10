/** Shared helpers for pairing algorithms. */

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Count how often each pair of players has been partners / opponents so far.
 * @param {Array} rounds tournament rounds (played or planned)
 */
export function relationCounts(rounds = []) {
  const partners = new Map();
  const opponents = new Map();
  const bump = (map, a, b) => {
    const k = pairKey(a, b);
    map.set(k, (map.get(k) || 0) + 1);
  };
  for (const round of rounds) {
    for (const m of round.matches || []) {
      bump(partners, m.teamA[0], m.teamA[1]);
      bump(partners, m.teamB[0], m.teamB[1]);
      for (const a of m.teamA) for (const b of m.teamB) bump(opponents, a, b);
    }
  }
  return {
    partners,
    opponents,
    partnerCount: (a, b) => partners.get(pairKey(a, b)) || 0,
    opponentCount: (a, b) => opponents.get(pairKey(a, b)) || 0,
  };
}

/** Split four players into the match layout [0,1] vs [2,3]. */
export const asMatch = (four) => ({
  teamA: [four[0].id, four[1].id],
  teamB: [four[2].id, four[3].id],
});
