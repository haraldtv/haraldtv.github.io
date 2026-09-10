/**
 * store.js — application-level data access on top of db.js.
 * Everything the UI needs to read or write lives here.
 */
import * as db from './db.js';

/* ------------------------------------------------------------------ */
/* players — the central roster                                        */
/* ------------------------------------------------------------------ */

export async function allPlayers() {
  const list = await db.getAll('players');
  return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export async function activePlayers() {
  return (await allPlayers()).filter((p) => !p.archived);
}

/**
 * Add a player to the roster. Names are matched case-insensitively so the
 * same person does not end up in the list twice.
 * @returns {Promise<{player: Object, created: boolean}>}
 */
export async function addPlayer(rawName) {
  const name = String(rawName || '').trim().replace(/\s+/g, ' ');
  if (!name) throw new Error('Player needs a name');
  const existing = (await allPlayers()).find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    if (existing.archived) {
      existing.archived = false;
      await db.put('players', existing);
    }
    return { player: existing, created: false };
  }
  const player = { id: db.uid('p_'), name, createdAt: Date.now(), archived: false, note: '' };
  await db.put('players', player);
  return { player, created: true };
}

export async function renamePlayer(id, rawName) {
  const name = String(rawName || '').trim().replace(/\s+/g, ' ');
  if (!name) throw new Error('Player needs a name');
  const player = await db.get('players', id);
  if (!player) throw new Error('Unknown player');
  player.name = name;
  await db.put('players', player);
  return player;
}

export async function setPlayerArchived(id, archived) {
  const player = await db.get('players', id);
  if (!player) return null;
  player.archived = !!archived;
  await db.put('players', player);
  return player;
}

export async function deletePlayer(id) {
  return db.remove('players', id);
}

/** Ensure every name exists in the roster; returns the player records. */
export async function ensurePlayers(names) {
  const out = [];
  for (const name of names) {
    const { player } = await addPlayer(name);
    out.push(player);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* tournaments                                                         */
/* ------------------------------------------------------------------ */

export async function allTournaments() {
  const list = await db.getAll('tournaments');
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export const getTournament = (id) => db.get('tournaments', id);

export async function saveTournament(t) {
  t.updatedAt = Date.now();
  await db.put('tournaments', t);
  return t;
}

export const deleteTournament = (id) => db.remove('tournaments', id);

export async function activeTournament() {
  const list = await allTournaments();
  return list.find((t) => t.status === 'active') || null;
}

/* ------------------------------------------------------------------ */
/* settings — remembered defaults                                      */
/* ------------------------------------------------------------------ */

export async function getSetting(key, fallback = null) {
  const row = await db.get('settings', key);
  return row ? row.value : fallback;
}

export const setSetting = (key, value) => db.put('settings', { key, value });

/* ------------------------------------------------------------------ */
/* export / import                                                     */
/* ------------------------------------------------------------------ */

export function tournamentToJson(t, players) {
  const byId = new Map((players || []).map((p) => [p.id, p]));
  const nameOf = (id) => {
    const inTourn = (t.players || []).find((p) => p.id === id);
    return (inTourn && inTourn.name) || (byId.get(id) || {}).name || id;
  };
  return {
    kind: 'padel.tournament',
    version: 1,
    exportedAt: new Date().toISOString(),
    tournament: {
      ...t,
      rounds: (t.rounds || []).map((r) => ({
        ...r,
        restingNames: (r.resting || []).map(nameOf),
        matches: (r.matches || []).map((m) => ({
          ...m,
          teamANames: m.teamA.map(nameOf),
          teamBNames: m.teamB.map(nameOf),
        })),
      })),
    },
  };
}

export async function exportAll() {
  return {
    kind: 'padel.backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    players: await allPlayers(),
    tournaments: await allTournaments(),
  };
}

/**
 * Import a backup or a single-tournament export. Additive: existing records
 * with the same id are overwritten, everything else is left alone.
 */
export async function importData(data) {
  const summary = { players: 0, tournaments: 0 };
  if (!data || typeof data !== 'object') throw new Error('Not a valid export file');

  if (Array.isArray(data.players)) {
    await db.putMany('players', data.players);
    summary.players = data.players.length;
  }
  const tournaments = Array.isArray(data.tournaments)
    ? data.tournaments
    : data.tournament ? [data.tournament] : [];
  if (tournaments.length) {
    await db.putMany('tournaments', tournaments);
    summary.tournaments = tournaments.length;
    // Make sure every participant exists in the roster.
    const roster = await allPlayers();
    const known = new Set(roster.map((p) => p.id));
    const missing = [];
    for (const t of tournaments) {
      for (const p of t.players || []) {
        if (!known.has(p.id)) {
          known.add(p.id);
          missing.push({ id: p.id, name: p.name, createdAt: t.createdAt || Date.now(), archived: false });
        }
      }
    }
    if (missing.length) await db.putMany('players', missing);
  }
  if (!summary.players && !summary.tournaments) throw new Error('Nothing to import from that file');
  return summary;
}
