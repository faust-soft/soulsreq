import { useEffect, useMemo, useState } from "react";
import GameSelector from "./components/GameSelector";
import WeaponCard from "./components/WeaponCard";
import { GAMES, GAME_BY_ID } from "./games/registry";
import { useWeapons } from "./hooks/useWeapons";
import { checkUsability } from "./games/logic";
import type { Usability } from "./games/logic";
import type { NormalizedAttrs } from "./games/types";
import { PRESETS, type Preset } from "./games/presets";

type ViewMode = "list" | "block";

export default function App() {
  const [gameId, setGameId] = useState(GAMES[0].id);
  const game = useMemo(() => GAME_BY_ID[gameId], [gameId]);

  // player stats (editable anytime)
  const [player, setPlayer] = useState<NormalizedAttrs>({ str: 10, dex: 10 });

  // view toggle (persist)
  const [view, setView] = useState<ViewMode>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("soulsreq:view") : null;
    return saved === "block" || saved === "list" ? saved : "list";
  });
  useEffect(() => {
    localStorage.setItem("soulsreq:view", view);
  }, [view]);

  // hide unusable toggle (persist)
  const [hideNo, setHideNo] = useState<boolean>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("soulsreq:hideNo") : null;
    return saved === "1";
  });
  useEffect(() => {
    localStorage.setItem("soulsreq:hideNo", hideNo ? "1" : "0");
  }, [hideNo]);

  // ==== Default Class presets ====
  const presets: Preset[] = PRESETS[game.id] ?? [];

  // Derive which preset (if any) matches current stats; otherwise "custom"
  const currentPresetKey = useMemo(() => {
    for (const p of presets) {
      let match = true;
      for (const a of game.attrs) {
        const pv = (player as any)[a] ?? 0;
        const sv = (p.stats as any)[a] ?? 0;
        if (pv !== sv) { match = false; break; }
      }
      if (match) return p.name;
    }
    return "custom";
  }, [presets, player, game]);

  // Apply a preset: set all attributes the game cares about; leave others alone.
  function applyPreset(name: string) {
    const p = presets.find(x => x.name === name);
    if (!p) return;
    setPlayer(prev => {
      const next: NormalizedAttrs = { ...prev };
      for (const a of game.attrs) {
        next[a] = (p.stats as any)[a] ?? 0;
      }
      return next;
    });
  }

  const { weapons, loading, error } = useWeapons(game);

  // status per weapon
  const items = useMemo(
    () =>
      weapons.map((w) => ({
        w,
        status: checkUsability(w, player, game) as Usability,
      })),
    [weapons, player, game]
  );

  // JSON class order (first appearance)
  const classOrder = useMemo(() => {
    const ord = new Map<string, number>();
    let i = 0;
    for (const w of weapons) {
      const c = w.category || "";
      if (!ord.has(c)) ord.set(c, i++);
    }
    return ord;
  }, [weapons]);

  const STATUS_RANK: Record<Usability, number> = { "1H": 0, "2H": 1, "NO": 2 };

  // apply hide unusable
  const visibleItems = useMemo(
    () => (hideNo ? items.filter((it) => it.status !== "NO") : items),
    [items, hideNo]
  );

  // LIST: 1H -> 2H -> NO, then JSON class order, then name
  const sorted = useMemo(() => {
    return [...visibleItems].sort((a, b) => {
      const sr = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (sr !== 0) return sr;
      const ar = classOrder.get(a.w.category || "") ?? Number.MAX_SAFE_INTEGER;
      const br = classOrder.get(b.w.category || "") ?? Number.MAX_SAFE_INTEGER;
      if (ar !== br) return ar - br;
      return a.w.name.localeCompare(b.w.name);
    });
  }, [visibleItems, classOrder]);

  // BLOCK: group by category (JSON order), inside: status then name
  const groups = useMemo(() => {
    const map = new Map<string, Array<{ w: typeof items[number]["w"]; status: Usability }>>();
    for (const it of visibleItems) {
      const key = it.w.category || "Weapon";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    const arr = Array.from(map.entries()).sort((a, b) => {
      const ar = classOrder.get(a[0]) ?? Number.MAX_SAFE_INTEGER;
      const br = classOrder.get(b[0]) ?? Number.MAX_SAFE_INTEGER;
      return ar - br;
    });
    for (const [, list] of arr) {
      list.sort((a, b) => {
        const sr = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        if (sr !== 0) return sr;
        return a.w.name.localeCompare(b.w.name);
      });
    }
    return arr.map(([category, list]) => ({ category, list }));
  }, [visibleItems, classOrder]);

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Game selector */}
        <GameSelector value={gameId} onChange={setGameId} />

        {/* Stats + Default Class */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Default Class selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium w-28">Default Class</label>
            <select
              className="border rounded-lg px-3 py-2 bg-white"
              value={currentPresetKey}
              onChange={(e) => {
                const name = e.target.value;
                if (name !== "custom") applyPreset(name);
              }}
            >
              <option value="custom">Custom</option>
              {presets.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Attribute inputs */}
          {game.attrs.map((a) => (
            <div key={a} className="flex items-center gap-2">
              <label className="text-sm w-16">
                {(game.attrLabels as any)[a] ?? a.toUpperCase()}
              </label>
              <input
                type="number"
                className="w-20 border rounded px-2 py-1"
                value={player[a] ?? 0}
                onChange={(e) =>
                  setPlayer((p) => ({ ...p, [a]: Number(e.target.value) }))
                }
              />
            </div>
          ))}
        </div>

        {/* View + Hide Unusable */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">View</span>
            <div className="inline-flex rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <button
                className={`px-3 py-1.5 text-sm ${
                  view === "list"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-white text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                }`}
                onClick={() => setView("list")}
              >
                List
              </button>
              <button
                className={`px-3 py-1.5 text-sm ${
                  view === "block"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-white text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                }`}
                onClick={() => setView("block")}
              >
                Block
              </button>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={hideNo}
              onChange={(e) => setHideNo(e.target.checked)}
            />
            Hide unusable
          </label>
        </div>
      </div>

      {loading && <p>Loading weapons…</p>}
      {error && <p className="text-red-600">Error: {error}</p>}

      <p className="text-sm text-zinc-500">
        {visibleItems.length} shown (of {weapons.length}) for {game.label}
      </p>

      {!loading && !error && visibleItems.length === 0 && (
        <p className="text-sm text-zinc-500">No weapons match the current view.</p>
      )}

      {/* Content */}
      {view === "list" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map(({ w, status }) => (
            <WeaponCard key={w.id} w={w} status={status} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ category, list }) => (
            <section
              key={category}
              className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 shadow-sm"
            >
              <div className="px-4 py-3 border-b border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-900/40 rounded-t-2xl">
                <h2 className="text-base font-semibold">{category}</h2>
                <p className="text-xs text-zinc-500">{list.length} item(s)</p>
              </div>
              <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {list.map(({ w, status }) => (
                  <WeaponCard key={w.id} w={w} status={status} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
