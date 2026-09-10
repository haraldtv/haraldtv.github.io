import { h, toast, downloadJson, pickJsonFile, confirmSheet, plural } from '../dom.js';
import * as store from '../../store.js';
import * as db from '../../db.js';
import { ALGORITHMS } from '../../pairing/index.js';

export default async function settingsView(ctx) {
  const [players, tournaments] = await Promise.all([store.allPlayers(), store.allTournaments()]);
  ctx.setTopbar(ctx.backButton('/'), ctx.titleBlock('Settings'));

  ctx.view.append(
    h('div', { class: 'card' },
      h('div', { class: 'small muted' },
        `${plural(players.length, 'player')} · ${plural(tournaments.length, 'tournament')} stored on this device.`),
      h('p', { class: 'tiny faint', style: { margin: '8px 0 0' } },
        'Everything lives in this browser. Clearing site data or switching browser loses it — export a backup now and then.')),

    h('h2', {}, 'Backup'),
    h('button', {
      class: 'btn outline block',
      onclick: async () => {
        downloadJson(`padel-backup-${new Date().toISOString().slice(0, 10)}.json`, await store.exportAll());
        toast('Backup downloaded');
      },
    }, 'Export everything'),
    h('button', {
      class: 'btn outline block', style: { marginTop: '10px' },
      onclick: async () => {
        const data = await pickJsonFile();
        if (!data) return;
        if (data.__error) return toast(data.__error);
        try {
          const summary = await store.importData(data);
          toast(`Imported ${plural(summary.tournaments, 'tournament')}, ${plural(summary.players, 'player')}`);
          ctx.refresh();
        } catch (err) { toast(err.message); }
      },
    }, 'Import from file'),

    h('h2', {}, 'Matchmaking algorithms'),
    ...ALGORITHMS.map((a) => h('div', { class: 'card' },
      h('div', { style: { fontWeight: '650' } }, a.label),
      h('p', { class: 'small muted', style: { margin: '4px 0 0' } }, a.description))),
    h('p', { class: 'tiny faint', style: { marginTop: '10px' } },
      'Pick one per tournament when you set it up. New algorithms drop into js/pairing/ and appear here automatically.'),

    h('h2', {}, 'Danger zone'),
    h('button', {
      class: 'btn danger block',
      onclick: async () => {
        const ok = await confirmSheet({
          title: 'Erase everything?',
          message: 'All players and tournaments on this device are deleted. Export a backup first if you might want them back.',
          confirmLabel: 'Erase all data',
          danger: true,
        });
        if (!ok) return;
        await Promise.all([db.clear('tournaments'), db.clear('players'), db.clear('settings')]);
        toast('All data erased');
        ctx.navigate('/');
      },
    }, 'Erase all data'),

    h('p', { class: 'tiny faint center', style: { marginTop: '26px' } }, 'Padel Tournaments · offline-first · no accounts, no server')
  );
}
