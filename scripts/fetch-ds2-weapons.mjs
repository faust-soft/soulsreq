// Node 18+
// End-to-end DS2: SOTFS fetcher that outputs src/data/ds2.json
// - Enumerates DS2 weapon + shield categories via Fandom API
// - For each page: extract requirements from WIKITEXT (preferred) or HTML fallback
// - Writes a single "requirements" block (no stray "req" field)

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const OUT_PATH = path.resolve(__dirname, "../src/data/ds2.json");
const API = "https://darksouls.fandom.com/api.php";

const DS2_CATS = [
  "Dark Souls II: Daggers",
  "Dark Souls II: Straight Swords",
  "Dark Souls II: Greatswords",
  "Dark Souls II: Ultra Greatswords",
  "Dark Souls II: Curved Swords",
  "Dark Souls II: Curved Greatswords",
  "Dark Souls II: Katanas",
  "Dark Souls II: Thrusting Swords",
  "Dark Souls II: Axes",
  "Dark Souls II: Greataxes",
  "Dark Souls II: Hammers",
  "Dark Souls II: Great Hammers",
  "Dark Souls II: Spears",
  "Dark Souls II: Lances",
  "Dark Souls II: Halberds",
  "Dark Souls II: Reapers",
  "Dark Souls II: Fist Weapons",
  "Dark Souls II: Claws",
  "Dark Souls II: Whips",
  "Dark Souls II: Bows",
  "Dark Souls II: Greatbows",
  "Dark Souls II: Crossbows",
  // Shields (include in same JSON)
  "Dark Souls II: Small Shields",
  "Dark Souls II: Medium Shields",
  "Dark Souls II: Greatshields",
];

// Normalize category names for display
function displayCategoryFor(catTitle) {
  const raw = catTitle.replace("Dark Souls II: ", "");
  const tweaks = {
    "Great Hammers": "Great Hammer",
    "Fist Weapons": "Fist",
    "Greatbows": "Greatbow",
    "Greataxes": "Greataxe",
    "Curved Greatswords": "Curved Greatsword",
    "Thrusting Swords": "Thrusting Sword",
    "Straight Swords": "Straight Sword",
    "Small Shields": "Small Shield",
    "Medium Shields": "Standard Shield",
  };
  return tweaks[raw] || raw;
}

const UA = { "User-Agent": "SoulsReq/1.0 (DS2 fetcher; local dev)" };

async function api(params) {
  const url = new URL(API);
  for (const [k, v] of Object.entries({
    format: "json",
    formatversion: "2",
    origin: "*",
    ...params,
  })) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function listPagesInCategory(catTitle) {
  const titles = [];
  let cmtoken = undefined;
  while (true) {
    const json = await api({
      action: "query",
      list: "categorymembers",
      cmtitle: `Category:${catTitle}`,
      cmlimit: "500",
      cmtype: "page",
      ...(cmtoken ? { cmcontinue: cmtoken } : {}),
    });
    const items = json?.query?.categorymembers ?? [];
    for (const it of items) titles.push(it.title);
    cmtoken = json?.continue?.cmcontinue;
    if (!cmtoken) break;
  }
  return titles;
}

async function fetchPageWikitext(title) {
  const json = await api({ action: "parse", page: title, prop: "wikitext", redirects: "1" });
  return json?.parse?.wikitext ?? "";
}
async function fetchPageHTML(title) {
  const json = await api({ action: "parse", page: title, prop: "text", redirects: "1" });
  return json?.parse?.text ?? "";
}

const num = (s) => {
  const m = String(s ?? "").replace(/,/g, "").match(/-?\d+/);
  return m ? Number(m[0]) : 0;
};

// -------- WIKITEXT extractor (preferred) -----------------------------------
function extractReqFromWikitext(wt) {
  const req = { str: 0, dex: 0, int: 0, fth: 0 };
  if (!wt) return req;
  const text = String(wt);

  // | str = 12  (or | strength = 12)
  const param = (names) => {
    const re = new RegExp(`\\|\\s*(?:${names.join("|")})\\s*=\\s*([^\\n|]+)`, "i");
    const m = text.match(re);
    return m ? num(m[1]) : 0;
  };
  req.str = Math.max(req.str, param(["strength", "str"]));
  req.dex = Math.max(req.dex, param(["dexterity", "dex"]));
  req.int = Math.max(req.int, param(["intelligence", "int", "magic"]));
  req.fth = Math.max(req.fth, param(["faith", "fth", "fai"]));

  // Combined: | requirements = STR 12 DEX 10 INT 0 FAI 0
  if (!req.str && !req.dex && !req.int && !req.fth) {
    const m = text.match(/\|\s*require\w*\s*=\s*([^\n]+)/i);
    if (m) {
      const line = m[1];
      const pick = (re) => {
        const mm = line.match(re);
        return mm ? num(mm[1] ?? mm[0]) : 0;
      };
      req.str = pick(/str[^0-9]*([0-9]+)/i);
      req.dex = pick(/dex[^0-9]*([0-9]+)/i);
      req.int = pick(/int(?:elligence)?[^0-9]*([0-9]+)/i);
      req.fth = pick(/(?:fth|fai|faith)[^0-9]*([0-9]+)/i);
    }
  }
  return req;
}

// -------- HTML extractor (fallbacks) ---------------------------------------
function extractReqFromInfobox($) {
  const req = { str: 0, dex: 0, int: 0, fth: 0 };
  const $ibox = $("aside.portable-infobox");
  if ($ibox.length === 0) return req;

  // Explicit rows
  $ibox.find(".pi-data").each((_, el) => {
    const label = $(el).find(".pi-data-label").text().trim();
    const value = $(el).find(".pi-data-value").text().trim();
    if (/strength/i.test(label)) req.str = Math.max(req.str, num(value));
    else if (/dexterity/i.test(label)) req.dex = Math.max(req.dex, num(value));
    else if (/intelligence|magic\b/i.test(label)) req.int = Math.max(req.int, num(value));
    else if (/faith|lightning\b/i.test(label)) req.fth = Math.max(req.fth, num(value));
  });

  // Combined "Requirements" row
  if (!req.str && !req.dex && !req.int && !req.fth) {
    $ibox.find(".pi-data").each((_, el) => {
      const label = $(el).find(".pi-data-label").text().trim();
      if (!/require/i.test(label)) return;
      const text = $(el).find(".pi-data-value").text();
      const pick = (re) => {
        const m = String(text).match(re);
        return m ? num(m[1] ?? m[0]) : 0;
      };
      req.str = pick(/str[^0-9]*([0-9]+)/i);
      req.dex = pick(/dex[^0-9]*([0-9]+)/i);
      req.int = pick(/int(?:elligence)?[^0-9]*([0-9]+)/i);
      req.fth = pick(/(?:fth|fai|faith)[^0-9]*([0-9]+)/i);
    });
  }

  // data-source fallbacks (if present)
  if (!req.str) req.str = num($('.pi-data[data-source="str"] .pi-data-value').first().text());
  if (!req.dex) req.dex = num($('.pi-data[data-source="dex"] .pi-data-value').first().text());
  if (!req.int) req.int = num($('.pi-data[data-source="int"], .pi-data[data-source="intelligence"], .pi-data[data-source="magic"] .pi-data-value').first().text());
  if (!req.fth) req.fth = num($('.pi-data[data-source="fth"], .pi-data[data-source="fai"], .pi-data[data-source="faith"] .pi-data-value').first().text());

  return req;
}

// Very forgiving fallback for pages that show "Required Attributes" as body text/table.
function extractReqFromBodyHTML(html) {
  const text = String(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?(?:span|div|p|td|th|tr|table|a|b|i|u|strong|em|img|ul|li)[^>]*>/gi, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const m = text.match(/Required Attributes(?:[^0-9\-]+)(-?\d+|-)\s+(-?\d+|-)\s+(-?\d+|-)\s+(-?\d+|-)/i);
  if (!m) return { str: 0, dex: 0, int: 0, fth: 0 };
  const dashToZero = (s) => {
    const n = Number(String(s).replace(/[^\d-]/g, ""));
    return isNaN(n) ? 0 : Math.max(0, n);
  };
  const [, s, d, i, f] = m;
  return { str: dashToZero(s), dex: dashToZero(d), int: dashToZero(i), fth: dashToZero(f) };
}

function hasNonZero(r) {
  return (r?.str|0) || (r?.dex|0) || (r?.int|0) || (r?.fth|0);
}

function isWeaponLike($) {
  const title = $("aside.portable-infobox .pi-title").text().toLowerCase();
  return /(weapon|shield|sword|axe|bow|staff|chime|spear|katana|halberd|lance|mace|hammer|whip|claw|fist)/i.test(title)
      || $("aside.portable-infobox:contains('Attack Type'), aside.portable-infobox:contains('Parry')").length > 0;
}

async function scrapeTitle(title, categoryLabel) {
  // Prefer WIKITEXT (cleanest)
  let req = { str: 0, dex: 0, int: 0, fth: 0 };
  try {
    const wt = await fetchPageWikitext(title);
    req = extractReqFromWikitext(wt);
  } catch { /* ignore */ }

  // Fallback: HTML (infobox)
  let name = title;
  if (!hasNonZero(req)) {
    const html = await fetchPageHTML(title);
    if (html) {
      const $ = load(html);
      if (!isWeaponLike($)) return null;
      // Prefer H1 text if available
      const h1 = $("h1").first().text().trim();
      if (h1) name = h1;
      const inf = extractReqFromInfobox($);
      req = hasNonZero(inf) ? inf : extractReqFromBodyHTML(html);
    }
  } else {
    // We still prefer a nice display name from HTML if possible
    try {
      const html = await fetchPageHTML(title);
      if (html) {
        const $ = load(html);
        const h1 = $("h1").first().text().trim();
        if (h1) name = h1;
      }
    } catch {}
  }

  if (!hasNonZero(req)) return null;

  return {
    id: name,
    name,
    category: categoryLabel,
    requirements: {
      str: req.str|0, dex: req.dex|0, int: req.int|0, fth: req.fth|0
    }
  };
}

// Tiny delay to be nice to the API
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const out = [];
  for (const cat of DS2_CATS) {
    const label = displayCategoryFor(cat);
    console.log(`Category: ${label}`);
    const titles = await listPagesInCategory(cat);

    for (let i = 0; i < titles.length; i++) {
      const t = titles[i];
      try {
        const item = await scrapeTitle(t, label);
        if (item) {
          out.push(item);
          console.log(`  ✓ ${item.name} [${item.requirements.str}/${item.requirements.dex}/${item.requirements.int}/${item.requirements.fth}]`);
        } else {
          console.log(`  … skipped ${t} (no reqs found)`);
        }
      } catch (e) {
        console.warn(`  ! Failed ${t}: ${e.message}`);
      }
      // light pacing to avoid rate limiting
      if (i % 5 === 4) await sleep(200);
    }
  }

  // Stable sort
  out.sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.name.localeCompare(b.name));

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(out, null, 2), "utf-8");
  console.log(`Wrote ${out.length} DS2 items → ${OUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
