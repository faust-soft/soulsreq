import type { GameAdapter, NormalizedAttrs, NormalizedWeapon } from "./types";

export type Usability = "1H" | "2H" | "NO";

function twoval(v: number, m: number, r: "floor" | "round" | "ceil") {
  const x = v * m;
  return r === "floor" ? Math.floor(x) : r === "ceil" ? Math.ceil(x) : Math.round(x);
}

export function checkUsability(
  w: NormalizedWeapon,
  p: NormalizedAttrs,
  g: GameAdapter
): Usability {
  const req = w.requirements ?? {};

  const meets = (attrs: NormalizedAttrs) =>
    Object.entries(req).every(([k, need]) => (attrs[k as keyof NormalizedAttrs] ?? 0) >= (need ?? 0));

  // One-hand check: must meet all requirements as-is
  if (meets(p)) return "1H";

  // Two-hand rule may be disabled per-weapon or per-game (multiplier === 1)
  const allowsTwoHand = w.twoHandRule !== false && g.twoHand.multiplier !== 1;
  if (!allowsTwoHand) return "NO";

  // Apply two-hand boost only to the affected attribute (STR in all current games)
  const affected = g.twoHand.affected as keyof NormalizedAttrs;
  const base = p[affected] ?? 0;

  const boosted: NormalizedAttrs = {
    ...p,
    [affected]: twoval(base, g.twoHand.multiplier, g.twoHand.rounding),
  };

  return meets(boosted) ? "2H" : "NO";
}
