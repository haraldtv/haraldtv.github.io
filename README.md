# Padel Tournaments

A small, offline-first web app for running padel tournaments from your phone.
Mexicano and Americano, any number of courts, live leaderboard, everything
stored in the browser. No build step, no server, no accounts.

## Running it

Open `index.html` through any web server. Locally:

```bash
python3 -m http.server 8000
# then http://localhost:8000
```

(Opening the file directly with `file://` will not work — ES modules need a
server.)

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. It goes live at `https://<user>.github.io/padel/`.

`.nojekyll` is committed so Pages serves the files as-is. On your phone, use
"Add to Home Screen" — it installs as a standalone app and works offline.

## How it works

- **Game modes** — Mexicano (default) and Americano. The mode picks a sensible
  default matchmaking algorithm; you can override it per tournament.
- **Matchmaking** — pluggable. `random` (default) reshuffles every round,
  `ranked` is classic Mexicano (top four on court 1, 1 + 4 vs 2 + 3), and
  `rotation` is classic Americano (spreads partners and opponents).
- **Scoring** — a fixed number of points per match, default 24, split between
  the two teams. Enter one team's score and the other fills itself in. Draws
  are allowed by default; both can be changed per tournament.
- **Sit-outs** — with more players than court slots the app rotates who rests,
  keeping rest counts even. You can override any round with **Swap players**.
- **Leaderboard** — points are personal and carry across rounds. Rank by total
  points or by points per match (fairer when people sit out unequal amounts).
  Equal points are split on points difference, then wins.
- **Players** — a central roster in the browser database. Everyone you add is
  one tap away next time.
- **Data** — stored in IndexedDB on the device. Export a single tournament or
  a full backup as JSON from the menu; import restores it.
- **Share a link** — the whole tournament is packed into the URL fragment, so
  a link works on a static host with no server and no database.

## Sharing without a server

**Menu → Share a link** produces something like:

```
https://example.com/padel/#/s/zXY7NCsIwEITfZc5TyLahrXkCRdCLt5BDaGop9I8URBDfXWJBpJdh…
```

The tournament is compacted (player names listed once, everything else by
index), deflated with `CompressionStream`, and base64url-encoded into the hash.
A typical evening — 7 players, 10 rounds — comes out around **260 characters**;
a 12-player, 20-round night on 3 courts is under 700. Browsers without
`CompressionStream` fall back to a plain base64 payload that still works.

Because it all lives in the fragment, the payload is **never sent to the
server** — GitHub Pages only ever sees a request for the page itself. Custom
domains work as-is; the link is built from wherever the app is being served.

Opening a share link shows a **read-only** view: the leaderboard, every round
and every score, marked *Read only*, and it writes **nothing** to the viewer's
database — no tournament, no players, not even an empty database file. A
visitor who wants to keep it can tap **Save a copy to this device**, which is
the only path that touches their data: it creates a new tournament with fresh
ids and matches players to their roster by name (adding any who are new), so
nothing of theirs is overwritten or merged. Two people with the same name in a
shared tournament are kept apart as `Ola` and `Ola (2)`.

The link is a snapshot from the moment it was made — it does not update itself.
Share again at the end of the night for the final table.

## Adding a matchmaking algorithm

Create a module in `js/pairing/` that default-exports:

```js
export default {
  id: 'my-algorithm',
  label: 'My algorithm',
  short: 'One-line summary',
  description: 'What it does and when to use it.',
  modes: ['mexicano', 'americano'],
  pair({ players, courts, ranking, history, config, rng }) {
    // return one { teamA: [id, id], teamB: [id, id] } per court
  },
};
```

Then add it to the list in `js/pairing/index.js`. It shows up in the setup
screen and in Settings automatically.

## Layout

```
index.html            app shell
css/styles.css        all styling
js/app.js             hash router + shell
js/db.js              IndexedDB wrapper
js/store.js           players, tournaments, settings, export/import
js/tournament.js      the rules: rounds, sit-outs, scoring, standings
js/pairing/           matchmaking algorithms (one file each)
js/ui/dom.js          small DOM helpers, sheets, toasts
js/ui/views/          one module per screen
sw.js                 offline cache
```
