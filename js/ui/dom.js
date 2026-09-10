/** Tiny DOM helpers — enough structure to keep the views readable. */

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'style') Object.assign(el.style, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'html') el.innerHTML = value;
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, value);
  }
  append(el, children);
  return el;
}

function append(parent, children) {
  for (const child of children.flat(4)) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Append children to a node, skipping null/undefined/false. */
export function mount(parent, ...children) {
  append(parent, children);
  return parent;
}

/**
 * Replace a node's children, skipping null/undefined/false.
 * (Element.replaceChildren would turn a null into the text "null".)
 */
export function replace(parent, ...children) {
  clear(parent);
  append(parent, children);
  return parent;
}

export const frag = (...children) => {
  const f = document.createDocumentFragment();
  append(f, children);
  return f;
};

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ---------- toast ---------- */
let toastTimer = null;
export function toast(message) {
  const root = document.getElementById('toast-root');
  clear(root);
  root.appendChild(h('div', { class: 'toast' }, message));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => clear(root), 2400);
}

/* ---------- bottom sheet ---------- */
export function sheet(title, buildBody) {
  const root = document.getElementById('sheet-root');
  clear(root);

  const close = () => {
    clear(root);
    document.body.classList.remove('sheet-open');
  };

  const body = h('div', { class: 'sheet' },
    h('div', { class: 'grabber' }),
    title ? h('h3', {}, title) : null
  );
  const backdrop = h('div', {
    class: 'sheet-backdrop',
    onclick: (e) => { if (e.target === backdrop) close(); },
  }, body);

  const content = buildBody({ close, body });
  if (content) body.appendChild(content);

  root.appendChild(backdrop);
  document.body.classList.add('sheet-open');
  return { close };
}

/** Promise-based confirm dialog that matches the app's look. */
export function confirmSheet({ title, message, confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value, close) => { settled = true; close(); resolve(value); };
    const { close } = sheet(title, ({ close: c }) => {
      const el = h('div', { class: 'stack' },
        message ? h('p', { class: 'muted small', style: { margin: '0 0 6px' } }, message) : null,
        h('button', { class: `btn block ${danger ? 'danger' : 'primary'}`, onclick: () => done(true, c) }, confirmLabel),
        h('button', { class: 'btn block subtle', onclick: () => done(false, c) }, 'Cancel')
      );
      return el;
    });
    // If the backdrop is tapped the sheet clears itself; resolve false shortly after.
    const observer = new MutationObserver(() => {
      if (!settled && !document.getElementById('sheet-root').firstChild) {
        observer.disconnect();
        resolve(false);
      }
    });
    observer.observe(document.getElementById('sheet-root'), { childList: true });
    void close;
  });
}

/* ---------- download ---------- */
export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickJsonFile() {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      input.remove();
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => {
        try { resolve(JSON.parse(String(reader.result))); }
        catch { resolve({ __error: 'That file is not valid JSON' }); }
      };
      reader.onerror = () => resolve({ __error: 'Could not read that file' });
      reader.readAsText(file);
    });
    document.body.appendChild(input);
    input.click();
  });
}

/* ---------- misc formatting ---------- */
export function relativeDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return `Today ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  const yesterday = new Date(today.getTime() - 86400000);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;
