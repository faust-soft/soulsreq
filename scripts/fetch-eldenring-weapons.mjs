// scripts/fetch-eldenring-weapons.mjs
// Node 18+ (global fetch). Produces src/data/eldenring.json

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_PATH = path.resolve(__dirname, "../src/data/eldenring.json");

// Fan API endpoints
const BASE_WEAPONS = "https://eldenring.fanapis.com/api/weapons";
const BASE_SHIELDS = "https://eldenring.fanapis.com/api/shields";
const LIMIT = 100;

// Map Fan API `requiredAttributes` -> our short keys
function toRequirements(requiredAttributes) {
  const req = { str: 0, dex: 0, int: 0, fth: 0, arc: 0 };
  for (const r of requiredAttributes || []) {
    const k = String(r.name || "").toLowerCase();
    const v = Number(r.amount) || 0;
    if (k.startsWith("str")) req.str = v;
    else if (k.startsWith("dex")) req.dex = v;
    else if (k.startsWith("int")) req.int = v;
    else if (k.startsWith("fai")) req.fth = v;   // "Faith" → fth
    else if (k.startsWith("arc")) req.arc = v;
  }
  return req;
}

function normalize(item, fallbackCategory) {
  return {
    id: item.id,
    name: item.name,
    category: item.category || fallbackCategory,
    requirements: toRequirements(item.requiredAttributes),
  };
}

async function fetchPaged(baseUrl) {
  let page = 0;
  const all = [];
  for (;;) {
    const url = `${baseUrl}?limit=${LIMIT}&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const json = await res.json();
    const data = json?.data || [];
    all.push(...data);
    if (data.length < LIMIT) break;
    page += 1;
  }
  return all;
}

(async () => {
  // 1) pull both datasets in parallel
  const [weapRaw, shldRaw] = await Promise.all([
    fetchPaged(BASE_WEAPONS),
    fetchPaged(BASE_SHIELDS),
  ]);

  // 2) normalize & merge
  const weapons = weapRaw.map((it) => normalize(it, "Weapon"));
  const shields = shldRaw.map((it) => normalize(it, "Shield"));
  const merged = [...weapons, ...shields];

  // 3) de-dupe (by name + category, just in case)
  const seen = new Set();
  const unique = [];
  for (const it of merged) {
    if (!it?.name) continue;
    const key = `${it.name}::${it.category}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(it);
  }

  // 4) optional tidy sort (category -> name)
  unique.sort((a, b) => {
    const c = String(a.category || "").localeCompare(String(b.category || ""));
    if (c !== 0) return c;
    return String(a.name).localeCompare(String(b.name));
  });

  // 5) write file
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(unique, null, 2), "utf-8");

  console.log(
    `Wrote ${unique.length} armaments (weapons + shields) → ${OUT_PATH}`
  );
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
