import type { NormalizedWeapon } from "../games/types";
import type { Usability } from "../games/logic";

export default function WeaponCard({ w, status }:{ w:NormalizedWeapon; status:Usability }) {
  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{w.name}</h3>
        <span className={`text-xs px-2 py-1 rounded ${
          status==="1H"?"bg-green-200":
          status==="2H"?"bg-yellow-200":
          "bg-red-200"
        }`}>
          {status==="1H"?"Usable (1H)":
           status==="2H"?"Usable (2H)":"Not usable"}
        </span>
      </div>
      <p className="text-sm text-zinc-500">{w.category}</p>
      <div className="mt-2 text-xs grid grid-cols-2 gap-y-1">
        {Object.entries(w.requirements).map(([k,v])=>(
          <div key={k}>{k.toUpperCase()}: {v}</div>
        ))}
      </div>
    </div>
  );
}
