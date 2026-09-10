/** Render pieces shared between the live tournament screen and shared links. */
import { h } from './dom.js';
import { computeStandings, matchIsScored, playerName } from '../tournament.js';
import { getAlgorithm } from '../pairing/index.js';

export const teamLabel = (t, ids) => ids.map((id) => playerName(t, id)).join(' & ');

/**
 * The leaderboard.
 * @param {Object} t tournament
 * @param {Object} [opts] { sortBy: 'points'|'average', resting: Set<string> }
 */
export function standingsTable(t, opts = {}) {
  const sortBy = opts.sortBy || 'points';
  const resting = opts.resting || new Set();
  const rows = computeStandings(t, { sortBy });

  return h('div', { class: 'lb' },
    h('div', { class: 'lb-head' },
      h('span', {}, '#'),
      h('span', {}, 'Player'),
      h('span', { style: { textAlign: 'right' } }, 'M'),
      h('span', { style: { textAlign: 'right' } }, '+/−'),
      h('span', { style: { textAlign: 'right' } }, sortBy === 'average' ? 'Avg' : 'Pts')),
    ...rows.map((r) => h('div', { class: `lb-row p${r.position} ${r.active ? '' : 'resting'}` },
      h('span', { class: 'pos' }, r.position),
      h('span', { class: 'nm' }, r.name,
        !r.active
          ? h('span', { class: 'tag' }, ' · out')
          : resting.has(r.id) ? h('span', { class: 'tag' }, ' · resting') : null),
      h('span', { class: 'num' }, r.played),
      h('span', { class: 'num' }, (r.diff > 0 ? '+' : '') + r.diff),
      h('span', { class: 'pts' }, sortBy === 'average' ? r.average.toFixed(1) : r.points))));
}

export const standingsLegend = () =>
  h('p', { class: 'tiny faint', style: { marginTop: '10px' } },
    'M = matches played · +/− = points won minus points conceded. Equal points are split on +/−, then wins.');

/**
 * A played (or pending) match, without any editing affordance of its own.
 * @param {Object} [opts] { heading, action } — action is a node appended below.
 */
export function matchSummary(t, match, opts = {}) {
  const scored = matchIsScored(match);
  return h('div', { class: 'match' },
    h('div', { class: 'match-head' },
      h('span', {}, opts.heading || (t.config.courts > 1 ? `Court ${match.court}` : 'Match')),
      h('span', { class: scored ? 'done' : '' }, scored ? '✓' : 'not played')),
    h('div', { class: `team ${scored && match.scoreA > match.scoreB ? 'win' : ''}` },
      h('div', { class: 'names' }, h('div', { class: 'n' }, teamLabel(t, match.teamA))),
      h('div', { class: 'score' }, scored ? match.scoreA : '–')),
    h('div', { class: `team ${scored && match.scoreB > match.scoreA ? 'win' : ''}` },
      h('div', { class: 'names' }, h('div', { class: 'n' }, teamLabel(t, match.teamB))),
      h('div', { class: 'score' }, scored ? match.scoreB : '–')),
    opts.action ? h('div', { class: 'match-actions' }, opts.action) : null);
}

/**
 * Every round, newest first.
 * @param {Function} [action] match => node|null, rendered under each match.
 */
export function roundsList(t, action) {
  if (!t.rounds.length) {
    return h('div', { class: 'empty' }, h('div', { class: 'big' }, '📋'), h('p', {}, 'No rounds yet.'));
  }
  const wrap = h('div', {});
  for (const round of [...t.rounds].reverse()) {
    wrap.appendChild(h('h2', {},
      `Round ${round.index + 1}`,
      h('span', { class: 'pill', style: { marginLeft: '8px' } }, getAlgorithm(round.algorithm).label)));
    for (const match of round.matches) {
      wrap.appendChild(matchSummary(t, match, { action: action ? action(match) : null }));
    }
    if (round.resting && round.resting.length) {
      wrap.appendChild(h('p', { class: 'small faint', style: { margin: '-4px 2px 10px' } },
        'Sat out: ' + round.resting.map((id) => playerName(t, id)).join(', ')));
    }
  }
  return wrap;
}
