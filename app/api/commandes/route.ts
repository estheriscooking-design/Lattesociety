// Le client valide sa commande : on la contrôle, on l'enregistre, on renvoie l'adresse où payer.
import { appliquerCarte, enregistrer, preparerCommande } from "@/lib/commandes";
import { creerPaiement, fedapayActif } from "@/lib/fedapay";

export async function POST(req: Request) {
  const corps = await req.json().catch(() => null);
  if (!corps || typeof corps !== "object") return Response.json({ erreur: "Commande illisible." }, { status: 400 });
  const prete = preparerCommande(corps as Record<string, unknown>);
  if (typeof prete === "string") return Response.json({ erreur: prete }, { status: 400 });
  const commande = await appliquerCarte(prete);

  const origine = new URL(req.url).origin;
  try {
    if (fedapayActif()) {
      const p = await creerPaiement(commande, origine);
      commande.paiement = { mode: "fedapay", transaction: p.transaction };
      await enregistrer(commande);
      return Response.json({ id: commande.id, url: p.url });
    }
    await enregistrer(commande);
    return Response.json({ id: commande.id, url: `/paiement-demo?c=${commande.id}` });
  } catch (e) {
    console.error("Commande non créée", e);
    return Response.json(
      { erreur: "Le paiement n’a pas pu démarrer. Réessayez dans un instant." },
      { status: 502 },
    );
  }
}
