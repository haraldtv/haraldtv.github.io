/**
 * share.js — put a whole tournament in a link.
 *
 * The point is to share a tournament without a server: the entire thing is
 * squeezed into the URL fragment, so it never leaves the browser and GitHub
 * Pages never has to store anything.
 *
 *   https://example.com/padel/#/s/z<base64url>
 *                              ^ encoding marker: z = deflate-raw, u = plain
 *
 * The payload is a compacted form of the tournament — player names are listed
 * once and everything else refers to them by index — then deflated and
 * base64url-encoded. A typical evening (8 players, 10 rounds) lands around
 * 500 characters, well inside what browsers, chat apps and QR codes accept.
 *
 * Decoding gives back a normal tournament object with synthetic ids, so every
 * existing view can render it. It is never written to the database unless the
 * person looking at it explicitly asks for a copy.
 */

export const SHARE_VERSION = 1;

/* ------------------------------------------------------------------ */
/* compaction                                                          */
/* ------------------------------------------------------------------ */

const NO_SCORE = -1;

function compact(t) {
  const index = new Map(t.players.map((p, i) => [p.id, i]));
  const at = (id) => (index.has(id) ? index.get(id) : -1);
  const cfg = t.config;

  return {
    v: SHARE_VERSION,
    n: t.name,
    d: Math.round(t.createdAt / 1000),
    f: t.finishedAt ? Math.round(t.finishedAt / 1000) : 0,
    s: t.status === 'finished' ? 1 : 0,
    c: [
      cfg.mode, cfg.algorithm, cfg.courts, cfg.pointsPerMatch,
      cfg.allowTies ? 1 : 0, cfg.enforceTotal ? 1 : 0, cfg.roundTarget || 0,
    ],
    p: t.players.map((p) => p.name),
    o: t.players.map((p, i) => (p.active === false ? i : -1)).filter((i) => i >= 0),
    r: t.rounds.map((round) => [
      (round.resting || []).map(at),
      round.matches.map((m) => [
        at(m.teamA[0]), at(m.teamA[1]), at(m.teamB[0]), at(m.teamB[1]),
        m.scoreA === null || m.scoreA === undefined ? NO_SCORE : m.scoreA,
        m.scoreB === null || m.scoreB === undefined ? NO_SCORE : m.scoreB,
      ]),
      round.algorithm || cfg.algorithm,
    ]),
  };
}

function expand(c) {
  if (!c || c.v !== SHARE_VERSION) {
    throw new Error('This link was made with a different version of the app');
  }
  const inactive = new Set(c.o || []);
  const players = (c.p || []).map((name, i) => ({
    id: `s${i}`,
    name,
    active: !inactive.has(i),
  }));
  const id = (i) => (players[i] ? players[i].id : `s${i}`);
  const [mode, algorithm, courts, pointsPerMatch, allowTies, enforceTotal, roundTarget] = c.c;

  return {
    id: null,                    // not a stored tournament
    shared: true,
    name: c.n,
    createdAt: (c.d || 0) * 1000,
    updatedAt: (c.d || 0) * 1000,
    finishedAt: c.f ? c.f * 1000 : null,
    status: c.s ? 'finished' : 'active',
    config: {
      mode, algorithm, courts, pointsPerMatch,
      allowTies: !!allowTies,
      enforceTotal: !!enforceTotal,
      roundTarget: roundTarget || null,
    },
    players,
    rounds: (c.r || []).map(([resting, matches, algo], ri) => ({
      index: ri,
      algorithm: algo || algorithm,
      resting: (resting || []).map(id),
      matches: (matches || []).map((m, mi) => ({
        id: `sm${ri}_${mi}`,
        court: mi + 1,
        teamA: [id(m[0]), id(m[1])],
        teamB: [id(m[2]), id(m[3])],
        scoreA: m[4] === NO_SCORE ? null : m[4],
        scoreB: m[5] === NO_SCORE ? null : m[5],
      })),
    })),
  };
}

/* ------------------------------------------------------------------ */
/* base64url                                                           */
/* ------------------------------------------------------------------ */

function bytesToBase64Url(bytes) {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(text) {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '==='.slice((padded.length + 3) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/* ------------------------------------------------------------------ */
/* compression (optional — older browsers fall back to plain base64)    */
/* ------------------------------------------------------------------ */

const canCompress = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

async function pipeThrough(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

/* ------------------------------------------------------------------ */
/* public API                                                          */
/* ------------------------------------------------------------------ */

/** Tournament → URL-safe payload string (with a one-character encoding marker). */
export async function encodeTournament(t) {
  const json = JSON.stringify(compact(t));
  const raw = new TextEncoder().encode(json);
  if (!canCompress()) return 'u' + bytesToBase64Url(raw);
  try {
    return 'z' + bytesToBase64Url(await pipeThrough(raw, new CompressionStream('deflate-raw')));
  } catch {
    return 'u' + bytesToBase64Url(raw);
  }
}

/** Payload string → a read-only tournament object. Throws on anything invalid. */
export async function decodeTournament(payload) {
  if (!payload || payload.length < 2) throw new Error('That link is missing its tournament data');
  const marker = payload[0];
  const body = payload.slice(1);
  let bytes;
  try {
    bytes = base64UrlToBytes(body);
  } catch {
    throw new Error('That link looks damaged — it may have been cut short');
  }
  if (marker === 'z') {
    if (!canCompress()) throw new Error('This browser cannot read compressed links');
    try {
      bytes = await pipeThrough(bytes, new DecompressionStream('deflate-raw'));
    } catch {
      throw new Error('That link looks damaged — it may have been cut short');
    }
  } else if (marker !== 'u') {
    throw new Error('Unrecognised link format');
  }
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('That link looks damaged — it may have been cut short');
  }
  return expand(parsed);
}

/** Where the app is served from, e.g. https://example.com/padel/ */
export function appBase() {
  return location.origin + location.pathname.replace(/index\.html$/, '');
}

/** The full shareable URL for a tournament. */
export async function shareUrl(t, base) {
  return `${base || appBase()}#/s/${await encodeTournament(t)}`;
}
