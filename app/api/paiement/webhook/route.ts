// Notification de FedaPay (à déclarer dans son tableau de bord : .../api/paiement/webhook).
// On ne croit pas le contenu reçu : on y lit seulement le numéro de transaction,
// puis on demande son vrai statut à FedaPay. Une fausse notification ne peut donc rien valider.
import { marquerPayee, trouverParTransaction } from "@/lib/commandes";
import { fedapayActif, statutTransaction } from "@/lib/fedapay";

export async function POST(req: Request) {
  if (!fedapayActif()) return new Response(null, { status: 204 });
  const corps = (await req.json().catch(() => ({}))) as Record<string, { id?: unknown } | undefined>;
  const brut = corps.entity?.id ?? corps.object?.id;
  const transaction = typeof brut === "number" || typeof brut === "string" ? String(brut) : "";
  if (!/^\d+$/.test(transaction)) return new Response(null, { status: 204 });
  try {
    const c = await trouverParTransaction(transaction);
    if (c && c.statut === "attente" && (await statutTransaction(transaction)) === "approved") await marquerPayee(c.id);
  } catch (e) {
    console.error("Webhook FedaPay", e);
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 204 });
}
