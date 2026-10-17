// localStorage wrapper. Every access is guarded: private windows and blocked storage just fall back to the defaults.
const KEY = (k) => 'pixelbrawlers.' + k;

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(KEY(key));
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}

export function store(key, value) {
  try { localStorage.setItem(KEY(key), JSON.stringify(value)); return true; } catch { return false; }
}
