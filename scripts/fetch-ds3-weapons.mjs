// scripts/fetch-ds3-from-data-table.mjs
// Node 18+. Produces src/data/ds3.json by parsing the DS3 "Data Table" printable page.
// Handles multi-row headers: "Stat Requirements" group -> subheaders S/D/I/F.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT = path.resolve(__dirname, "../src/data/ds3.json");

const URL = "https://darksouls3.wikidot.com/data-table?do=printable";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SoulsReq/1.0 (+local) NodeFetch";

const toInt = (s) => {
  const n = parseInt(String(s ?? "").replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};
const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": UA,
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function pickDataTable($) {
  // Choose the first table that contains a header cell with "Stat Requirements"
  const tables = $("table").toArray();
  for (const el of tables) {
    const $t = $(el);
    const txt = $t.find("th").text();
    if (/stat\s+requirements/i.test(txt)) return $t;
  }
  return null;
}

// Build a flattened header map handling multi-row headers.
// We specifically need indices for: Name, Category (or Weapon/Shield Type), and S/D/I/F under Stat Requirements.
function buildHeaderMap($table, $) {
  const rows = $table.find("tr").toArray();

  // Find the header block (consecutive rows that contain THs)
  const headerRows = [];
  for (const tr of rows) {
    const hasTH = $(tr).find("th").length > 0;
    const hasTD = $(tr).find("td").length > 0;
    if (hasTH && !hasTD) {
      headerRows.push(tr);
    } else if (headerRows.length) {
      break; // stop at first non-header row after headers
    }
  }
  if (!headerRows.length) throw new Error("No header rows found");

  // Extract header cell texts row by row, expanding colspans with simple fill
  const headerGrid = [];
  let maxCols = 0;

  for (const tr of headerRows) {
    const cells = [];
    $(tr)
      .children("th")
      .each((_, th) => {
        const $th = $(th);
        const text =
          $th.attr("title") ||
          $th.attr("data-tooltip") ||
          $th.text() ||
          "";
        const label = text.replace(/\s+/g, " ").trim();
        const colspan = parseInt($th.attr("colspan") || "1", 10) || 1;
        for (let i = 0; i < colspan; i++) cells.push(label);
      });
    headerGrid.push(cells);
    maxCols = Math.max(maxCols, cells.length);
  }

  // Normalize rows to the same number of columns
  for (const row of headerGrid) {
    while (row.length < maxCols) row.push("");
  }

  // Flatten: propagate group names downward (e.g., "Stat Requirements" + ["S","D","I","F"])
  const flat = new Array(maxCols).fill("");
  for (let col = 0; col < maxCols; col++) {
    const path = [];
    for (let r = 0; r < headerGrid.length; r++) {
      const val = headerGrid[r][col]?.trim();
      if (val) path.push(val);
    }
    flat[col] = path.join(" / "); // e.g., "Stat Requirements / S"
  }

  // Locate indices
  const findIdx = (preds) =>
    flat.findIndex((h) => preds.some((p) => p.test(h)));

  const nameIdx = findIdx([/^\s*name\s*$/i, /\bitem\b/i, /\bweapon\b/i, /\bshield\b/i]);
  const catIdx = findIdx([
    /\bcategory\b/i,
    /\bweapon\s*type\b/i,
    /\bshield\s*type\b/i,
    /^\s*type\s*$/i,
    /\bclass\b/i,
  ]);

  // Within Stat Requirements group
  const sIdx = findIdx([/stat requirements\s*\/\s*s\b/i, /\bstrength\b/i, /\bstr\b/i, /\s\/ s$/i]);
  const dIdx = findIdx([/stat requirements\s*\/\s*d\b/i, /\bdexterity\b/i, /\bdex\b/i, /\s\/ d$/i]);
  const iIdx = findIdx([/stat requirements\s*\/\s*i\b/i, /\bintelligence\b/i, /\bint\b/i, /\s\/ i$/i]);
  const fIdx = findIdx([
    /stat requirements\s*\/\s*f\b/i,
    /\bfaith\b/i,
    /\bfth\b/i,
    /\bfai\b/i,
    /\s\/ f$/i,
  ]);

  // Fallback: sometimes subheaders are not joined with group name
  const fallback = () => {
    const s = flat.findIndex((h) => /^\s*s\s*$/i.test(h) || /\bstr\b/i.test(h));
    const d = flat.findIndex((h) => /^\s*d\s*$/i.test(h) || /\bdex\b/i.test(h));
    const i = flat.findIndex((h) => /^\s*i\s*$/i.test(h) || /\bint\b/i.test(h));
    const f = flat.findIndex((h) => /^\s*f\s*$/i.test(h) || /\b(fth|fai|faith)\b/i.test(h));
    return { s, d, i, f };
  };
  let req = { s: sIdx, d: dIdx, i: iIdx, f: fIdx };
  if ([sIdx, dIdx, iIdx, fIdx].some((x) => x === -1)) req = fallback();

  if (nameIdx === -1 || req.s === -1 || req.d === -1 || req.i === -1 || req.f === -1) {
    throw new Error(
      `Header mapping failed. Got: name=${nameIdx}, cat=${catIdx}, S=${req.s}, D=${req.d}, I=${req.i}, F=${req.f}`
    );
  }

  return { nameIdx, catIdx, reqIdx: req, colCount: maxCols, headerRows: headerRows.length };
}

function parseRows($table, headerMeta, $) {
  const out = [];
  const trs = $table.find("tr").toArray();

  // Skip headerRows at the top
  for (let r = headerMeta.headerRows; r < trs.length; r++) {
    const tr = trs[r];
    const $tds = $(tr).children("td");
    if ($tds.length === 0) continue;

    // Build a simple, expanded row (respect colspans)
    const cells = [];
    $tds.each((_, td) => {
      const $td = $(td);
      const txt = ($td.text() || "").replace(/\s*\[[^\]]+\]\s*$/, "").trim();
      const colspan = parseInt($td.attr("colspan") || "1", 10) || 1;
      for (let i = 0; i < colspan; i++) cells.push(txt);
    });

    const get = (i) => (i >= 0 && i < cells.length ? cells[i] : "");

    const name = get(headerMeta.nameIdx);
    if (!name) continue;

    const category =
      headerMeta.catIdx !== -1 ? get(headerMeta.catIdx) : "Weapon";

    const req = {
      str: toInt(get(headerMeta.reqIdx.s)),
      dex: toInt(get(headerMeta.reqIdx.d)),
      int: toInt(get(headerMeta.reqIdx.i)),
      fth: toInt(get(headerMeta.reqIdx.f)),
    };

    out.push({
      name,
      category,
      // Your DS3 adapter accepts either `req` or `requirements`; keep `req` here.
      req,
      twoHandRule: true, // DS3 1.5× STR two-hand rule
    });
  }
  return out;
}

(async () => {
  console.log("Fetching DS3 Data Table…");
  const html = await fetchHtml(URL);
  const $ = cheerio.load(html);

  const $table = pickDataTable($);
  if (!$table) throw new Error("Could not fi
