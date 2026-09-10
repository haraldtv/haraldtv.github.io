/** app.js — router and shell. */
import { clear, h, toast } from './ui/dom.js';
import homeView from './ui/views/home.js';
import playersView from './ui/views/players.js';
import setupView from './ui/views/setup.js';
import tournamentView from './ui/views/tournament.js';
import historyView from './ui/views/history.js';
import settingsView from './ui/views/settings.js';
import shareView from './ui/views/share.js';

const ROUTES = [
  { re: /^\/?$/,        view: homeView,       tab: 'home' },
  { re: /^\/players$/,  view: playersView,    tab: 'players' },
  { re: /^\/history$/,  view: historyView,    tab: 'history' },
  { re: /^\/settings$/, view: settingsView,   tab: null },
  { re: /^\/new$/,      view: setupView,      tab: null },
  { re: /^\/t\/([^/]+)$/, view: tournamentView, tab: null },
  { re: /^\/s\/(.+)$/,   view: shareView,      tab: null },
];

const svg = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const TABS = [
  {
    id: 'home', label: 'Play', route: '/',
    ico: svg('<circle cx="12" cy="12" r="8.5"/><path d="M6 5.9A9 9 0 0 1 9.1 12 9 9 0 0 1 6 18.1"/><path d="M18 5.9A9 9 0 0 0 14.9 12a9 9 0 0 0 3.1 6.1"/>'),
  },
  {
    id: 'players', label: 'Players', route: '/players',
    ico: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.6a3.2 3.2 0 0 1 0 6.3M17.2 14.2A5.5 5.5 0 0 1 20.5 19"/>'),
  },
  {
    id: 'history', label: 'History', route: '/history',
    ico: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2V12l3.2 2"/>'),
  },
];

const elTopbar = () => document.getElementById('topbar');
const elView = () => document.getElementById('view');
const elTabbar = () => document.getElementById('tabbar');

export function navigate(path, { replace = false } = {}) {
  const target = `#${path}`;
  if (location.hash === target) return render();
  if (replace) location.replace(target);
  else location.hash = target;
}

export const back = () => (history.length > 1 ? history.back() : navigate('/'));

function currentPath() {
  const raw = location.hash.replace(/^#/, '');
  return raw || '/';
}

function renderTabs(activeId) {
  const bar = clear(elTabbar());
  if (!activeId) return;
  for (const tab of TABS) {
    bar.appendChild(
      h('button', {
        class: tab.id === activeId ? 'active' : '',
        onclick: () => navigate(tab.route),
      },
        h('span', { class: 'ico', html: tab.ico }),
        h('span', {}, tab.label))
    );
  }
}

export function setTopbar(...nodes) {
  const bar = clear(elTopbar());
  nodes.flat().forEach((n) => n && bar.appendChild(n));
}

export function titleBlock(title, subtitle) {
  return h('h1', {}, title, subtitle ? h('span', { class: 'sub' }, subtitle) : null);
}

export function backButton(to) {
  return h('button', {
    class: 'icon-btn ghost',
    'aria-label': 'Back',
    onclick: () => (to ? navigate(to) : back()),
  }, '‹');
}

let renderToken = 0;
let queue = Promise.resolve();

/**
 * Renders the current route. Calls are serialised and superseded ones are
 * dropped, so a burst of navigations can never interleave two views into the
 * same container.
 */
export function render() {
  const token = ++renderToken;
  queue = queue.then(() => (token === renderToken ? draw(token) : undefined));
  return queue;
}

async function draw(token) {
  const path = currentPath();
  const match = ROUTES.map((r) => ({ r, m: r.re.exec(path) })).find((x) => x.m);
  if (!match) return navigate('/', { replace: true });

  const view = clear(elView());
  renderTabs(match.r.tab);
  view.classList.toggle('has-tabbar', !!match.r.tab);
  view.scrollTop = 0;

  const ctx = {
    params: match.m.slice(1).map(decodeURIComponent),
    view,
    navigate,
    back,
    refresh: () => render(),
    setTopbar,
    titleBlock,
    backButton,
    isStale: () => token !== renderToken,
  };

  try {
    await match.r.view(ctx);
  } catch (err) {
    console.error(err);
    setTopbar(titleBlock('Something went wrong'));
    clear(view).appendChild(
      h('div', { class: 'empty' },
        h('div', { class: 'big' }, '⚠️'),
        h('p', {}, err.message || String(err)),
        h('button', { class: 'btn outline', style: { marginTop: '16px' }, onclick: () => navigate('/') }, 'Back to start'))
    );
  }
}

window.addEventListener('hashchange', render);
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', render, { once: true });
} else {
  render();
}

// Offline support: the club Wi-Fi is not to be trusted.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
  toast(e.reason && e.reason.message ? e.reason.message : 'Something went wrong');
});
