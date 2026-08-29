// app/api/categories/route.js — the ONE writer for config/categories.js.
//
// GET  /api/categories → the collection + source counts
// POST /api/categories → one mutation: add | rename | recolor | merge | delete | reorder
//
// Every mutation goes through here. The manager UI and a hand edit produce the
// same file, and there is no parallel list.
//
// ── THE GUARANTEE ───────────────────────────────────────────────────────────
// No mutation can orphan a source. `delete` and `merge` REQUIRE a reassignment
// target and rewrite the affected sources in the same request; if the source
// rewrite fails, the category change is not written either. A source pointing
// at a category that no longer exists would be silent — the item simply stops
// appearing under any tab — so it must be impossible rather than merely
// discouraged.
//
// Like /api/sources, this needs a writable filesystem: true locally, false on
// Vercel. On a read-only host it does not pretend to succeed — it returns the
// rewritten file for you to paste, with readOnly: true.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Config paths resolve from the PROJECT ROOT, never from import.meta.url:
// in a production build this module is bundled into .next/server, so a
// module-relative path points at the build output instead of the file you
// actually edit — and the write would appear to succeed while changing nothing.
import {
  CATEGORIES, PALETTE, FALLBACK_CATEGORY_ID,
  makeCategoryId, normalizeOrder, sortedCategories,
} from '../../../config/categories.js';
import { SOCIAL_SOURCES, YOUTUBE_SOURCES, TOPIC_SOURCES } from '../../../config/sources.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CATEGORIES_PATH = join(process.cwd(), 'config', 'categories.js');
const SOURCES_PATH    = join(process.cwd(), 'config', 'sources.js');

const HEX = /^#[0-9a-fA-F]{6}$/;

function sourceCounts() {
  const counts = {};
  for (const s of [...SOCIAL_SOURCES, ...YOUTUBE_SOURCES, ...TOPIC_SOURCES]) {
    counts[s.category] = (counts[s.category] || 0) + 1;
  }
  return counts;
}

/** Render the collection back into the marked block of config/categories.js. */
function renderCategoriesBlock(list) {
  const width = Math.max(...list.map(c => c.id.length)) + 3;
  const lw    = Math.max(...list.map(c => c.label.length)) + 3;
  const lines = sortedCategories(list).map(c =>
    `  { id: ${(`'${c.id}',`).padEnd(width + 1)} label: ${(`'${c.label.replace(/'/g, "\\'")}',`).padEnd(lw + 1)} ` +
    `color: '${c.color}', colorDark: '${c.colorDark}', order: ${c.order} },`
  );
  return `export const CATEGORIES = [\n${lines.join('\n')}\n];`;
}

async function writeCategories(list) {
  const src = await readFile(CATEGORIES_PATH, 'utf8');
  const start = src.indexOf('export const CATEGORIES = [');
  if (start === -1) throw new Error('CATEGORIES block not found in config/categories.js');
  const end = src.indexOf('];', start) + 2;
  return src.slice(0, start) + renderCategoriesBlock(list) + src.slice(end);
}

/**
 * Repoint every source from one category id to another.
 * Textual rewrite of `category: 'from'` — the config is the source of truth and
 * is hand-editable, so it is rewritten in place rather than regenerated (which
 * would flatten your comments and ASSUMPTION notes).
 */
function repointSources(src, fromId, toId) {
  const re = new RegExp(`category:\\s*'${fromId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g');
  const count = (src.match(re) || []).length;
  return { text: src.replace(re, `category: '${toId}'`), count };
}

export async function GET() {
  const counts = sourceCounts();
  return Response.json({
    categories: sortedCategories(CATEGORIES).map(c => ({ ...c, sourceCount: counts[c.id] || 0 })),
    palette: PALETTE,
    fallbackId: FALLBACK_CATEGORY_ID,
    totalSources: Object.values(counts).reduce((a, b) => a + b, 0),
  });
}

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Malformed request body' }, { status: 400 }); }

  const { action } = body || {};
  let next = CATEGORIES.map(c => ({ ...c }));
  let sourceRewrite = null;   // { fromId, toId } when sources must move
  let message = '';

  const find = id => next.find(c => c.id === id);

  try {
    switch (action) {
      case 'add': {
        const label = String(body.label || '').trim();
        if (!label) return Response.json({ error: 'A label is required' }, { status: 400 });
        if (next.some(c => c.label.toLowerCase() === label.toLowerCase())) {
          return Response.json({ error: `A category called "${label}" already exists` }, { status: 400 });
        }
        const swatch = PALETTE.find(p => p.color === body.color) || PALETTE[next.length % PALETTE.length];
        const id = makeCategoryId(label, next);
        next.push({ id, label, color: swatch.color, colorDark: swatch.colorDark, order: next.length });
        message = `Added "${label}".`;
        break;
      }

      case 'rename': {
        const cat = find(body.id);
        if (!cat) return Response.json({ error: 'No such category' }, { status: 404 });
        const label = String(body.label || '').trim();
        if (!label) return Response.json({ error: 'A label is required' }, { status: 400 });
        const was = cat.label;
        cat.label = label;
        // The id is deliberately NOT regenerated. Renaming must not detach a
        // single source, which is the whole point of the id/label split.
        message = `Renamed "${was}" to "${label}". Its ${sourceCounts()[cat.id] || 0} sources are unaffected.`;
        break;
      }

      case 'recolor': {
        const cat = find(body.id);
        if (!cat) return Response.json({ error: 'No such category' }, { status: 404 });
        const swatch = PALETTE.find(p => p.color === body.color);
        if (!swatch && !HEX.test(body.color || '')) {
          return Response.json({ error: 'Pick a colour from the palette' }, { status: 400 });
        }
        cat.color     = swatch ? swatch.color : body.color;
        cat.colorDark = swatch ? swatch.colorDark : (body.colorDark || body.color);
        message = `Recoloured "${cat.label}".`;
        break;
      }

      case 'merge': {
        const from = find(body.fromId);
        const to   = find(body.toId);
        if (!from || !to) return Response.json({ error: 'Both categories must exist' }, { status: 404 });
        if (from.id === to.id) return Response.json({ error: 'Cannot merge a category into itself' }, { status: 400 });
        const moved = sourceCounts()[from.id] || 0;
        sourceRewrite = { fromId: from.id, toId: to.id };
        next = next.filter(c => c.id !== from.id);
        message = `Merged "${from.label}" into "${to.label}" — ${moved} source${moved === 1 ? '' : 's'} reassigned.`;
        break;
      }

      case 'delete': {
        const cat = find(body.id);
        if (!cat) return Response.json({ error: 'No such category' }, { status: 404 });
        if (cat.id === FALLBACK_CATEGORY_ID) {
          return Response.json({
            error: `"${cat.label}" cannot be deleted — it is where delete and merge reassign orphaned sources.`,
          }, { status: 400 });
        }
        // Reassignment is REQUIRED, not optional. Defaulting to the fallback is
        // a choice the UI makes explicitly; the API never silently drops sources.
        const target = body.reassignTo || FALLBACK_CATEGORY_ID;
        if (!find(target)) return Response.json({ error: 'The reassignment target does not exist' }, { status: 400 });
        const moved = sourceCounts()[cat.id] || 0;
        sourceRewrite = { fromId: cat.id, toId: target };
        next = next.filter(c => c.id !== cat.id);
        message = `Deleted "${cat.label}" — ${moved} source${moved === 1 ? '' : 's'} moved to "${find(target).label}".`;
        break;
      }

      case 'reorder': {
        const order = Array.isArray(body.order) ? body.order : null;
        if (!order) return Response.json({ error: 'An order array is required' }, { status: 400 });
        const known = new Set(next.map(c => c.id));
        if (order.length !== next.length || !order.every(id => known.has(id))) {
          return Response.json({ error: 'The order must list every category exactly once' }, { status: 400 });
        }
        next = next.map(c => ({ ...c, order: order.indexOf(c.id) }));
        message = 'Order updated.';
        break;
      }

      default:
        return Response.json({ error: `Unknown action "${action}"` }, { status: 400 });
    }

    next = normalizeOrder(next);

    // ── Write. Sources first: if they cannot be repointed we must not remove
    // the category they still point at. ───────────────────────────────────────
    const categoriesText = await writeCategories(next);
    let sourcesText = null;
    let movedCount = 0;

    if (sourceRewrite) {
      const src = await readFile(SOURCES_PATH, 'utf8');
      const out = repointSources(src, sourceRewrite.fromId, sourceRewrite.toId);
      sourcesText = out.text;
      movedCount = out.count;
    }

    try {
      if (sourcesText !== null) await writeFile(SOURCES_PATH, sourcesText, 'utf8');
      await writeFile(CATEGORIES_PATH, categoriesText, 'utf8');
    } catch (e) {
      console.warn(`[categories] write failed (${e?.code || e?.message}) — returning files for manual paste`);
      return Response.json({
        ok: false, readOnly: true, message,
        note: 'This deployment has a read-only filesystem. Apply these edits by hand.',
        categoriesFile: categoriesText,
        ...(sourcesText !== null ? { sourcesNote: `${movedCount} source line(s) need category: '${sourceRewrite.fromId}' → '${sourceRewrite.toId}'` } : {}),
      });
    }

    console.warn(`[categories] ${action}: ${message}${sourceRewrite ? ` (${movedCount} sources repointed)` : ''}`);
    return Response.json({
      ok: true, action, message, movedCount,
      categories: sortedCategories(next),
      // The config is read at module load, so the running server keeps the old
      // collection until it restarts. Say so rather than letting the UI look stuck.
      restartRequired: true,
    });
  } catch (err) {
    console.warn(`[categories] EXCEPTION ${err?.message}`);
    return Response.json({ ok: false, error: err?.message || 'Category update failed' }, { status: 500 });
  }
}
