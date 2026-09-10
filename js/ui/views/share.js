import { h, toast, confirmSheet, plural, relativeDate } from '../dom.js';
import * as store from '../../store.js';
import { uid } from '../../db.js';
import { decodeTournament } from '../../share.js';
import { standingsTable, standingsLegend, roundsList } from '../components.js';
import { computeStandings, roundsPlayed, getMode, currentRound } from '../../tournament.js';

const uiState = { tab: 'table', sortBy: 'points' };

const TABS = [
  { id: 'table', label: 'Table' },
  { id: 'rounds', label: 'Matches' },
];

export default async function shareView(ctx) {
  const t = await decodeTournament(ctx.params[0]);

  ctx.setTopbar(
    ctx.backButton('/'),
    ctx.titleBlock(t.name, [
      'Shared',
      getMode(t.config.mode).label,
      `${plural(roundsPlayed(t), 'round')}`,
      t.status === 'finished' ? 'finished' : 'in progress',
    ].join(' · '))
  );

  const standings = computeStandings(t);
  const leader = standings.find((s) => s.played > 0);
  const round = currentRound(t);
  const resting = new Set((round && round.resting) || []);

  const banner = h('div', { class: 'card', style: { borderColor: 'var(--line)' } },
    h('div', { class: 'row between' },
      h('span', { class: 'pill accent' }, 'Read only'),
      h('span', { class: 'tiny faint' }, t.createdAt ? relativeDate(t.createdAt) : '')),
    h('p', { class: 'small muted', style: { margin: '10px 0 0' } },
      leader
        ? `${leader.name} leads on ${leader.points} points after ${plural(roundsPlayed(t), 'round')}.`
        : 'No results have been entered yet.'),
    h('p', { class: 'tiny faint', style: { margin: '8px 0 0' } },
      'This is a snapshot carried inside the link. Nothing has been added to your own players or tournaments.'));

  const body = h('div', {});
  const tabs = h('div', { class: 'segmented', style: { margin: '14px 0' } },
    ...TABS.map((tab) => h('button', {
      class: tab.id === uiState.tab ? 'active' : '',
      onclick: () => { uiState.tab = tab.id; paint(); },
    }, tab.label)));

  function paint() {
    [...tabs.children].forEach((b, i) => b.classList.toggle('active', TABS[i].id === uiState.tab));
    body.replaceChildren(uiState.tab === 'table' ? tablePanel() : roundsList(t));
  }

  function tablePanel() {
    const toggle = h('div', { class: 'segmented', style: { marginBottom: '12px' } },
      h('button', {
        class: uiState.sortBy === 'points' ? 'active' : '',
        onclick: () => { uiState.sortBy = 'points'; paint(); },
      }, 'Total points'),
      h('button', {
        class: uiState.sortBy === 'average' ? 'active' : '',
        onclick: () => { uiState.sortBy = 'average'; paint(); },
      }, 'Per match'));

    if (!standings.some((s) => s.played)) {
      return h('div', {}, toggle,
        h('div', { class: 'empty' }, h('div', { class: 'big' }, '📊'), h('p', {}, 'No scores in this tournament yet.')));
    }
    return h('div', {}, toggle, standingsTable(t, { sortBy: uiState.sortBy, resting }), standingsLegend());
  }

  paint();

  const saveBtn = h('button', {
    class: 'btn outline block',
    onclick: async () => {
      const ok = await confirmSheet({
        title: 'Save a copy?',
        message: `This adds “${t.name}” to your own tournaments and puts ${plural(t.players.length, 'player')} into your roster. Your existing data is left untouched.`,
        confirmLabel: 'Save a copy',
      });
      if (!ok) return;
      saveBtn.disabled = true;
      try {
        const copy = await saveCopy(t);
        toast('Saved to this device');
        ctx.navigate(`/t/${copy.id}`);
      } catch (err) {
        toast(err.message);
        saveBtn.disabled = false;
      }
    },
  }, 'Save a copy to this device');

  ctx.view.append(banner, tabs, body,
    h('div', { class: 'stack', style: { marginTop: '20px' } },
      saveBtn,
      h('button', { class: 'btn subtle block', onclick: () => ctx.navigate('/') }, 'Open my own tournaments')));
}

/**
 * Copy a shared tournament into the local database under fresh ids, matching
 * players to the roster by name and adding the ones that are new.
 */
async function saveCopy(shared) {
  const names = uniqueNames(shared.players.map((p) => p.name));
  const roster = await store.ensurePlayers(names);
  const map = new Map(shared.players.map((p, i) => [p.id, roster[i].id]));
  const to = (id) => map.get(id) || id;
  const now = Date.now();

  const copy = {
    id: uid('t_'),
    name: shared.name,
    createdAt: shared.createdAt || now,
    updatedAt: now,
    finishedAt: shared.finishedAt || null,
    status: shared.status,
    importedAt: now,
    config: { ...shared.config },
    players: shared.players.map((p, i) => ({ id: roster[i].id, name: roster[i].name, active: p.active !== false })),
    rounds: shared.rounds.map((r) => ({
      index: r.index,
      algorithm: r.algorithm,
      resting: r.resting.map(to),
      matches: r.matches.map((m) => ({
        id: uid('m_'),
        court: m.court,
        teamA: m.teamA.map(to),
        teamB: m.teamB.map(to),
        scoreA: m.scoreA,
        scoreB: m.scoreB,
      })),
    })),
  };
  await store.saveTournament(copy);
  return copy;
}

/** Two people called "Ola" would collapse into one roster entry — keep them apart. */
function uniqueNames(names) {
  const seen = new Map();
  return names.map((name) => {
    const key = name.toLowerCase();
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    return n === 1 ? name : `${name} (${n})`;
  });
}
