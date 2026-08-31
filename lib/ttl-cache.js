// lib/ttl-cache.js — a small in-process TTL cache for expensive derived routes.
//
// ── WHAT THIS IS FOR ────────────────────────────────────────────────────────
// /api/recommend and /api/suggest-categories both re-read the ENTIRE feed to
// answer. That means each request re-runs /api/social, which is paced at 1100ms
// per Reddit host and takes ~20s cold. Opening the Discover view and the
// category manager in the same minute did that work twice for an answer that
// cannot meaningfully change in a minute.
//
// ── WHAT IT IS NOT FOR ──────────────────────────────────────────────────────
// Not the upstream feed cache — /api/social keeps its own, keyed per URL,
// because that one has to reason about 429s and Retry-After. This is one layer
// up: it caches a route's finished ANSWER.
//
// ── WHY IT REPORTS ITS OWN AGE ──────────────────────────────────────────────
// A cache that hides staleness turns "your sources are degraded" into "your
// sources were degraded, ten minutes ago, and nobody said so". Every hit
// carries `cachedAt` and `ageSeconds` in the response, so a stale answer is
// visibly stale rather than quietly wrong.
//
// In-process, so it is per-server-instance and vanishes on redeploy. That is
// the correct scope: this is a latency fix, not a persistence layer.

const stores = new Map();

/**
 * @param {string} name  cache namespace, e.g. 'recommend'
 * @param {number} ttlMs how long an answer stays fresh
 */
export function ttlCache(name, ttlMs) {
  if (!stores.has(name)) stores.set(name, new Map());
  const store = stores.get(name);

  return {
    /** Cached value plus its age, or null. */
    get(key) {
      const hit = store.get(key);
      if (!hit) return null;
      const age = Date.now() - hit.at;
      if (age > ttlMs) { store.delete(key); return null; }
      return { value: hit.value, cachedAt: new Date(hit.at).toISOString(), ageSeconds: Math.round(age / 1000) };
    },

    set(key, value) {
      // Unbounded growth is not a risk worth ignoring just because the key
      // space is small today: `dismissed` is user-supplied and part of the key.
      if (store.size > 64) store.clear();
      store.set(key, { at: Date.now(), value });
      return value;
    },

    /** Drop everything — call after a write that invalidates the answer. */
    clear() { store.clear(); },
  };
}

/**
 * `?fresh=1` bypasses the cache. Deliberately explicit: a refresh button should
 * be able to mean refresh, and a debugging session should not have to wait out
 * a TTL.
 */
export function wantsFresh(request) {
  const v = request?.nextUrl?.searchParams?.get('fresh');
  return v === '1' || v === 'true';
}
