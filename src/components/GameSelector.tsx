import { GAMES } from "../games/registry";
import type { GameId } from "../games/types";
import type { Dispatch, SetStateAction } from "react";

type Props = {
  value: GameId;
  onChange: Dispatch<SetStateAction<GameId>>; // can pass setGameId directly
};

export default function GameSelector({ value, onChange }: Props) {
  const id = "game-select";

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        Game
      </label>
      <select
        id={id}
        className="border rounded-lg px-3 py-2 bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value as GameId)}
      >
        {GAMES.map((g) => (
          <option key={g.id} value={g.id}>
            {g.label}
          </option>
        ))}
      </select>
    </div>
  );
}
