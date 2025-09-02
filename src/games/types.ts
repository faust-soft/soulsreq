// Shared core attribute keys across games
export type CoreAttr = "str" | "dex" | "int" | "fth" | "arc" | "skl" | "bld";

// App-wide game id union
export type GameId = "DSR" | "DS2" | "DS3" | "BB" | "ER";

// Player/req attributes map (subset depending on game)
export type NormalizedAttrs = Partial<Record<CoreAttr, number>>;

export interface NormalizedWeapon {
  id: string;
  name: string;
  category: string;
  requirements: NormalizedAttrs;
  /**
   * Optional per-weapon override:
   *  - true/undefined: two-hand rule may apply (default behavior)
   *  - false: disable 1.5× STR two-hand rule for this weapon
   *    (e.g., DS1 catalysts/pyro flames, certain tools)
   */
  twoHandRule?: boolean;
}

export interface GameAdapter {
  id: GameId;
  label: string;
  attrs: CoreAttr[];
  twoHand: {
    affected: "str"; // current games only scale STR when 2-handing
    multiplier: number; // e.g., 1.5 (or 1.0 for games without the rule)
    rounding: "floor" | "round" | "ceil";
  };
  attrLabels: Partial<Record<CoreAttr, string>>;
  normalize: (raw: any) => NormalizedWeapon;
  loadData: () => Promise<any[]>;
}

