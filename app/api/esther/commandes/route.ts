import type { NextRequest } from "next/server";
import { jetonCadeau, lister } from "@/lib/commandes";
import { connectee } from "@/lib/esther";
import { fedapayActif } from "@/lib/fedapay";

export async function GET(req: NextRequest) {
  if (!connectee(req)) return Response.json({ erreur: "Code demandé." }, { status: 401 });
  return Response.json(
    {
      commandes: (await lister()).map((c) => ({ ...c, lienCadeau: c.cadeau ? jetonCadeau(c.id) : null })),
      demo: !fedapayActif(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
