/**
 * tournament.js — the rules of the game. No DOM, no storage: pure data in,
 * pure data out, so it can be reasoned about (and tested) on its own.
 */
import { uid } from './db.js';
import { getAlgorithm } from './pairing/index.js';

/* ------------------------------------------------------------------ */
/* game modes                                                          */
/* ------------------------------------------------------------------ */

export const MODES = [
  {
    id: 'mexicano',
    label: 'Mexicano',
    blurb: 'Teams are re-drawn every round. Points are personal, so you carry your own score all evening.',
    defaultAlgorithm: 'random',
  },
  {
    id: 'americano',
    label: 'Americano',
    blurb: 'Same personal scoring, but the draw tries to give everyone a turn with everyone.',
    defaultAlgorithm: 'rotation',
  },
];

export const getMode = (id) => MODES.find((m) => m.id === id) || MODES[0];

export const POINT_PRESETS = [16, 21, 24, 32];

export const DEFAULT_CONFIG = {
  mode: 'mexicano',
  algorithm: 'random',
  courts: 1,
  pointsPerMatch: 24,
  allowTies: true,
  enforceTotal: true,
  roundTarget: null, // null = open-ended, finish it by hand
};

/* ------------------------------------------------------------------ */
/* creation                                                            */
/* ------------------------------------------------------------------ */

export function defaultName(date = new Date()) {
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function createTournament({ name, players, config }) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const roster = players.map((p) => ({ id: p.id, name: p.name, active: true }));
  if (roster.length < 4) throw new Error('You need at least 4 players');
  if (roster.length < cfg.courts * 4) {
    throw new Error(`${cfg.courts} courts need ${cfg.courts * 4} players — you have ${roster.length}`);
  }
  const now = Date.now();
  return {
    id: uid('t_'),
    name: (name || '').trim() || defaultName(),
    createdAt: now,
    updatedAt: now,
    finishedAt: null,
    status: 'active',
    config: cfg,
    players: roster,
    rounds: [],
  };
}

/* ------------------------------------------------------------------ */
/* reading a tournament                                                */
/* ------------------------------------------------------------------ */

export const playingRoster = (t) => t.players.filter((p) => p.active !== false);
export const playerName = (t, id) => (t.players.find((p) => p.id === id) || {}).name || '—';
export const currentRound = (t) => (t.rounds.length ? t.rounds[t.rounds.length - 1] : null);
export const matchIsScored = (m) => m.scoreA !== null && m.scoreA !== undefined && m.scoreB !== null && m.scoreB !== undefined;
export const roundIsComplete = (r) => !!r && r.matches.length > 0 && r.matches.every(matchIsScored);
export const roundsPlayed = (t) => t.rounds.filter(roundIsComplete).length;

export function slotsPerRound(t) {
  return t.config.courts * 4;
}

/** How many players sit out each round, given who is currently active. */
export function restCount(t) {
  return Math.max(0, playingRoster(t).length - slotsPerRound(t));
}

/* ------------------------------------------------------------------ */
/* standings                                                           */
/* ------------------------------------------------------------------ */

function blankStat(p) {
  return {
    id: p.id,
    name: p.name,
    active: p.active !== false,
    points: 0,
    conceded: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    rests: 0,
  };
}

/**
 * @param {Object} t tournament
 * @param {Object} [opts]
 * @param {'points'|'average'} [opts.sortBy] rank on total points (default) or points per match
 */
export function computeStandings(t, opts = {}) {
  const sortBy = opts.sortBy || 'points';
  const stats = new Map(t.players.map((p) => [p.id, blankStat(p)]));
  const stat = (id) => {
    if (!stats.has(id)) stats.set(id, blankStat({ id, name: playerName(t, id), active: false }));
    return stats.get(id);
  };

  for (const round of t.rounds) {
    for (const id of round.resting || []) stat(id).rests += 1;
    for (const m of round.matches) {
      if (!matchIsScored(m)) continue;
      const sides = [
        { ids: m.teamA, mine: m.scoreA, theirs: m.scoreB },
        { ids: m.teamB, mine: m.scoreB, theirs: m.scoreA },
      ];
      for (const side of sides) {
        for (const id of side.ids) {
          const s = stat(id);
          s.points += side.mine;
          s.conceded += side.theirs;
          s.played += 1;
          if (side.mine > side.theirs) s.wins += 1;
          else if (side.mine === side.theirs) s.draws += 1;
          else s.losses += 1;
        }
      }
    }
  }

  const rows = [...stats.values()].map((s) => ({
    ...s,
    diff: s.points - s.conceded,
    average: s.played ? s.points / s.played : 0,
  }));

  rows.sort((a, b) => {
    if (sortBy === 'average' && b.average !== a.average) return b.average - a.average;
    if (b.points !== a.points) return b.points - a.points;
    if (b.diff !== a.diff) return b.diff - a.diff;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.played !== b.played) return a.played - b.played;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return rows.map((r, i) => ({ ...r, position: i + 1 }));
}

/* ------------------------------------------------------------------ */
/* building the next round                                             */
/* ------------------------------------------------------------------ */

/**
 * Choose who sits out. Players who have rested least go first, and someone who
 * rested in the previous round is only picked again if there is no alternative.
 */
export function selectResting(t, rng = Math.random) {
  const need = restCount(t);
  const roster = playingRoster(t);
  if (need <= 0) return [];

  const stats = computeStandings(t);
  const restsById = new Map(stats.map((s) => [s.id, s.rests]));
  const last = currentRound(t);
  const restedLast = new Set((last && last.resting) || []);

  const ranked = roster
    .map((p) => ({
      p,
      rests: restsById.get(p.id) || 0,
      justRested: restedLast.has(p.id) ? 1 : 0,
      jitter: rng(),
    }))
    .sort((a, b) =>
      a.rests - b.rests ||
      a.justRested - b.justRested ||
      a.jitter - b.jitter
    );

  return ranked.slice(0, need).map((x) => x.p.id);
}

/**
 * Build (but do not attach) the next round.
 * @param {Object} t
 * @param {Object} [opts] { resting: string[] } to force a specific sit-out set
 */
export function buildRound(t, opts = {}) {
  const roster = playingRoster(t);
  const need = slotsPerRound(t);
  if (roster.length < need) {
    throw new Error(`Need ${need} players for ${t.config.courts} court${t.config.courts > 1 ? 's' : ''}, ${roster.length} available`);
  }

  const resting = opts.resting ? opts.resting.slice() : selectResting(t, opts.rng);
  const restingSet = new Set(resting);
  const playing = roster.filter((p) => !restingSet.has(p.id));
  if (playing.length !== need) {
    throw new Error(`Sit-out list leaves ${playing.length} players, need exactly ${need}`);
  }

  const algorithm = getAlgorithm(t.config.algorithm);
  const ranking = computeStandings(t).map((s) => s.id);
  const pairs = algorithm.pair({
    players: playing,
    courts: t.config.courts,
    ranking,
    history: t.rounds,
    config: t.config,
    rng: opts.rng || Math.random,
  });

  return {
    index: t.rounds.length,
    createdAt: Date.now(),
    resting,
    algorithm: algorithm.id,
    matches: pairs.map((p, i) => ({
      id: uid('m_'),
      court: i + 1,
      teamA: p.teamA,
      teamB: p.teamB,
      scoreA: null,
      scoreB: null,
    })),
  };
}

/** Append a freshly built round. Mutates and returns the tournament. */
export function startNextRound(t, opts = {}) {
  const last = currentRound(t);
  if (last && !roundIsComplete(last)) {
    throw new Error('Finish the current round first');
  }
  t.rounds.push(buildRound(t, opts));
  return t;
}

/** Replace the current (unplayed) round with a new draw. */
export function redrawRound(t, opts = {}) {
  const round = currentRound(t);
  if (!round) throw new Error('No round to redraw');
  if (round.matches.some(matchIsScored)) throw new Error('Scores are already in for this round');
  const keep = opts.keepResting ? round.resting : undefined;
  t.rounds[t.rounds.length - 1] = buildRound(
    { ...t, rounds: t.rounds.slice(0, -1) },
    { ...opts, resting: keep }
  );
  t.rounds[t.rounds.length - 1].index = t.rounds.length - 1;
  return t;
}

/**
 * Swap two players in the current round. Either can be a resting player, so
 * this covers both "put me on court" and "these two should be partners".
 */
export function swapPlayers(t, idA, idB) {
  const round = currentRound(t);
  if (!round) throw new Error('No round in play');
  if (idA === idB) return t;

  const place = (id) => {
    if ((round.resting || []).includes(id)) return { kind: 'rest' };
    for (const m of round.matches) {
      for (const team of ['teamA', 'teamB']) {
        const i = m[team].indexOf(id);
        if (i !== -1) return { kind: 'match', match: m, team, i };
      }
    }
    return null;
  };

  const a = place(idA);
  const b = place(idB);
  if (!a || !b) throw new Error('Those players are not in this round');
  if (a.kind === 'rest' && b.kind === 'rest') return t;

  if (a.kind === 'match') a.match[a.team][a.i] = idB;
  if (b.kind === 'match') b.match[b.team][b.i] = idA;
  round.resting = (round.resting || []).map((id) => (id === idA ? idB : id === idB ? idA : id));
  return t;
}

/* ------------------------------------------------------------------ */
/* scoring                                                             */
/* ------------------------------------------------------------------ */

export function validateScore(t, scoreA, scoreB) {
  const { pointsPerMatch, allowTies, enforceTotal } = t.config;
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
    return 'Scores must be whole numbers of 0 or more';
  }
  if (enforceTotal && scoreA + scoreB !== pointsPerMatch) {
    return `Scores must add up to ${pointsPerMatch}`;
  }
  if (!allowTies && scoreA === scoreB) {
    return 'A draw is not allowed in this tournament';
  }
  return null;
}

export function recordScore(t, matchId, scoreA, scoreB) {
  const error = validateScore(t, scoreA, scoreB);
  if (error) throw new Error(error);
  for (const round of t.rounds) {
    const m = round.matches.find((x) => x.id === matchId);
    if (m) {
      m.scoreA = scoreA;
      m.scoreB = scoreB;
      m.scoredAt = Date.now();
      return t;
    }
  }
  throw new Error('Unknown match');
}

export function clearScore(t, matchId) {
  for (const round of t.rounds) {
    const m = round.matches.find((x) => x.id === matchId);
    if (m) {
      m.scoreA = null;
      m.scoreB = null;
      delete m.scoredAt;
      return t;
    }
  }
  return t;
}

/* ------------------------------------------------------------------ */
/* lifecycle                                                           */
/* ------------------------------------------------------------------ */

export function targetReached(t) {
  const target = t.config.roundTarget;
  return !!target && roundsPlayed(t) >= target;
}

export function finishTournament(t) {
  t.status = 'finished';
  t.finishedAt = Date.now();
  // Drop a trailing round that was never played.
  const last = currentRound(t);
  if (last && !last.matches.some(matchIsScored)) t.rounds.pop();
  return t;
}

export function reopenTournament(t) {
  t.status = 'active';
  t.finishedAt = null;
  return t;
}

/** Add someone who turned up late. */
export function addPlayerToTournament(t, player) {
  if (t.players.some((p) => p.id === player.id)) {
    t.players = t.players.map((p) => (p.id === player.id ? { ...p, active: true } : p));
    return t;
  }
  t.players.push({ id: player.id, name: player.name, active: true });
  return t;
}

/** Someone had to leave — keep their results, stop drawing them into rounds. */
export function setPlayerActive(t, id, active) {
  t.players = t.players.map((p) => (p.id === id ? { ...p, active } : p));
  return t;
}

export function summarise(t) {
  const standings = computeStandings(t);
  const played = roundsPlayed(t);
  return {
    played,
    leader: standings[0] || null,
    playerCount: t.players.length,
    matches: t.rounds.reduce((n, r) => n + r.matches.filter(matchIsScored).length, 0),
  };
}
