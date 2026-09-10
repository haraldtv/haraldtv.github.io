import { h, relativeDate, plural } from '../dom.js';
import * as store from '../../store.js';
import { computeStandings, roundsPlayed, getMode } from '../../tournament.js';

export default async function historyView(ctx) {
  const tournaments = await store.allTournaments();
  ctx.setTopbar(ctx.titleBlock('History', plural(tournaments.length, 'tournament')));

  if (!tournaments.length) {
    ctx.view.appendChild(
      h('div', { class: 'empty' },
        h('div', { class: 'big' }, '🗂'),
        h('p', {}, 'Finished tournaments will collect here.'))
    );
    return;
  }

  const groups = new Map();
  for (const t of tournaments) {
    const key = new Date(t.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  for (const [label, list] of groups) {
    ctx.view.appendChild(h('h2', {}, label));
    for (const t of list) {
      const standings = computeStandings(t);
      const winner = standings.find((s) => s.played > 0);
      ctx.view.appendChild(
        h('button', { class: 'list-item', onclick: () => ctx.navigate(`/t/${t.id}`) },
          h('div', { class: 'grow' },
            h('div', { class: 'ttl' }, t.name,
              t.status === 'active' ? h('span', { class: 'pill accent', style: { marginLeft: '8px' } }, 'live') : null),
            h('div', { class: 'meta' },
              [relativeDate(t.createdAt),
               getMode(t.config.mode).label,
               plural(roundsPlayed(t), 'round'),
               winner ? `🏆 ${winner.name}` : null].filter(Boolean).join(' · '))),
          h('span', { class: 'chev' }, '›'))
      );
    }
  }
}
