// scripts/hydrate-ds2-reqs.mjs
// Node 18+ (global fetch). Reads src/data/ds2.json, fills in proper reqs by scraping
// each page's "Required Attributes" block on darksouls.fandom.com, then writes back.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const IN_PATH  = path.resolve(__dirname, "../src/data/ds2.json");
const OUT_PATH = IN_PATH;

const BASE = "https://darksouls.fandom.com/api.php";
const HEADERS = {
  "User-Agent": "SoulsReq/1.0 (DS2 req hydrator; contact: local dev)",
  "Accept": "application/json"
};

// --- tiny helpers -----------------------------------------------------------

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function cleanName(name) {
  // strip stray “icon …” or double-spaces, trim
  return String(name).replace(/\s*icon.*$/i, "").replace(/\s+/g, " ").trim();
}

function titleCandidates(name) {
  const base = cleanName(name);
  // Most pages are "Weapon Name (Dark Souls II)"
  // Try a few safe fallbacks (some pages drop the suffix or have DS II in the title already)
  return [
    `${base} (Dark Souls II)`,
    base
  ];
}

function dashToZero(s) {
  const n = Number(String(s).replace(/[^\d-]/g, ""));
  return isNaN(n) ? 0 : Math.max(0, n);
}

// Very forgiving HTML parser: finds the "Required Attributes" label and
// then captures four numbers/dashes that follow (STR, DEX, INT, FTH).
function parseReqFromHTML(html) {
  if (!html) return null;

  // Normalize whitespace and strip tags where helpful
  const textish = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?(?:span|div|p|td|th|tr|table|a|b|i|u|strong|em|img)[^>]*>/gi, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Common label on DS2 pages:
  // "... Required Attributes ... 20 11 - - ..."
  const re = /Required Attributes(?:[^0-9\-]+)(-?\d+|-)\s+(-?\d+|-)\s+(-?\d+|-)\s+(-?\d+|-)/i;
  const m = textish.match(re);
  if (!m) return null;

  const [ , s, d, i, f ] = m;
  return {
    str: dashToZero(s),
    dex: dashToZero(d),
    int: dashToZero(i),
    fth: dashToZero(f),
  };
}

async function fandomParseHTML(title) {
  const url = new URL(BASE);
  url.searchParams.set("action", "parse");
  url.searchParams.set("prop", "text");
  url.searchParams.set("page", title);
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("origin", "*"); // harmless in Node

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) {
      const j = await res.json();
      // Some wikis return { text: "<div class='mw-parser-output'>..." }
      const html = j?.parse?.text;
      if (typeof html === "string" && html.length > 0) return html;
    }
    // backoff on errors
    await sleep(400 * attempt);
  }
  return null;
}

// Resolve a page and extract requirements
async function fetchReqForName(name) {
  const candidates = titleCandidates(name);
  for (const t of candidates) {
    const html = await fandomParseHTML(t);
    if (!html) continue;
    const req = parseReqFromHTML(html);
    if (req) return { title: t, req };
  }
  // Fallback: simple search query (last resort)
  const q = `${cleanName(name)} (Dark Souls II)`;
  const searchUrl = new URL(BASE);
  searchUrl.searchParams.set("action", "query");
  searchUrl.searchParams.set("list", "search");
  searchUrl.searchParams.set("srsearch", q);
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("formatversion", "2");
  searchUrl.searchParams.set("origin", "*");

  try {
    const r = await fetch(searchUrl, { headers: HEADERS });
    if (r.ok) {
      const j = await r.json();
      const hit = j?.query?.search?.[0]?.title;
      if (hit) {
        const html = await fandomParseHTML(hit);
        const req = parseReqFromHTML(html);
        if (req) return { title: hit, req };
      }
    }
  } catch {}
  return null;
}

// Concurrency limiter without deps
async function mapLimit(items, limit, fn) {
  const ret = [];
  let i = 0, active = 0, done = 0;
  return await new Promise((resolve, reject) => {
    const next = () => {
      if (done === items.length) return resolve(ret);
      while (active < limit && i < items.length) {
        const idx = i++;
        active++;
        fn(items[idx], idx)
          .then((v) => { ret[idx] = v; })
          .catch(reject)
          .finally(() => { active--; done++; next(); });
      }
    };
    next();
  });
}

async function main() {
  const buf = await fs.readFile(IN_PATH, "utf-8");
  const data = JSON.parse(buf);

  let needs = data.filter(
    it => !it.req || Object.values(it.req).every(v => v === 0)
  );

  console.log(`Loaded ${data.length} DS2 entries. To hydrate: ${needs.length}.`);

  // Be polite; concurrency 3 is usually fine for Fandom
  const results = await mapLimit(needs, 3, async (item, idx) => {
    // small jitter to avoid burst
    await sleep(150 * (idx % 5));
    const found = await fetchReqForName(item.name);
    if (!found) {
      console.log(`  … no reqs for "${item.name}"`);
      return null;
    }
    console.log(`  ✓ ${item.name} ← ${found.title}  [${found.req.str}/${found.req.dex}/${found.req.int}/${found.req.fth}]`);
    return { name: item.name, req: found.req };
  });

  const updates = new Map();
  for (const r of results) if (r) updates.set(r.name, r.req);

  let updated = 0;
  for (const it of data) {
    const u = updates.get(it.name);
    if (u) {
      it.req = u;
      updated++;
    }
  }

  await fs.writeFile(OUT_PATH, JSON.stringify(data, null, 2), "utf-8");
  console.log(`Updated ${updated} items → ${path.relative(process.cwd(), OUT_PATH)}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
