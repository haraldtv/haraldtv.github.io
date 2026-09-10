import { shuffle, asMatch } from './util.js';

/**
 * Ranked (classic Mexicano) — players are sorted by the leaderboard and the
 * top four meet on court 1, the next four on court 2, and so on. Inside each
 * group of four the pairing is 1 + 4 against 2 + 3, so the round is close.
 *
 * With no results yet (round 1) there is nothing to rank on, so it falls back
 * to a random draw.
 */
export default {
  id: 'ranked',
  label: 'Ranked',
  short: 'Leaderboard-based, 1+4 vs 2+3',
  description: 'Classic Mexicano. Players are ranked by points, the top four play court 1, and each group of four is split 1 + 4 against 2 + 3 for a tight match. Round 1 is drawn at random.',
  modes: ['mexicano', 'americano'],

  pair({ players, courts, ranking = [], rng = Math.random }) {
    const order = new Map(ranking.map((id, i) => [id, i]));
    const ranked = order.size
      ? players.slice().sort((a, b) => {
          const ra = order.has(a.id) ? order.get(a.id) : Number.MAX_SAFE_INTEGER;
          const rb = order.has(b.id) ? order.get(b.id) : Number.MAX_SAFE_INTEGER;
          return ra - rb;
        })
      : shuffle(players, rng);

    const matches = [];
    for (let c = 0; c < courts; c++) {
      const [p1, p2, p3, p4] = ranked.slice(c * 4, c * 4 + 4);
      // 1 + 4  vs  2 + 3
      matches.push(asMatch([p1, p4, p2, p3]));
    }
    return matches;
  },
};
