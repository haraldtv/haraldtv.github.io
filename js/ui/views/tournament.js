import { h, mount, sheet, toast, confirmSheet, downloadJson, plural, initials } from '../dom.js';
import * as store from '../../store.js';
import {
  computeStandings, currentRound, roundIsComplete, matchIsScored, roundsPlayed,
  startNextRound, redrawRound, swapPlayers, recordScore, clearScore, validateScore,
  finishTournament, reopenTournament, targetReached, getMode, playerName,
  playingRoster, restCount, setPlayerActive, addPlayerToTournament, slotsPerRound,
} from '../../tournament.js';
import { getAlgorithm } from '../../pairing/index.js';
import { standingsTable, standingsLegend, roundsList, teamLabel } from '../components.js';
import { shareUrl } from '../../share.js';

const TABS = [
  { id: 'round', label: 'Round' },
  { id: 'table', label: 'Table' },
  { id: 'rounds', label: 'Matches' },
];

const uiState = { tab: 'round', sortBy: 'points', swapFrom: null, swapMode: false };

export default async function tournamentView(ctx) {
  const t = await store.getTournament(ctx.params[0]);
  if (!t) throw new Error('That tournament no longer exists');

  const save = () => store.saveTournament(t);
  const rerender = () => ctx.refresh();

  const paintTopbar = () => {
    const round = currentRound(t);
    ctx.setTopbar(
      ctx.backButton('/'),
      ctx.titleBlock(t.name, [
        getMode(t.config.mode).label,
        t.status === 'active' ? (round ? `Round ${round.index + 1}` : 'Not started') : 'Finished',
        t.config.roundTarget ? `of ${t.config.roundTarget}` : null,
      ].filter(Boolean).join(' · ')),
      h('button', { class: 'icon-btn ghost', 'aria-label': 'Menu', onclick: () => openMenu(ctx, t, save) }, '⋯')
    );
  };

  const body = h('div', {});
  const tabs = h('div', { class: 'segmented', style: { marginBottom: '14px' } },
    ...TABS.map((tab) => h('button', {
      class: tab.id === uiState.tab ? 'active' : '',
      onclick: () => { uiState.tab = tab.id; uiState.swapFrom = null; paint(); },
    }, tab.label)));

  function paint() {
    paintTopbar();
    [...tabs.children].forEach((b, i) => b.classList.toggle('active', TABS[i].id === uiState.tab));
    body.replaceChildren(
      uiState.tab === 'round' ? roundPanel(ctx, t, save, paint, rerender)
        : uiState.tab === 'table' ? tablePanel(t, paint)
        : roundsPanel(t, save, paint)
    );
  }

  paint();
  ctx.view.append(tabs, body);
}

/* ------------------------------------------------------------------ */
/* the live round                                                      */
/* ------------------------------------------------------------------ */

function roundPanel(ctx, t, save, paint, rerender) {
  const round = currentRound(t);
  const wrap = h('div', {});

  if (!round) {
    mount(wrap,
      h('div', { class: 'empty' },
        h('div', { class: 'big' }, '🎾'),
        h('p', {}, t.status === 'active' ? 'Ready when you are.' : 'This tournament has no rounds.')),
      t.status === 'active'
        ? h('button', {
            class: 'btn primary block',
            onclick: async () => { startNextRound(t); await save(); paint(); },
          }, 'Draw round 1')
        : null
    );
    return wrap;
  }

  const complete = roundIsComplete(round);
  const anyScores = round.matches.some(matchIsScored);
  const canEditLineup = t.status === 'active' && !anyScores;
  if (!canEditLineup) { uiState.swapMode = false; uiState.swapFrom = null; }

  const tapSwap = (id) => {
    if (!canEditLineup) return;
    if (!uiState.swapFrom) { uiState.swapFrom = id; paint(); return; }
    if (uiState.swapFrom === id) { uiState.swapFrom = null; paint(); return; }
    swapPlayers(t, uiState.swapFrom, id);
    uiState.swapFrom = null;
    save().then(paint);
  };

  if (round.resting && round.resting.length) {
    wrap.appendChild(
      h('div', { class: 'rest-strip' },
        h('span', { class: 'lbl' }, 'Sitting out'),
        ...round.resting.map((id) => h('button', {
          class: `swap-chip ${uiState.swapFrom === id ? 'sel' : ''}`,
          onclick: () => uiState.swapMode
            ? tapSwap(id)
            : toast(anyScores ? 'Clear the scores to change the line-up' : 'Tap “Swap players” to move someone on court'),
        }, playerName(t, id))))
    );
  }

  for (const match of round.matches) {
    wrap.appendChild(matchCard(t, match, save, paint, tapSwap, anyScores));
  }

  const actions = h('div', { class: 'stack', style: { marginTop: '6px' } });

  if (t.status !== 'active') {
    actions.appendChild(h('p', { class: 'small faint center' }, 'This tournament is finished.'));
  } else if (complete) {
    if (targetReached(t)) {
      mount(actions,
        h('p', { class: 'small center muted' }, `All ${t.config.roundTarget} rounds played.`),
        h('button', {
          class: 'btn primary block',
          onclick: async () => { finishTournament(t); await save(); toast('Tournament finished'); rerender(); },
        }, 'Finish tournament'),
        h('button', {
          class: 'btn outline block',
          onclick: async () => { startNextRound(t); await save(); paint(); },
        }, 'Play another round anyway')
      );
    } else {
      actions.appendChild(h('button', {
        class: 'btn primary block',
        onclick: async () => {
          try { startNextRound(t); await save(); paint(); }
          catch (err) { toast(err.message); }
        },
      }, `Draw round ${t.rounds.length + 1}`));
    }
  } else {
    mount(actions,
      h('div', { class: 'btn-row' },
        h('button', {
          class: 'btn outline sm',
          disabled: anyScores,
          onclick: async () => {
            try { redrawRound(t); uiState.swapFrom = null; await save(); paint(); toast('Redrawn'); }
            catch (err) { toast(err.message); }
          },
        }, '↻  Redraw'),
        h('button', {
          class: `btn ${uiState.swapMode ? 'primary' : 'outline'} sm`,
          disabled: anyScores,
          onclick: () => { uiState.swapMode = !uiState.swapMode; uiState.swapFrom = null; paint(); },
        }, uiState.swapMode ? 'Done' : '↔  Swap players')),
      uiState.swapMode
        ? h('p', { class: 'small faint center' }, 'Tap two names to swap them — including anyone sitting out.')
        : null
    );
  }

  wrap.appendChild(actions);
  if (uiState.swapMode && canEditLineup) wrap.classList.add('swap-mode');
  return wrap;
}

function matchCard(t, match, save, paint, tapSwap, anyScores) {
  const scored = matchIsScored(match);
  const swapping = uiState.swapMode && !anyScores && t.status === 'active';

  const nameEls = (ids) => ids.flatMap((id, i) => {
    const label = playerName(t, id);
    const sep = i ? h('span', { class: 'faint' }, '  &  ') : null;
    const node = swapping
      ? h('span', {
          class: `name-chip ${uiState.swapFrom === id ? 'sel' : ''}`,
          onclick: (e) => { e.stopPropagation(); tapSwap(id); },
        }, label)
      : h('span', {}, label);
    return [sep, node];
  });

  const side = (ids, mine, theirs) => h('div', {
    class: `team ${scored && mine > theirs ? 'win' : ''}`,
  },
    h('span', { class: 'avatar' }, initials(playerName(t, ids[0]))),
    h('div', { class: 'names' }, h('div', { class: 'n' }, ...nameEls(ids))),
    h('div', { class: 'score' }, scored ? mine : '–')
  );

  return h('div', { class: 'match' },
    h('div', { class: 'match-head' },
      h('span', {}, t.config.courts > 1 ? `Court ${match.court}` : 'Match'),
      h('span', { class: scored ? 'done' : '' },
        scored ? '✓ scored' : `${t.config.pointsPerMatch} points`)),
    side(match.teamA, match.scoreA, match.scoreB),
    side(match.teamB, match.scoreB, match.scoreA),
    t.status === 'active' && !swapping
      ? h('div', { class: 'match-actions' },
          h('button', {
            class: `btn ${scored ? 'outline' : 'primary'} block sm`,
            onclick: () => openScoreSheet(t, match, save, paint),
          }, scored ? 'Edit score' : 'Enter score'))
      : null
  );
}

/* ------------------------------------------------------------------ */
/* score entry                                                         */
/* ------------------------------------------------------------------ */

const STEP_BTN = {
  width: '54px', height: '54px', flex: '0 0 auto', borderRadius: '14px',
  border: '1px solid var(--line)', background: 'var(--bg-elev)', color: 'var(--text)',
  fontSize: '26px', fontFamily: 'inherit', cursor: 'pointer',
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function openScoreSheet(t, match, save, paint) {
  const total = t.config.pointsPerMatch;
  const enforce = t.config.enforceTotal;
  let a = matchIsScored(match) ? match.scoreA : (enforce ? Math.ceil(total / 2) : 0);
  let b = matchIsScored(match) ? match.scoreB : (enforce ? total - Math.ceil(total / 2) : 0);

  sheet(t.config.courts > 1 ? `Court ${match.court}` : 'Enter score', ({ close }) => {
    const aInput = h('input', { class: 'num', type: 'number', inputmode: 'numeric', min: '0' });
    const bInput = h('input', { class: 'num', type: 'number', inputmode: 'numeric', min: '0' });
    const slider = h('input', { type: 'range', min: '0', max: String(total), style: { width: '100%' } });
    const hint = h('div', { class: 'score-hint' });
    const saveBtn = h('button', { class: 'btn primary block' }, 'Save score');

    const sync = (source) => {
      if (enforce) {
        if (source === 'b') a = clamp(total - b, 0, total);
        a = clamp(a, 0, total);
        b = total - a;
        slider.value = String(a);
      }
      if (document.activeElement !== aInput) aInput.value = String(a);
      if (document.activeElement !== bInput) bInput.value = String(b);
      if (enforce) { aInput.value = String(a); bInput.value = String(b); }
      const err = validateScore(t, a, b);
      hint.textContent = err || (a === b
        ? 'Draw'
        : `${a > b ? teamLabel(t, match.teamA) : teamLabel(t, match.teamB)} win`);
      hint.style.color = err ? 'var(--danger)' : 'var(--text-faint)';
      saveBtn.disabled = !!err;
    };

    const bump = (which, delta) => {
      if (which === 'a') { a = Math.max(0, a + delta); sync('a'); }
      else { b = Math.max(0, b + delta); sync('b'); }
    };

    aInput.addEventListener('input', () => { a = parseInt(aInput.value, 10) || 0; sync('a'); });
    bInput.addEventListener('input', () => { b = parseInt(bInput.value, 10) || 0; sync('b'); });
    aInput.addEventListener('focus', () => aInput.select());
    bInput.addEventListener('focus', () => bInput.select());
    slider.addEventListener('input', () => { a = parseInt(slider.value, 10) || 0; sync('a'); });

    saveBtn.addEventListener('click', async () => {
      try {
        recordScore(t, match.id, a, b);
        await save();
        close();
        paint();
      } catch (err) { toast(err.message); }
    });

    const sideBlock = (which, ids, input) => h('div', { class: 'score-side' },
      h('div', { class: 'who' }, teamLabel(t, ids)),
      h('div', { class: 'score-big' },
        h('button', { style: STEP_BTN, onclick: () => bump(which, -1) }, '−'),
        input,
        h('button', { style: STEP_BTN, onclick: () => bump(which, +1) }, '+')));

    const el = h('div', { class: 'score-entry' },
      sideBlock('a', match.teamA, aInput),
      enforce ? h('div', { style: { padding: '2px 4px 8px' } }, slider) : h('div', { style: { height: '6px' } }),
      sideBlock('b', match.teamB, bInput),
      hint,
      h('div', { class: 'stack', style: { marginTop: '18px' } },
        saveBtn,
        matchIsScored(match)
          ? h('button', {
              class: 'btn danger block',
              onclick: async () => { clearScore(t, match.id); await save(); close(); paint(); toast('Score cleared'); },
            }, 'Clear score')
          : null));

    sync('a');
    return el;
  });
}

/* ------------------------------------------------------------------ */
/* leaderboard                                                         */
/* ------------------------------------------------------------------ */

function tablePanel(t, paint) {
  const round = currentRound(t);
  const resting = new Set((round && round.resting) || []);
  const rows = computeStandings(t);

  const toggle = h('div', { class: 'segmented', style: { marginBottom: '12px' } },
    h('button', {
      class: uiState.sortBy === 'points' ? 'active' : '',
      onclick: () => { uiState.sortBy = 'points'; paint(); },
    }, 'Total points'),
    h('button', {
      class: uiState.sortBy === 'average' ? 'active' : '',
      onclick: () => { uiState.sortBy = 'average'; paint(); },
    }, 'Per match'));

  if (!rows.some((r) => r.played)) {
    return h('div', {}, toggle,
      h('div', { class: 'empty' },
        h('div', { class: 'big' }, '📊'),
        h('p', {}, 'Scores show up here as soon as you enter them.')));
  }

  return h('div', {}, toggle,
    standingsTable(t, { sortBy: uiState.sortBy, resting }),
    standingsLegend());
}

/* ------------------------------------------------------------------ */
/* every round                                                         */
/* ------------------------------------------------------------------ */

function roundsPanel(t, save, paint) {
  return roundsList(t, (match) => (t.status === 'active'
    ? h('button', {
        class: 'btn outline block sm',
        onclick: () => openScoreSheet(t, match, save, paint),
      }, matchIsScored(match) ? 'Edit score' : 'Enter score')
    : null));
}

/* ------------------------------------------------------------------ */
/* menu + roster                                                       */
/* ------------------------------------------------------------------ */

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tournament';

function openMenu(ctx, t, save) {
  sheet(t.name, ({ close }) => h('div', { class: 'stack' },
    h('p', { class: 'small faint', style: { margin: '0 0 4px' } },
      [`${plural(roundsPlayed(t), 'round')} played`,
       `${plural(playingRoster(t).length, 'player')} in play`,
       `${getAlgorithm(t.config.algorithm).label} draw`,
       `${t.config.pointsPerMatch} pts per match`].join(' · ')),

    h('button', {
      class: 'btn outline block',
      onclick: () => { close(); openRosterSheet(ctx, t, save); },
    }, 'Who is playing'),

    h('button', {
      class: 'btn outline block',
      onclick: () => { close(); openShareSheet(t); },
    }, 'Share a link'),

    h('button', {
      class: 'btn outline block',
      onclick: async () => {
        const players = await store.allPlayers();
        downloadJson(
          `${slug(t.name)}-${new Date(t.createdAt).toISOString().slice(0, 10)}.json`,
          store.tournamentToJson(t, players)
        );
        close();
        toast('Exported');
      },
    }, 'Export as JSON'),

    t.status === 'active'
      ? h('button', {
          class: 'btn outline block',
          onclick: async () => {
            close();
            const ok = await confirmSheet({
              title: 'Finish tournament?',
              message: 'The table gets locked in. You can reopen it later if you need to.',
              confirmLabel: 'Finish',
            });
            if (!ok) return;
            finishTournament(t);
            await save();
            toast('Tournament finished');
            ctx.refresh();
          },
        }, 'Finish tournament')
      : h('button', {
          class: 'btn outline block',
          onclick: async () => { reopenTournament(t); await save(); close(); toast('Reopened'); ctx.refresh(); },
        }, 'Reopen tournament'),

    h('button', {
      class: 'btn danger block',
      onclick: async () => {
        close();
        const ok = await confirmSheet({
          title: `Delete “${t.name}”?`,
          message: 'The tournament and its results are removed for good.',
          confirmLabel: 'Delete',
          danger: true,
        });
        if (!ok) return;
        await store.deleteTournament(t.id);
        toast('Deleted');
        ctx.navigate('/');
      },
    }, 'Delete tournament')
  ));
}

function openRosterSheet(ctx, t, save) {
  sheet('Who is playing', ({ close }) => {
    const list = h('div', { class: 'picker-list' });
    const note = h('p', { class: 'small faint', style: { margin: 0 } });
    const input = h('input', { type: 'text', placeholder: 'Someone just turned up…', autocapitalize: 'words' });

    const paintList = () => {
      note.textContent = `Tap to take someone out or bring them back. ${slotsPerRound(t)} play each round, ${restCount(t)} sit out.`;
      list.replaceChildren(...t.players.map((p) => h('div', {
        class: `picker-row ${p.active !== false ? 'on' : ''}`,
        onclick: async () => {
          setPlayerActive(t, p.id, p.active === false);
          await save();
          paintList();
        },
      },
        h('span', { class: 'avatar' }, initials(p.name)),
        h('span', { class: 'name' }, p.name),
        h('span', { class: 'box' }, '✓'))));
    };
    paintList();

    return h('div', { class: 'stack' },
      note,
      list,
      h('form', {
        class: 'row',
        onsubmit: async (e) => {
          e.preventDefault();
          const name = input.value.trim();
          if (!name) return;
          const { player } = await store.addPlayer(name);
          addPlayerToTournament(t, player);
          await save();
          input.value = '';
          paintList();
          toast(`${player.name} joined`);
        },
      }, h('div', { class: 'grow' }, input), h('button', { class: 'btn primary', type: 'submit' }, 'Add')),
      h('button', { class: 'btn subtle block', onclick: () => { close(); ctx.refresh(); } }, 'Done'));
  });
}

/* ------------------------------------------------------------------ */
/* share link                                                          */
/* ------------------------------------------------------------------ */

function openShareSheet(t) {
  sheet('Share a link', ({ close }) => {
    const field = h('textarea', { readonly: true, rows: '3', style: { fontSize: '12px', fontFamily: 'var(--mono)', wordBreak: 'break-all' } }, 'Building link…');
    const meta = h('p', { class: 'tiny faint', style: { margin: '8px 2px 0' } });
    const copyBtn = h('button', { class: 'btn primary block', disabled: true }, 'Copy link');
    const shareBtn = navigator.share
      ? h('button', { class: 'btn outline block', disabled: true }, 'Share…')
      : null;

    let url = '';
    shareUrl(t).then((made) => {
      url = made;
      field.value = url;
      meta.textContent = `${url.length} characters. The whole tournament is inside the link — nothing is uploaded anywhere.`;
      copyBtn.disabled = false;
      if (shareBtn) shareBtn.disabled = false;
      if (url.length > 8000) {
        meta.textContent += ' It is on the long side, so some chat apps may cut it — sending it as a plain link is safest.';
        meta.style.color = 'var(--warn)';
      }
    }).catch((err) => {
      field.value = '';
      meta.textContent = err.message;
      meta.style.color = 'var(--danger)';
    });

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast('Link copied');
        close();
      } catch {
        field.focus();
        field.select();
        toast('Press and hold to copy the link');
      }
    });

    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        try { await navigator.share({ title: t.name, url }); close(); }
        catch { /* the person backed out of the share sheet */ }
      });
    }

    return h('div', { class: 'stack' },
      h('p', { class: 'small muted', style: { margin: 0 } },
        'Anyone with this link sees the tournament exactly as it stands right now, read-only. It does not update itself — share again later for the final table.'),
      field,
      meta,
      copyBtn,
      shareBtn);
  });
}
