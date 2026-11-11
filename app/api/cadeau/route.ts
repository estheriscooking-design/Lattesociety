// La page que reçoit la personne à qui on offre un latté. Le jeton cache l'identifiant de la commande.
import { idDuJeton, lire, vueCadeau } from "@/lib/commandes";

export async function POST(req: Request) {
  const { jeton } = (await req.json().catch(() => ({}))) as { jeton?: string };
  const id = typeof jeton === "string" ? idDuJeton(jeton) : null;
  const c = id ? await lire(id) : null;
  if (!c || !c.cadeau || c.statut === "attente") return Response.json({ erreur: "Cadeau introuvable." }, { status: 404 });
  return Response.json(vueCadeau(c), { headers: { "Cache-Control": "no-store" } });
}
