import { useEffect, useMemo, useState } from "react";
import type { GameAdapter, NormalizedWeapon } from "../games/types";

export function useWeapons(game: GameAdapter) {
  const [rows, setRows] = useState<any[]|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<string|null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr(null);
    game.loadData()
      .then(d => { if (alive) setRows(d); })
      .catch(e => { if (alive) setErr(String(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [game]);

  const weapons: NormalizedWeapon[] = useMemo(
    () => (rows ?? []).map(game.normalize),
    [rows, game]
  );

  return { weapons, loading, error };
}
