import type { NormalizedAttrs } from "./types";

export type Preset = { name: string; stats: NormalizedAttrs };

// Minimal sample presets per game (edit/expand as you like)
export const PRESETS: Record<string, Preset[]> = {
  DSR: [
    { name: "Warrior",   stats: { str: 13, dex: 13, int:  9, fth:  9 } },
    { name: "Knight",    stats: { str: 11, dex: 11, int:  9, fth: 11 } },
    { name: "Wanderer",  stats: { str: 10, dex: 14, int: 11, fth:  8 } },
    { name: "Thief",     stats: { str:  9, dex: 15, int: 12, fth: 11 } },
    { name: "Bandit",    stats: { str: 14, dex:  9, int:  8, fth: 10 } },
    { name: "Hunter",    stats: { str: 12, dex: 14, int:  9, fth:  9 } },
    { name: "Sorcerer",  stats: { str:  9, dex: 11, int: 15, fth:  8 } },
    { name: "Pyromancer",stats: { str: 12, dex:  9, int: 10, fth:  8 } },
    { name: "Cleric",    stats: { str: 12, dex:  8, int:  8, fth: 14 } },
    { name: "Deprived",  stats: { str: 11, dex: 11, int: 11, fth: 11 } },
  ],
  DS2: [
    { name: "Warrior",   label: "Warrior",   stats: { str: 15, dex: 11, int: 5,  fth: 5 } },
    { name: "Knight",    label: "Knight",    stats: { str: 11, dex: 8,  int: 3,  fth: 6 } },
    { name: "Swordsman", label: "Swordsman", stats: { str: 9,  dex: 16, int: 7,  fth: 5 } },
    { name: "Bandit",    label: "Bandit",    stats: { str: 9,  dex: 14, int: 1,  fth: 8 } },
    { name: "Cleric",    label: "Cleric",    stats: { str: 11, dex: 5,  int: 4,  fth: 12 } },
    { name: "Sorcerer",  label: "Sorcerer",  stats: { str: 3,  dex: 7,  int: 14, fth: 4 } },
    { name: "Explorer",  label: "Explorer",  stats: { str: 6,  dex: 6,  int: 5,  fth: 5 } },
    { name: "Deprived",  label: "Deprived",  stats: { str: 6,  dex: 6,  int: 6,  fth: 6 } },
  ],
  DS3: [
    { name: "Knight",     label: "Knight",     stats: { str: 13, dex: 12, int: 9,  fth: 9 } },
    { name: "Mercenary",  label: "Mercenary",  stats: { str: 10, dex: 16, int: 10, fth: 8 } },
    { name: "Warrior",    label: "Warrior",    stats: { str: 16, dex: 9,  int: 8,  fth: 9 } },
    { name: "Herald",     label: "Herald",     stats: { str: 12, dex: 11, int: 8,  fth: 13 } },
    { name: "Thief",      label: "Thief",      stats: { str: 9,  dex: 13, int: 10, fth: 8 } },
    { name: "Assassin",   label: "Assassin",   stats: { str: 10, dex: 14, int: 11, fth: 9 } },
    { name: "Sorcerer",   label: "Sorcerer",   stats: { str: 7,  dex: 12, int: 16, fth: 7 } },
    { name: "Pyromancer", label: "Pyromancer", stats: { str: 12, dex: 9,  int: 14, fth: 14 } },
    { name: "Cleric",     label: "Cleric",     stats: { str: 12, dex: 8,  int: 7,  fth: 16 } },
    { name: "Deprived",   label: "Deprived",   stats: { str: 10, dex: 10, int: 10, fth: 10 } },
  ],
  BB:  [
    { name: "Milquetoast",       stats: { str: 12, skl: 10, bld:  9, arc:  8 } },
    { name: "Lone Survivor",     stats: { str: 11, skl: 10, bld:  7, arc:  7 } },
    { name: "Troubled Childhood",stats: { str:  9, skl: 13, bld:  6, arc:  9 } },
    { name: "Violent Past",      stats: { str: 15, skl:  9, bld:  6, arc:  7 } },
    { name: "Professional",      stats: { str:  9, skl: 15, bld:  7, arc:  8 } },
    { name: "Military Veteran",  stats: { str: 14, skl: 13, bld:  7, arc:  6 } },
    { name: "Noble Scion",       stats: { str:  9, skl: 13, bld: 14, arc:  9 } },
    { name: "Cruel Fate",        stats: { str: 10, skl:  9, bld:  5, arc: 14 } },
    { name: "Waste of Skin",     stats: { str: 10, skl:  9, bld:  7, arc:  9 } },
  ],
  // in src/games/presets.ts -> inside PRESETS
  ER: [
    { name: "Vagabond",   stats: { str: 14, dex: 13, int:  9, fth:  9, arc:  7 } },
    { name: "Warrior",    stats: { str: 10, dex: 16, int: 10, fth:  8, arc:  9 } },
    { name: "Hero",       stats: { str: 16, dex:  9, int:  7, fth:  8, arc: 11 } },
    { name: "Bandit",     stats: { str:  9, dex: 13, int:  9, fth:  8, arc: 14 } },
    { name: "Astrologer", stats: { str:  8, dex: 12, int: 16, fth:  7, arc:  9 } },
    { name: "Prophet",    stats: { str: 11, dex: 10, int:  7, fth: 16, arc: 10 } },
    { name: "Samurai",    stats: { str: 12, dex: 15, int:  9, fth:  8, arc:  8 } },
    { name: "Prisoner",   stats: { str: 11, dex: 14, int: 14, fth:  6, arc:  9 } },
    { name: "Confessor",  stats: { str: 12, dex: 12, int:  9, fth: 14, arc:  9 } },
    { name: "Wretch",     stats: { str: 10, dex: 10, int: 10, fth: 10, arc: 10 } },
  ],

};
