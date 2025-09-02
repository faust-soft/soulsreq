import type { GameAdapter, NormalizedWeapon } from "./types";
import dsrData from "../data/dsr.json";


const pick = (o: any, k: string) => o?.[k] ?? 0;

/**
 * Robust JSON loader for Vite:
 * - Eagerly imports every JSON in ../data
 * - Works without async/await quirks
 * - Avoids TS/resolveJsonModule edge cases on Windows
 */
const dataModules = import.meta.glob("../data/*.json", { eager: true });

function loadJsonFile(basename: string): any[] {
  const key = `../data/${basename}.json`;
  const mod = dataModules[key] as any;
  // Vite JSON modules expose `default`
  return (mod?.default ?? mod) as any[]; 
}

export const GAMES: GameAdapter[] = [
 {
   id: "DSR",
   label: "Dark Souls Remastered",
   attrs: ["str", "dex", "int", "fth"],
   twoHand: { affected: "str", multiplier: 1.5, rounding: "floor" },
   attrLabels: { str: "STR", dex: "DEX", int: "INT", fth: "FTH" },
   normalize: (w: any): NormalizedWeapon => ({
     id: String(w.id ?? w.name),
     name: w.name,
     // ✅ use your "type" as the category / class
     category: w.type ?? w.category ?? "Weapon",
     // ✅ use your "req" object and map fai -> fth
     requirements: {
       str: (w.req?.str ?? 0),
       dex: (w.req?.dex ?? 0),
       int: (w.req?.int ?? 0),
       fth: (w.req?.fth ?? w.req?.fai ?? 0),
     },
    // ✅ honor per-weapon two-hand rule (true/false)
    twoHandAllowed: w.twoHandRule !== false, 
  }),
  loadData: async () => loadJsonFile("dsr"),
 },


  {
    id: "DS2",
    label: "Dark Souls II",
    attrs: ["str", "dex", "int", "fth"],
    twoHand: { affected: "str", multiplier: 1.5, rounding: "floor" },
    attrLabels: { str: "STR", dex: "DEX", int: "INT", fth: "FTH" },
    normalize: (w: any) => ({
      id: String(w.id ?? w.name),
      name: w.name,
      category: w.category ?? "Weapon",
      requirements: {
        str: pick(w.req ?? w.requirements, "str") || pick(w, "strength"),
        dex: pick(w.req ?? w.requirements, "dex") || pick(w, "dexterity"),
        int: pick(w.req ?? w.requirements, "int") || pick(w, "intelligence"),
        fth: pick(w.req ?? w.requirements, "fth") || pick(w, "faith"),
      },
    }),
    loadData: async () => loadJsonFile("ds2"),
  },
  {
    id: "DS3",
    label: "Dark Souls III",
    attrs: ["str", "dex", "int", "fth"],
    twoHand: { affected: "str", multiplier: 1.5, rounding: "floor" },
    attrLabels: { str: "STR", dex: "DEX", int: "INT", fth: "FTH" },
    normalize: (w: any) => ({
      id: String(w.id ?? w.name),
      name: w.name,
      category: w.category ?? "Weapon",
      requirements: {
        str: pick(w.req, "str"),
        dex: pick(w.req, "dex"),
        int: pick(w.req, "int"),
        fth: pick(w.req, "fth"),
      },
    }),
    loadData: async () => loadJsonFile("ds3"),
  },
  {
    id: "BB",
    label: "Bloodborne",
    attrs: ["str", "skl", "bld", "arc"],
    twoHand: { affected: "str", multiplier: 1.0, rounding: "floor" }, // no 1.5× rule
    attrLabels: { str: "Strength", skl: "Skill", bld: "Bloodtinge", arc: "Arcane" },
    normalize: (w: any) => ({
      id: String(w.id ?? w.name),
      name: w.name,
      category: w.category ?? "Trick Weapon",
      requirements: {
        str: pick(w.req, "str") || pick(w.req, "strength"),
        skl: pick(w.req, "skl") || pick(w.req, "skill"),
        bld: pick(w.req, "bld") || pick(w.req, "bloodtinge"),
        arc: pick(w.req, "arc") || pick(w.req, "arcane"),
      },
    }),
    loadData: async () => loadJsonFile("bloodborne"),
  },
  {
    id: "ER",
    label: "Elden Ring",
    attrs: ["str", "dex", "int", "fth", "arc"],
    twoHand: { affected: "str", multiplier: 1.5, rounding: "floor" },
    attrLabels: { str: "STR", dex: "DEX", int: "INT", fth: "FAI", arc: "ARC" },
    normalize: (w: any) => ({
      id: String(w.id ?? w.name),
      name: w.name,
      category: w.category ?? "Weapon",
      requirements: {
        str: pick(w.requirements ?? w.req, "str"),
        dex: pick(w.requirements ?? w.req, "dex"),
        int: pick(w.requirements ?? w.req, "int"),
        fth: pick(w.requirements ?? w.req, "fth"),
        arc: pick(w.requirements ?? w.req, "arc"),
      },
    }),
    loadData: async () => loadJsonFile("eldenring"),
  },
];

export const GAME_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g]));
