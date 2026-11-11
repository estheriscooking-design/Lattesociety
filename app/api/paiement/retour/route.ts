// FedaPay renvoie le client ici après le paiement. Le statut de l'adresse n'est pas fiable :
// on le redemande à FedaPay avant de marquer la commande payée.
import { NextResponse } from "next/server";
import { lire, marquerPayee } from "@/lib/commandes";
import { statutTransaction } from "@/lib/fedapay";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("c") ?? "";
  const c = await lire(id);
  if (!c) return NextResponse.redirect(new URL("/", url));
  if (c.statut === "attente" && c.paiement.transaction) {
    try {
      if ((await statutTransaction(c.paiement.transaction)) === "approved") await marquerPayee(id);
    } catch (e) {
      console.error("Statut FedaPay illisible", e);
    }
  }
  return NextResponse.redirect(new URL(`/suivi?c=${id}`, url));
}
