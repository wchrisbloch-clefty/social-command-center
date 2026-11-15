// lib/x-provider.js — how the X layer is served. PURE (no I/O), so it is unit-testable
// in isolation and can never disagree with itself.
//
// X on the free public RSSHub instance cannot work (it needs TWITTER_AUTH_TOKEN ON THE
// INSTANCE). Rather than show 11 red "needs token" rows, the app chooses ONE provider and
// shows ONE neutral status. See docs/x-layer-diagnosis.md.
//
//   X_PROVIDER = auto (default) | xai | rsshub | off
//
//   auto    a NON-public RSSHub that actually answers an X route wins (your self-host);
//           else an XAI_API_KEY present → xai; else → off (honest "not connected").
//   xai     force the supported xAI live-search path (→ off if no key).
//   rsshub  trust the configured instance for X (→ it reports per-handle like any feed).
//   off     do not fetch X at all; show the neutral "not connected" chip.

/** True when the base URL is empty or the shared public instance (cannot serve /twitter/*). */
export function isPublicRsshub(base) {
  return !base || /(^|\/\/|\.)rsshub\.app(\/|$|:)/i.test(String(base).trim());
}

/**
 * Decide the X provider. Pure.
 * @param {object} i
 * @param {string}  i.mode            value of X_PROVIDER (auto|xai|rsshub|off)
 * @param {string}  i.rsshubBase      RSSHUB_BASE_URL
 * @param {boolean} i.rsshubAnswersX  did a private instance answer a probe X route? (auto only)
 * @param {boolean} i.hasXaiKey       is XAI_API_KEY present?
 * @returns {'rsshub'|'xai'|'off'}
 */
export function selectXProvider({ mode = 'auto', rsshubBase = '', rsshubAnswersX = false, hasXaiKey = false } = {}) {
  const m = String(mode || 'auto').toLowerCase();
  if (m === 'off') return 'off';
  if (m === 'rsshub') return 'rsshub';            // operator's explicit choice; trusted as-is
  if (m === 'xai') return hasXaiKey ? 'xai' : 'off';
  // auto
  const privateInstance = !isPublicRsshub(rsshubBase);
  if (privateInstance && rsshubAnswersX) return 'rsshub';
  if (hasXaiKey) return 'xai';
  return 'off';
}

/**
 * The ONE neutral chip for the resolved state. Red is reserved for Breaking, so every state
 * here is neutral. `capped` overrides the provider (the daily xAI cap was reached).
 * @returns {{ provider:string, label:string, detail:string }}
 */
export function xLayerStatus(provider, { capped = false } = {}) {
  if (capped) {
    return { provider: 'capped', label: 'X: daily limit reached',
      detail: 'The daily xAI cap was reached. X resumes tomorrow; everything else is unaffected.' };
  }
  switch (provider) {
    case 'xai':
      return { provider, label: 'X: via xAI',
        detail: 'Recent X posts via xAI live search. Shown as Alt. perspective (unverified).' };
    case 'rsshub':
      return { provider, label: 'X: via your RSSHub',
        detail: 'Served by your self-hosted RSSHub instance.' };
    default:
      return { provider: 'off', label: 'X: not connected (add XAI_API_KEY or a private RSSHub)',
        detail: 'The public RSSHub instance cannot serve X. Add an XAI_API_KEY, or point RSSHUB_BASE_URL at a private instance that holds a token.' };
  }
}
