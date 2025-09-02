import type { GameAdapter, NormalizedAttrs, NormalizedWeapon } from "./types";


export type Usability = "1H" | "2H" | "NO";

function twoval(v:number,m:number,r:"floor"|"round"|"ceil"){
  const x=v*m; 
  return r==="floor" ? Math.floor(x) : r==="ceil" ? Math.ceil(x) : Math.round(x);
}

export function checkUsability(
  w: NormalizedWeapon,
  p: NormalizedAttrs,
  g: GameAdapter
): Usability {
  const meets=(attrs:NormalizedAttrs)=>
    Object.entries(w.requirements).every(([k,req]) =>
      (attrs[k as keyof NormalizedAttrs] ?? 0) >= (req ?? 0)
    );

  if (meets(p)) return "1H";

  const boosted={...p};
  if (g.twoHand.multiplier!==1){
    const base=p[g.twoHand.affected] ?? 0;
    boosted[g.twoHand.affected]=twoval(base,g.twoHand.multiplier,g.twoHand.rounding);
  }

  return meets(boosted) ? "2H" : "NO";
}
