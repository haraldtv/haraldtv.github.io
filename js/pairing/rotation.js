import { shuffle, asMatch, relationCounts } from './util.js';

const PARTNER_WEIGHT = 5;
const OPPONENT_WEIGHT = 1;
const ATTEMPTS = 600;

/**
 * Partner rotation (classic Americano) — spread partners and opponents as
 * widely as possible, so over an evening you play with and against as many
 * different people as the numbers allow.
 *
 * Exhaustive scheduling breaks down as soon as players join, leave or sit out,
 * so this uses a randomised search: many candidate draws are scored on how
 * many partnerships and match-ups they repeat, and the cheapest one wins.
 */
export default {
  id: 'rotation',
  label: 'Rotation',
  short: 'Play with everyone, avoid repeats',
  description: 'Classic Americano. Each round is chosen to repeat as few partnerships and match-ups as possible, so you rotate through the whole group.',
  modes: ['americano', 'mexicano'],

  pair({ players, courts, history = [], rng = Math.random }) {
    const rel = relationCounts(history);

    const splitCost = (four) => {
      // Three ways to split four players into two pairs; return the cheapest.
      const layouts = [
        [0, 1, 2, 3],
        [0, 2, 1, 3],
        [0, 3, 1, 2],
      ];
      let best = null;
      for (const [a, b, c, d] of layouts) {
        const cost =
          PARTNER_WEIGHT * (rel.partnerCount(four[a].id, four[b].id) + rel.partnerCount(four[c].id, four[d].id)) +
          OPPONENT_WEIGHT * (
            rel.opponentCount(four[a].id, four[c].id) +
            rel.opponentCount(four[a].id, four[d].id) +
            rel.opponentCount(four[b].id, four[c].id) +
            rel.opponentCount(four[b].id, four[d].id)
          );
        if (best === null || cost < best.cost) {
          best = { cost, four: [four[a], four[b], four[c], four[d]] };
        }
      }
      return best;
    };

    let best = null;
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const pool = shuffle(players, rng);
      let total = 0;
      const groups = [];
      for (let c = 0; c < courts; c++) {
        const picked = splitCost(pool.slice(c * 4, c * 4 + 4));
        total += picked.cost;
        groups.push(picked.four);
      }
      if (best === null || total < best.total) best = { total, groups };
      if (total === 0) break; // cannot do better than no repeats at all
    }

    return best.groups.map(asMatch);
  },
};
