import type { NextRequest } from "next/server";
import { STATUTS, changerStatut, type Statut } from "@/lib/commandes";
import { connectee } from "@/lib/esther";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!connectee(req)) return Response.json({ erreur: "Code demandé." }, { status: 401 });
  const { id } = await params;
  const { statut } = (await req.json().catch(() => ({}))) as { statut?: Statut };
  if (!statut || !STATUTS.includes(statut) || statut === "attente")
    return Response.json({ erreur: "Statut inconnu." }, { status: 400 });
  const c = await changerStatut(id, statut);
  return c ? Response.json({ ok: true }) : Response.json({ erreur: "Commande introuvable." }, { status: 404 });
}
