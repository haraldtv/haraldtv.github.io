/**
 * Pairing algorithm registry.
 *
 * To add a new way of matching players: drop a module in this folder that
 * default-exports { id, label, short, description, modes, pair(ctx) } and add
 * it to the list below. Nothing else in the app needs to change.
 *
 * pair(ctx) receives:
 *   players  — the players actually playing this round (courts * 4 of them)
 *   courts   — number of courts
 *   ranking  — player ids ordered best to worst on the current leaderboard
 *   history  — rounds played so far
 *   config   — the tournament config
 *   rng      — random source (injectable for tests)
 * and returns one { teamA: [id, id], teamB: [id, id] } per court, in court order.
 */
import random from './random.js';
import ranked from './ranked.js';
import rotation from './rotation.js';

export const ALGORITHMS = [random, ranked, rotation];

const BY_ID = new Map(ALGORITHMS.map((a) => [a.id, a]));

export const getAlgorithm = (id) => BY_ID.get(id) || random;

export const algorithmsForMode = (mode) =>
  ALGORITHMS.filter((a) => !a.modes || a.modes.includes(mode));
