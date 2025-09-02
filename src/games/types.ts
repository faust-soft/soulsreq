export type CoreAttr = "str"|"dex"|"int"|"fth"|"arc"|"skl"|"bld";

export type NormalizedAttrs = Partial<Record<CoreAttr, number>>;

export interface NormalizedWeapon {
  id: string;
  name: string;
  category: string;
  requirements: NormalizedAttrs;
}

export interface GameAdapter {
  id: "DSR"|"DS2"|"DS3"|"BB"|"ER";
  label: string;
  attrs: CoreAttr[];
  twoHand: { affected: "str"; multiplier: number; rounding: "floor"|"round"|"ceil" };
  attrLabels: Partial<Record<CoreAttr, string>>;
  normalize: (raw: any) => NormalizedWeapon;
  loadData: () => Promise<any[]>;
}
