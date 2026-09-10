import { h, relativeDate, plural } from '../dom.js';
import * as store from '../../store.js';
import { computeStandings, roundsPlayed, getMode, currentRound, roundIsComplete } from '../../tournament.js';

export default async function homeView(ctx) {
  const [tournaments, players] = await Promise.all([store.allTournaments(), store.activePlayers()]);
  const active = tournaments.filter((t) => t.status === 'active');
  const finished = tournaments.filter((t) => t.status !== 'active');

  ctx.setTopbar(
    ctx.titleBlock('Padel'),
    h('button', { class: 'icon-btn ghost', 'aria-label': 'Settings', onclick: () => ctx.navigate('/settings') }, '⚙️')
  );

  const nodes = [];

  if (active.length) {
    nodes.push(h('h2', {}, active.length > 1 ? 'In progress' : 'Continue'));
    for (const t of active) nodes.push(activeCard(ctx, t));
  }

  nodes.push(
    h('button', {
      class: `btn block ${active.length ? 'outline' : 'primary'}`,
      style: { marginTop: active.length ? '14px' : '4px' },
      onclick: () => ctx.navigate('/new'),
    }, '＋  New tournament')
  );

  if (!active.length && !finished.length) {
    nodes.push(
      h('div', { class: 'empty', style: { paddingTop: '34px' } },
        h('div', { class: 'big' }, '🎾'),
        h('p', {}, players.length
          ? 'No tournaments yet. Set one up and start playing.'
          : 'Start by setting up a tournament — you can add players as you go.'))
    );
  }

  if (finished.length) {
    nodes.push(h('h2', {}, 'Recent'));
    for (const t of finished.slice(0, 4)) nodes.push(recentRow(ctx, t));
    if (finished.length > 4) {
      nodes.push(h('button', { class: 'btn subtle block sm', onclick: () => ctx.navigate('/history') },
        `See all ${finished.length}`));
    }
  }

  ctx.view.append(...nodes);
}

function activeCard(ctx, t) {
  const standings = computeStandings(t);
  const leader = standings.find((s) => s.played > 0);
  const played = roundsPlayed(t);
  const round = currentRound(t);
  const live = round && !roundIsComplete(round);

  return h('div', { class: 'card', style: { marginBottom: '10px' } },
    h('div', { class: 'row between' },
      h('div', { class: 'grow' },
        h('div', { style: { fontSize: '19px', fontWeight: '680' } }, t.name),
        h('div', { class: 'small muted' }, `${getMode(t.config.mode).label} · ${plural(t.players.length, 'player')}`)),
      h('span', { class: `pill ${live ? 'accent' : ''}` }, live ? `Round ${round.index + 1} live` : `${played} played`)
    ),
    leader
      ? h('div', { class: 'small muted', style: { marginTop: '10px' } },
          '🏆 ', h('strong', { style: { color: 'var(--text)' } }, leader.name), ` leads on ${leader.points} pts`)
      : h('div', { class: 'small faint', style: { marginTop: '10px' } }, 'No results yet'),
    h('button', {
      class: 'btn primary block',
      style: { marginTop: '14px' },
      onclick: () => ctx.navigate(`/t/${t.id}`),
    }, live ? 'Continue round' : 'Open tournament')
  );
}

function recentRow(ctx, t) {
  const standings = computeStandings(t);
  const winner = standings.find((s) => s.played > 0);
  return h('button', { class: 'list-item', onclick: () => ctx.navigate(`/t/${t.id}`) },
    h('div', { class: 'grow' },
      h('div', { class: 'ttl' }, t.name),
      h('div', { class: 'meta' },
        [relativeDate(t.finishedAt || t.createdAt),
         winner ? `Won by ${winner.name}` : 'No results',
         plural(roundsPlayed(t), 'round')].join(' · '))),
    h('span', { class: 'chev' }, '›')
  );
}
