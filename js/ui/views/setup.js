import { h, replace, initials, toast } from '../dom.js';
import * as store from '../../store.js';
import {
  MODES, POINT_PRESETS, DEFAULT_CONFIG, getMode, defaultName,
  createTournament, startNextRound,
} from '../../tournament.js';
import { algorithmsForMode, getAlgorithm } from '../../pairing/index.js';

const SETTINGS_KEY = 'lastConfig';

export default async function setupView(ctx) {
  const [roster, saved] = await Promise.all([
    store.activePlayers(),
    store.getSetting(SETTINGS_KEY, null),
  ]);

  const config = { ...DEFAULT_CONFIG, ...(saved || {}) };
  // A remembered algorithm that no longer suits the mode falls back to the
  // mode's own default.
  if (!algorithmsForMode(config.mode).some((a) => a.id === config.algorithm)) {
    config.algorithm = getMode(config.mode).defaultAlgorithm;
  }
  const selected = new Set();
  let filter = '';

  ctx.setTopbar(ctx.backButton('/'), ctx.titleBlock('New tournament'));

  const nameInput = h('input', {
    type: 'text',
    value: defaultName(),
    placeholder: 'Tournament name',
    autocapitalize: 'sentences',
  });

  /* ---------------- format ---------------- */
  const algoNote = h('p', { class: 'small faint', style: { margin: '8px 2px 0' } });
  const algoSelect = h('select', {
    onchange: (e) => { config.algorithm = e.target.value; paintAlgo(); },
  });

  function paintAlgo() {
    algoSelect.replaceChildren(...algorithmsForMode(config.mode).map((a) =>
      h('option', { value: a.id, selected: a.id === config.algorithm }, `${a.label} — ${a.short}`)));
    algoNote.textContent = getAlgorithm(config.algorithm).description;
  }

  const modeSeg = h('div', { class: 'segmented' },
    ...MODES.map((m) => h('button', {
      type: 'button',
      class: m.id === config.mode ? 'active' : '',
      onclick: (e) => {
        config.mode = m.id;
        config.algorithm = m.defaultAlgorithm;
        [...e.currentTarget.parentNode.children].forEach((b) => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        modeNote.textContent = m.blurb;
        paintAlgo();
      },
    }, m.label)));
  const modeNote = h('p', { class: 'small faint', style: { margin: '8px 2px 0' } }, getMode(config.mode).blurb);
  paintAlgo();

  /* ---------------- courts ---------------- */
  const courtsVal = h('span', { class: 'val' });
  const paintCourts = () => {
    courtsVal.textContent = `${config.courts} court${config.courts > 1 ? 's' : ''}`;
    paintPlayersMeta();
  };
  const courtsStepper = h('div', { class: 'stepper' },
    h('button', { type: 'button', onclick: () => { config.courts = Math.max(1, config.courts - 1); paintCourts(); } }, '−'),
    courtsVal,
    h('button', { type: 'button', onclick: () => { config.courts = Math.min(8, config.courts + 1); paintCourts(); } }, '+'));

  /* ---------------- points ---------------- */
  const customPoints = h('input', {
    type: 'number', inputmode: 'numeric', min: '2', max: '999',
    placeholder: 'Custom', value: POINT_PRESETS.includes(config.pointsPerMatch) ? '' : config.pointsPerMatch,
    style: { maxWidth: '120px' },
    oninput: (e) => {
      const n = parseInt(e.target.value, 10);
      if (Number.isInteger(n) && n >= 2) { config.pointsPerMatch = n; paintPoints(false); }
    },
  });
  const pointChips = h('div', { class: 'chips' });
  function paintPoints(clearCustom = true) {
    pointChips.replaceChildren(...POINT_PRESETS.map((n) => h('button', {
      type: 'button',
      class: `chip ${config.pointsPerMatch === n ? 'active' : ''}`,
      onclick: () => { config.pointsPerMatch = n; customPoints.value = ''; paintPoints(); },
    }, n)), customPoints);
    if (clearCustom && POINT_PRESETS.includes(config.pointsPerMatch)) customPoints.value = '';
  }
  paintPoints();

  const tiesSwitch = switchRow('Allow a draw', config.allowTies, (on) => { config.allowTies = on; });
  const totalSwitch = switchRow('Scores must add up to the match total', config.enforceTotal, (on) => { config.enforceTotal = on; });

  /* ---------------- length ---------------- */
  const roundsInput = h('input', {
    type: 'number', inputmode: 'numeric', min: '1', max: '99',
    placeholder: 'e.g. 8', value: config.roundTarget || '',
    oninput: (e) => {
      const n = parseInt(e.target.value, 10);
      config.roundTarget = Number.isInteger(n) && n > 0 ? n : null;
    },
  });
  const roundsWrap = h('label', { class: 'field', style: { marginTop: '10px', marginBottom: '0' } },
    h('span', { class: 'lbl' }, 'Number of rounds'), roundsInput);
  const lengthSwitch = switchRow('Set a number of rounds', !!config.roundTarget, (on) => {
    roundsWrap.classList.toggle('hidden', !on);
    if (!on) { config.roundTarget = null; roundsInput.value = ''; }
    else if (roundsInput.value) config.roundTarget = parseInt(roundsInput.value, 10);
  });
  roundsWrap.classList.toggle('hidden', !config.roundTarget);

  /* ---------------- players ---------------- */
  const playerList = h('div', { class: 'picker-list' });
  const playersMeta = h('p', { class: 'small', style: { margin: '2px 2px 10px' } });
  const searchInput = h('input', {
    type: 'search', placeholder: 'Search or add a player…', autocapitalize: 'words', autocomplete: 'off',
    oninput: (e) => { filter = e.target.value; paintPlayers(); },
  });

  let people = roster.slice();

  function paintPlayersMeta() {
    const need = config.courts * 4;
    const n = selected.size;
    if (n < need) {
      playersMeta.className = 'small warn-text';
      playersMeta.style.color = 'var(--warn)';
      playersMeta.textContent = `${n} selected — ${config.courts} court${config.courts > 1 ? 's' : ''} need at least ${need}.`;
    } else {
      const resting = n - need;
      playersMeta.style.color = 'var(--text-dim)';
      playersMeta.textContent = resting > 0
        ? `${n} selected — ${resting} sit${resting === 1 ? 's' : ''} out each round, rotating.`
        : `${n} selected — everyone plays every round.`;
    }
    startBtn.disabled = selected.size < config.courts * 4;
  }

  function paintPlayers() {
    const q = filter.trim().toLowerCase();
    const shown = people.filter((p) => !q || p.name.toLowerCase().includes(q));
    const exact = people.some((p) => p.name.toLowerCase() === q);

    replace(playerList,
      ...shown.map((p) => {
        const on = selected.has(p.id);
        return h('div', {
          class: `picker-row ${on ? 'on' : ''}`,
          onclick: () => {
            if (selected.has(p.id)) selected.delete(p.id); else selected.add(p.id);
            paintPlayers();
            paintPlayersMeta();
          },
        },
          h('span', { class: 'avatar' }, initials(p.name)),
          h('span', { class: 'name' }, p.name),
          h('span', { class: 'box' }, '✓'));
      }),
      q && !exact
        ? h('button', {
            class: 'btn outline block sm', type: 'button', style: { marginTop: '4px' },
            onclick: async () => {
              const { player } = await store.addPlayer(filter);
              people = await store.activePlayers();
              selected.add(player.id);
              filter = '';
              searchInput.value = '';
              paintPlayers();
              paintPlayersMeta();
              toast(`${player.name} added`);
            },
          }, `＋ Add “${filter.trim()}”`)
        : null,
      !shown.length && !q
        ? h('p', { class: 'small faint center', style: { padding: '18px 0' } }, 'No players yet — type a name above to add one.')
        : null
    );
  }

  /* ---------------- start ---------------- */
  const startBtn = h('button', {
    class: 'btn primary block',
    style: { marginTop: '18px' },
    onclick: async () => {
      startBtn.disabled = true;
      try {
        const chosen = people.filter((p) => selected.has(p.id));
        const t = createTournament({ name: nameInput.value, players: chosen, config });
        startNextRound(t);
        await store.saveTournament(t);
        await store.setSetting(SETTINGS_KEY, t.config);
        ctx.navigate(`/t/${t.id}`, { replace: true });
      } catch (err) {
        toast(err.message);
        startBtn.disabled = false;
      }
    },
  }, 'Start tournament');

  paintPlayers();
  paintCourts();

  ctx.view.append(
    h('label', { class: 'field' }, h('span', { class: 'lbl' }, 'Name'), nameInput),

    h('h2', {}, 'Format'),
    modeSeg,
    modeNote,

    h('label', { class: 'field', style: { marginTop: '16px' } },
      h('span', { class: 'lbl' }, 'Matchmaking'), algoSelect),
    algoNote,

    h('h2', {}, 'Courts'),
    courtsStepper,

    h('h2', {}, 'Scoring'),
    h('span', { class: 'lbl', style: { display: 'block', marginBottom: '8px', fontSize: '12.5px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '650' } }, 'Points per match'),
    pointChips,
    h('div', { style: { marginTop: '6px' } }, tiesSwitch, totalSwitch),

    h('h2', {}, 'Length'),
    lengthSwitch,
    roundsWrap,

    h('h2', {}, 'Players'),
    searchInput,
    playersMeta,
    playerList,

    startBtn,
    h('div', { style: { height: '10px' } })
  );
}

function switchRow(text, initial, onChange) {
  const input = h('input', { type: 'checkbox', checked: initial });
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'switch' }, h('span', { class: 'txt' }, text), input, h('span', { class: 'track' }));
}
