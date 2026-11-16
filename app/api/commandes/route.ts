// Le client valide sa commande : on la contrôle, on l'enregistre, on renvoie l'adresse où payer.
import { appliquerCarte, enregistrer, modifier, preparerCommande, refusTournee } from "@/lib/commandes";
import { creerPaiement, fedapayActif } from "@/lib/fedapay";
import { enregistrerLogo } from "@/lib/logos";

export async function POST(req: Request) {
  const corps = await req.json().catch(() => null);
  if (!corps || typeof corps !== "object") return Response.json({ erreur: "Commande illisible." }, { status: 400 });
  const prete = preparerCommande(corps as Record<string, unknown>);
  if (typeof prete === "string") return Response.json({ erreur: prete }, { status: 400 });
  const plein = await refusTournee(prete);
  if (plein) return Response.json({ erreur: plein }, { status: 409 });
  const commande = await appliquerCarte(prete);
  if (commande.groupe?.perso?.logo) {
    const refus = await enregistrerLogo(commande.id, (corps as { logo: string }).logo);
    if (refus) return Response.json({ erreur: refus }, { status: 400 });
  }

  const origine = new URL(req.url).origin;
  // On enregistre d'abord, puis on demande le paiement : si l'un des deux échoue, on sait lequel,
  // et aucune transaction ne reste chez FedaPay sans commande en face.
  try {
    if (fedapayActif()) commande.paiement = { mode: "fedapay", transaction: null };
    await enregistrer(commande);
  } catch (e) {
    console.error("Commande non enregistrée", e);
    return Response.json(
      { erreur: "La commande n’a pas pu être enregistrée. Réessayez dans un instant.", etape: "enregistrement" },
      { status: 502 },
    );
  }
  if (!fedapayActif()) return Response.json({ id: commande.id, url: `/paiement-demo?c=${commande.id}` });
  try {
    const p = await creerPaiement(commande, origine);
    await modifier(commande.id, (c) => ({ ...c, paiement: { mode: "fedapay", transaction: p.transaction } }));
    return Response.json({ id: commande.id, url: p.url });
  } catch (e) {
    console.error("Paiement non créé", e);
    // Le code de réponse de FedaPay (401 : clé refusée, 403 : compte non autorisé…) aide à dépanner
    const code = /FedaPay (\d{3})/.exec(e instanceof Error ? e.message : "")?.[1];
    return Response.json(
      {
        erreur: "Le paiement n’a pas pu démarrer. Réessayez dans un instant.",
        etape: "paiement",
        ...(code ? { code: Number(code) } : {}),
      },
      { status: 502 },
    );
  }
}
