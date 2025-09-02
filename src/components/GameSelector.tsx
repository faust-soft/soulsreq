import { GAMES } from "../games/registry";

export default function GameSelector({ value, onChange }:{value:string; onChange:(id:string)=>void}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium">Game</label>
      <select
        className="border rounded-lg px-3 py-2 bg-white"
        value={value}
        onChange={e=>onChange(e.target.value)}
      >
        {GAMES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
      </select>
    </div>
  );
}
