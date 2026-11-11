// Où en est la carte de la Society pour ce numéro, et ce qu'elle retire de la commande en cours.
import { TAMPONS, carteDe, lister, preparerCommande, remiseCarte } from "@/lib/commandes";

export async function POST(req: Request) {
  const corps = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const telephone = typeof corps.telephone === "string" ? corps.telephone : "";
  if (telephone.replace(/\D/g, "").length < 8) return Response.json({ erreur: "Numéro non valable." }, { status: 400 });
  const carte = carteDe(telephone, await lister(2000));
  const prete = preparerCommande(corps);
  const remise = carte.offert && typeof prete !== "string" ? remiseCarte(prete.lignes) : 0;
  return Response.json({ ...carte, sur: TAMPONS, remise }, { headers: { "Cache-Control": "no-store" } });
}
