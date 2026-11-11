// FedaPay, d'après sa documentation (docs.fedapay.com, lue le 10/11/2026) :
// créer une transaction, demander son lien de paiement, puis vérifier son statut auprès de l'API.
// Sans FEDAPAY_SECRET_KEY, le site passe en mode démonstration (aucun argent ne circule).
import type { Commande } from "./commandes";

const cle = () => process.env.FEDAPAY_SECRET_KEY ?? "";
export const fedapayActif = () => cle() !== "";
const base = () =>
  (process.env.FEDAPAY_ENV ?? (cle().startsWith("sk_live") ? "live" : "sandbox")) === "live"
    ? "https://api.fedapay.com/v1"
    : "https://sandbox-api.fedapay.com/v1";

async function appel(chemin: string, init: RequestInit = {}) {
  const r = await fetch(base() + chemin, {
    ...init,
    headers: { Authorization: `Bearer ${cle()}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`FedaPay ${r.status} : ${JSON.stringify(json).slice(0, 300)}`);
  // Selon les versions, la réponse est enveloppée dans une clé « v1/transaction »
  return (json["v1/transaction"] ?? json["v1/token"] ?? json) as Record<string, unknown>;
}

export async function creerPaiement(c: Commande, origine: string) {
  const [prenom, ...reste] = c.nom.split(" ");
  const corps = {
    description: `The Latte Society, commande ${c.numero}`,
    amount: c.total,
    currency: { iso: "XOF" },
    callback_url: `${origine}/api/paiement/retour?c=${c.id}`,
    custom_metadata: { commande: c.id },
  };
  const client = {
    firstname: prenom,
    lastname: reste.join(" ") || prenom,
    phone_number: { number: c.telephone.replace(/\D/g, ""), country: "bj" },
  };
  let t: Record<string, unknown>;
  try {
    t = await appel("/transactions", { method: "POST", body: JSON.stringify({ ...corps, customer: client }) });
  } catch {
    // Si la fiche client est refusée (format du numéro), on crée la transaction sans elle
    t = await appel("/transactions", { method: "POST", body: JSON.stringify(corps) });
  }
  const lien = await appel(`/transactions/${t.id}/token`, { method: "POST" });
  return { transaction: String(t.id), url: String(lien.url) };
}

// Le statut vient toujours de l'API, jamais de l'adresse de retour (consigne de FedaPay).
export async function statutTransaction(transaction: string) {
  const t = await appel(`/transactions/${encodeURIComponent(transaction)}`);
  return String(t.status);
}
