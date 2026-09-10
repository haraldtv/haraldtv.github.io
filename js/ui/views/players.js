import { h, initials, toast, sheet, confirmSheet, plural } from '../dom.js';
import * as store from '../../store.js';

export default async function playersView(ctx) {
  const [players, tournaments] = await Promise.all([store.allPlayers(), store.allTournaments()]);
  const appearances = new Map();
  for (const t of tournaments) {
    for (const p of t.players || []) appearances.set(p.id, (appearances.get(p.id) || 0) + 1);
  }

  const active = players.filter((p) => !p.archived);
  const archived = players.filter((p) => p.archived);

  ctx.setTopbar(ctx.titleBlock('Players', plural(active.length, 'player') + ' in the roster'));

  const input = h('input', {
    type: 'text',
    placeholder: 'Add a player…',
    autocomplete: 'off',
    autocapitalize: 'words',
    enterkeyhint: 'done',
  });

  const add = async () => {
    const name = input.value.trim();
    if (!name) return;
    const { player, created } = await store.addPlayer(name);
    input.value = '';
    toast(created ? `${player.name} added` : `${player.name} is already on the list`);
    ctx.refresh();
  };

  const form = h('form', {
    class: 'row',
    style: { marginBottom: '16px' },
    onsubmit: (e) => { e.preventDefault(); add(); },
  }, h('div', { class: 'grow' }, input), h('button', { class: 'btn primary', type: 'submit' }, 'Add'));

  ctx.view.appendChild(form);

  if (!active.length && !archived.length) {
    ctx.view.appendChild(
      h('div', { class: 'empty' },
        h('div', { class: 'big' }, '👥'),
        h('p', {}, 'Everyone you add here can be picked with one tap next time you set up a tournament.'))
    );
    return;
  }

  const row = (p) => h('button', {
    class: 'list-item',
    onclick: () => openPlayerSheet(ctx, p),
  },
    h('span', { class: 'avatar' }, initials(p.name)),
    h('div', { class: 'grow' },
      h('div', { class: 'ttl' }, p.name),
      h('div', { class: 'meta' },
        p.archived ? 'Hidden from new tournaments'
          : appearances.get(p.id) ? plural(appearances.get(p.id), 'tournament') : 'Not played yet')),
    h('span', { class: 'chev' }, '›')
  );

  if (active.length) ctx.view.append(...active.map(row));
  if (archived.length) {
    ctx.view.appendChild(h('h2', {}, 'Hidden'));
    ctx.view.append(...archived.map(row));
  }
}

function openPlayerSheet(ctx, player) {
  sheet(player.name, ({ close }) => {
    const input = h('input', { type: 'text', value: player.name, autocapitalize: 'words' });
    return h('div', { class: 'stack' },
      h('label', { class: 'field' }, h('span', { class: 'lbl' }, 'Name'), input),
      h('button', {
        class: 'btn primary block',
        onclick: async () => {
          try {
            await store.renamePlayer(player.id, input.value);
            close();
            toast('Saved');
            ctx.refresh();
          } catch (err) { toast(err.message); }
        },
      }, 'Save'),
      h('button', {
        class: 'btn outline block',
        onclick: async () => {
          await store.setPlayerArchived(player.id, !player.archived);
          close();
          toast(player.archived ? 'Back in the roster' : 'Hidden from new tournaments');
          ctx.refresh();
        },
      }, player.archived ? 'Show in roster' : 'Hide from roster'),
      h('button', {
        class: 'btn danger block',
        onclick: async () => {
          close();
          const ok = await confirmSheet({
            title: `Delete ${player.name}?`,
            message: 'Past tournaments keep their results — this only removes the player from the roster.',
            confirmLabel: 'Delete player',
            danger: true,
          });
          if (!ok) return;
          await store.deletePlayer(player.id);
          toast('Deleted');
          ctx.refresh();
        },
      }, 'Delete')
    );
  });
}
