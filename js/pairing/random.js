import { shuffle, asMatch } from './util.js';

/**
 * Random draw — every round is an independent shuffle.
 * The default: it is what casual social play actually wants.
 */
export default {
  id: 'random',
  label: 'Random',
  short: 'Fresh shuffle every round',
  description: 'Teams and opponents are drawn at random each round. Nothing carries over — the most casual, most social option.',
  modes: ['mexicano', 'americano'],

  pair({ players, courts, rng = Math.random }) {
    const pool = shuffle(players, rng);
    const matches = [];
    for (let c = 0; c < courts; c++) {
      matches.push(asMatch(pool.slice(c * 4, c * 4 + 4)));
    }
    return matches;
  },
};
