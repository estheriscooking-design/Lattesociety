// Mode démonstration : simule un paiement réussi. Refusé dès qu'une clé FedaPay est configurée.
import { marquerPayee } from "@/lib/commandes";
import { fedapayActif } from "@/lib/fedapay";

export async function POST(req: Request) {
  if (fedapayActif()) return Response.json({ erreur: "Mode démonstration fermé." }, { status: 404 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  const c = await marquerPayee(id ?? "");
  return c ? Response.json({ ok: true }) : Response.json({ erreur: "Commande introuvable." }, { status: 404 });
}
