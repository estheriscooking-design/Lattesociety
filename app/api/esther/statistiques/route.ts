import type { NextRequest } from "next/server";
import { canauxAlerte } from "@/lib/alerte";
import { lister } from "@/lib/commandes";
import { connectee } from "@/lib/esther";
import { statistiques } from "@/lib/statistiques";
import { compter } from "@/lib/visites";

export async function GET(req: NextRequest) {
  if (!connectee(req)) return Response.json({ erreur: "Code demandé." }, { status: 401 });
  const jours = [7, 30, 90].includes(Number(req.nextUrl.searchParams.get("jours")))
    ? Number(req.nextUrl.searchParams.get("jours"))
    : 30;
  return Response.json(
    { ...statistiques(await lister(5000), jours), alertes: canauxAlerte(), visites: await compter(jours) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
