// AD1: X provider selection — pure, exhaustive. node --test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectXProvider, isPublicRsshub, xLayerStatus } from '../lib/x-provider.js';

test('isPublicRsshub: empty or rsshub.app is public; a private host is not', () => {
  assert.equal(isPublicRsshub(''), true);
  assert.equal(isPublicRsshub('https://rsshub.app'), true);
  assert.equal(isPublicRsshub('https://rsshub.app/'), true);
  assert.equal(isPublicRsshub('https://rss.mydomain.com'), false);
  assert.equal(isPublicRsshub('https://aether-rsshub.fly.dev'), false);
});

// All 4 modes × key present/missing × public/private instance (× answersX where it matters).
const PUB = 'https://rsshub.app';
const PRIV = 'https://rss.mydomain.com';
const cases = [
  // mode 'off' is always off
  [{ mode: 'off', rsshubBase: PRIV, rsshubAnswersX: true, hasXaiKey: true }, 'off'],
  // mode 'rsshub' always rsshub (operator's explicit choice)
  [{ mode: 'rsshub', rsshubBase: PUB, hasXaiKey: false }, 'rsshub'],
  [{ mode: 'rsshub', rsshubBase: PRIV, hasXaiKey: true }, 'rsshub'],
  // mode 'xai' → xai iff key present, else off
  [{ mode: 'xai', rsshubBase: PUB, hasXaiKey: true }, 'xai'],
  [{ mode: 'xai', rsshubBase: PRIV, hasXaiKey: false }, 'off'],
  // mode 'auto', PUBLIC instance: never rsshub; xai iff key, else off
  [{ mode: 'auto', rsshubBase: PUB, rsshubAnswersX: false, hasXaiKey: true }, 'xai'],
  [{ mode: 'auto', rsshubBase: PUB, rsshubAnswersX: false, hasXaiKey: false }, 'off'],
  // mode 'auto', PRIVATE instance that ANSWERS X → rsshub, even with a key present
  [{ mode: 'auto', rsshubBase: PRIV, rsshubAnswersX: true, hasXaiKey: true }, 'rsshub'],
  [{ mode: 'auto', rsshubBase: PRIV, rsshubAnswersX: true, hasXaiKey: false }, 'rsshub'],
  // mode 'auto', PRIVATE instance that does NOT answer X → fall back to xai, else off
  [{ mode: 'auto', rsshubBase: PRIV, rsshubAnswersX: false, hasXaiKey: true }, 'xai'],
  [{ mode: 'auto', rsshubBase: PRIV, rsshubAnswersX: false, hasXaiKey: false }, 'off'],
  // default mode (undefined) behaves as auto
  [{ rsshubBase: PUB, hasXaiKey: true }, 'xai'],
];
for (const [input, expected] of cases) {
  test(`selectXProvider ${JSON.stringify(input)} → ${expected}`, () => {
    assert.equal(selectXProvider(input), expected);
  });
}

test('xLayerStatus labels are the four neutral states, none mentioning red', () => {
  assert.match(xLayerStatus('xai').label, /^X: via xAI$/);
  assert.match(xLayerStatus('rsshub').label, /^X: via your RSSHub$/);
  assert.match(xLayerStatus('off').label, /not connected/);
  assert.match(xLayerStatus('xai', { capped: true }).label, /daily limit reached/);
  // capped overrides provider
  assert.equal(xLayerStatus('xai', { capped: true }).provider, 'capped');
});
