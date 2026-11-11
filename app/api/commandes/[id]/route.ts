// Le suivi d'une commande par le client. L'identifiant, long et aléatoire, sert de clé.
import { carteDe, lire, lister, marquerPayee, vuePublique } from "@/lib/commandes";
import { fedapayActif, statutTransaction } from "@/lib/fedapay";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let c = await lire(id);
  if (!c) return Response.json({ erreur: "Commande introuvable." }, { status: 404 });
  // Si le retour de FedaPay s'est perdu, on redemande le statut du paiement
  if (c.statut === "attente" && c.paiement.transaction && fedapayActif()) {
    try {
      if ((await statutTransaction(c.paiement.transaction)) === "approved") c = (await marquerPayee(id)) ?? c;
    } catch {}
  }
  return Response.json({ ...vuePublique(c), carte: carteDe(c.telephone, await lister(2000)) }, { headers: { "Cache-Control": "no-store" } });
}
