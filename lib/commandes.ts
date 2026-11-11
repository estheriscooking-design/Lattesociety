// Les commandes, côté serveur : contrôle de ce que le site envoie, calcul des prix, enregistrement.
// Le prix n'est jamais repris du navigateur : il est recalculé ici à partir de la carte.
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  LAITS,
  LATTES,
  MAX_DESSUS,
  MAX_SIROPS,
  QUARTIERS,
  SIROPS,
  SUPPLEMENTS,
  cleLigne,
  detailLigne,
  erreurCreneau,
  ouvertMaintenant,
  prixLigne,
  type Ligne,
} from "./carte";
import { alerter, envoyer } from "./alerte";

export const STATUTS = ["attente", "payee", "preparation", "en-route", "livree", "annulee"] as const;
export type Statut = (typeof STATUTS)[number];

export type Commande = {
  id: string;
  numero: string; // court, pour se parler : « LS-7K2Q »
  creeLe: string;
  statut: Statut;
  lignes: Ligne[];
  nom: string;
  telephone: string;
  cadeau: { nom: string; telephone: string; mot: string } | null;
  quartier: string;
  lieu: string;
  quand: "vite" | { jour: string; heure: string };
  sousTotal: number;
  frais: number;
  total: number;
  paiement: { mode: "fedapay" | "demo"; transaction: string | null };
  historique?: { statut: Statut; le: string }[]; // l'heure de chaque étape, pour mesurer les délais
  avis?: { note: number; commentaire: string; le: string } | null; // laissé par le client après la livraison
  remise?: number; // le latté offert par la carte de la Society, en francs
  soucis?: { message: string; le: string }[]; // ce que le client signale depuis sa page de suivi
};

// ---------- La carte de la Society : neuf lattés payés, le dixième est offert.
// Elle se compte sur le numéro de téléphone (ses huit derniers chiffres, pour ignorer l'indicatif).
export const TAMPONS = 9;
const cleTel = (t: string) => t.replace(/\D/g, "").slice(-8);
const gobelets = (c: Commande) => c.lignes.reduce((s, l) => s + l.quantite, 0);

export function carteDe(telephone: string, toutes: Commande[]) {
  const cle = cleTel(telephone);
  const siennes = toutes.filter((c) => c.statut !== "attente" && c.statut !== "annulee" && cleTel(c.telephone) === cle);
  const offerts = siennes.filter((c) => (c.remise ?? 0) > 0).length;
  const payes = siennes.reduce((s, c) => s + gobelets(c), 0) - offerts;
  const tampons = payes - offerts * TAMPONS;
  return { tampons: Math.min(tampons, TAMPONS), offert: tampons >= TAMPONS };
}

// Le latté offert est le moins cher de la commande.
export const remiseCarte = (lignes: Ligne[]) => Math.min(...lignes.map((l) => prixLigne(l) / l.quantite));

export async function appliquerCarte(c: Commande) {
  if (!carteDe(c.telephone, await lister(2000)).offert) return c;
  const remise = remiseCarte(c.lignes);
  return { ...c, remise, total: c.total - remise };
}

// Le lien du cadeau ne doit pas donner le prix : il porte l'identifiant chiffré, pas l'identifiant.
const cleCadeau = () => createHash("sha256").update(`cadeau|${process.env.ESTHER_CODE ?? "latte-society"}`).digest();
export function jetonCadeau(id: string) {
  const iv = randomBytes(12);
  const chiffre = createCipheriv("aes-256-gcm", cleCadeau(), iv);
  const corps = Buffer.concat([chiffre.update(id, "utf8"), chiffre.final()]);
  return Buffer.concat([iv, chiffre.getAuthTag(), corps]).toString("base64url");
}
export function idDuJeton(jeton: string) {
  try {
    const b = Buffer.from(jeton, "base64url");
    const clair = createDecipheriv("aes-256-gcm", cleCadeau(), b.subarray(0, 12));
    clair.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([clair.update(b.subarray(28)), clair.final()]).toString("utf8");
  } catch {
    return null;
  }
}

const texte = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const ids = (v: unknown, liste: { id: string }[]) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => liste.some((o) => o.id === x)))] : [];

// Renvoie la commande prête à enregistrer, ou le message à montrer au client.
export function preparerCommande(corps: Record<string, unknown>): Commande | string {
  const brutes = Array.isArray(corps.lignes) ? corps.lignes.slice(0, 30) : [];
  const lignes: Ligne[] = [];
  for (const b of brutes as Record<string, unknown>[]) {
    const latte = LATTES.find((l) => l.id === b?.latte);
    if (!latte) return "Un latté de votre commande n’est plus à la carte. Rechargez la page.";
    const quantite = Math.floor(Number(b.quantite));
    if (!(quantite >= 1 && quantite <= 20)) return "La quantité d’un latté n’est pas valable.";
    const lait = LAITS.some((o) => o.id === b.lait) ? (b.lait as string) : "classique";
    const sirops = latte.libre ? ids(b.sirops, SIROPS) : [];
    const supplements = latte.libre ? ids(b.supplements, SUPPLEMENTS) : [];
    if (sirops.length > MAX_SIROPS || supplements.length > MAX_DESSUS)
      return `Le latté composé accepte ${MAX_SIROPS} sirops et ${MAX_DESSUS} dessus au plus.`;
    const l = { latte: latte.id, lait, sirops, supplements, quantite };
    lignes.push({ ...l, cle: cleLigne(l) });
  }
  if (lignes.length === 0) return "Votre commande est vide.";

  const nom = texte(corps.nom, 80);
  const telephone = texte(corps.telephone, 30);
  if (!nom) return "Indiquez votre nom.";
  if (telephone.replace(/\D/g, "").length < 8) return "Indiquez un numéro de téléphone valable.";

  let cadeau: Commande["cadeau"] = null;
  if (corps.cadeau === true) {
    cadeau = { nom: texte(corps.pourNom, 80), telephone: texte(corps.pourTelephone, 30), mot: texte(corps.mot, 240) };
    if (!cadeau.nom) return "Indiquez le nom de la personne à qui vous offrez.";
    if (cadeau.telephone.replace(/\D/g, "").length < 8) return "Indiquez le numéro de la personne à livrer.";
  }

  const quartier = QUARTIERS.find((q) => q.nom === corps.quartier);
  if (!quartier) return "Choisissez votre quartier.";
  const lieu = texte(corps.lieu, 500);
  if (!lieu) return "Indiquez le lieu de livraison.";

  let quand: Commande["quand"];
  if (corps.quand === "vite") {
    if (!ouvertMaintenant()) return "Esther est fermée en ce moment. Réservez un jour et une heure.";
    quand = "vite";
  } else {
    const jour = texte(corps.jour, 10);
    const heure = texte(corps.heure, 5);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(jour) || !/^\d{2}:\d{2}$/.test(heure)) return "Choisissez un jour et une heure.";
    const refus = erreurCreneau(jour, heure);
    if (refus) return refus;
    quand = { jour, heure };
  }

  const sousTotal = lignes.reduce((s, l) => s + prixLigne(l), 0);
  const id = randomUUID();
  return {
    id,
    numero: `LS-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`,
    creeLe: new Date().toISOString(),
    statut: "attente",
    lignes,
    nom,
    telephone,
    cadeau,
    quartier: quartier.nom,
    lieu,
    quand,
    sousTotal,
    frais: quartier.frais,
    total: sousTotal + quartier.frais,
    paiement: { mode: "demo", transaction: null },
    historique: [],
    avis: null,
  };
}

// Ce que le client voit sur sa page de suivi : ni téléphone ni adresse.
export function vuePublique(c: Commande) {
  return {
    numero: c.numero,
    statut: c.statut,
    lignes: c.lignes.map((l) => ({
      quantite: l.quantite,
      nom: LATTES.find((x) => x.id === l.latte)?.nom ?? l.latte,
      detail: detailLigne(l),
    })),
    total: c.total,
    frais: c.frais,
    quand: c.quand,
    quartier: c.quartier,
    pour: c.cadeau?.nom ?? null,
    avis: c.avis?.note ?? null,
    remise: c.remise ?? 0,
    cadeau: c.cadeau ? jetonCadeau(c.id) : null,
    souci: (c.soucis?.length ?? 0) > 0,
  };
}

// Ce que voit la personne à qui on offre : ni prix, ni adresse, ni numéro.
export function vueCadeau(c: Commande) {
  return {
    statut: c.statut,
    pour: c.cadeau?.nom ?? "",
    de: c.nom,
    mot: c.cadeau?.mot ?? "",
    lignes: c.lignes.map((l) => ({
      quantite: l.quantite,
      nom: LATTES.find((x) => x.id === l.latte)?.nom ?? l.latte,
      detail: detailLigne(l),
    })),
    quand: c.quand,
  };
}

// ---------- Enregistrement
// Sur Vercel, le disque ne garde rien : il faut Supabase (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,
// table décrite dans supabase/schema.sql). Sans ces variables, les commandes vont dans un fichier
// local, ce qui suffit pour développer.

const FICHIER = path.join(process.cwd(), ".data", "commandes.json");
const supabase = () =>
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? { url: `${process.env.SUPABASE_URL}/rest/v1/latte_commandes`, cle: process.env.SUPABASE_SERVICE_ROLE_KEY }
    : null;

async function rest(chemin: string, init: RequestInit = {}) {
  const s = supabase()!;
  const r = await fetch(s.url + chemin, {
    ...init,
    headers: { apikey: s.cle, Authorization: `Bearer ${s.cle}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${r.status} : ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

let file: Promise<unknown> = Promise.resolve(); // une écriture à la fois dans le fichier
async function lireFichier(): Promise<Commande[]> {
  try {
    return JSON.parse(await readFile(FICHIER, "utf8"));
  } catch {
    return [];
  }
}
function ecrireFichier(maj: (toutes: Commande[]) => Commande[]) {
  const suite = file.then(async () => {
    const toutes = maj(await lireFichier());
    await mkdir(path.dirname(FICHIER), { recursive: true });
    await writeFile(FICHIER, JSON.stringify(toutes, null, 2));
  });
  file = suite.catch(() => {});
  return suite;
}

export async function enregistrer(c: Commande) {
  if (supabase())
    await rest("", { method: "POST", body: JSON.stringify({ id: c.id, statut: c.statut, cree_le: c.creeLe, donnees: c }) });
  else await ecrireFichier((t) => [...t, c]);
}

export async function lire(id: string): Promise<Commande | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  if (supabase()) {
    const lignes = (await rest(`?id=eq.${id}&select=donnees`)) as { donnees: Commande }[];
    return lignes[0]?.donnees ?? null;
  }
  return (await lireFichier()).find((c) => c.id === id) ?? null;
}

export async function lister(limite = 200): Promise<Commande[]> {
  if (supabase()) {
    const lignes = (await rest(`?select=donnees&order=cree_le.desc&limit=${limite}`)) as { donnees: Commande }[];
    return lignes.map((l) => l.donnees);
  }
  return (await lireFichier()).reverse().slice(0, limite);
}

export async function modifier(id: string, changer: (c: Commande) => Commande): Promise<Commande | null> {
  const actuelle = await lire(id);
  if (!actuelle) return null;
  const nouvelle = changer(actuelle);
  if (supabase())
    await rest(`?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ statut: nouvelle.statut, donnees: nouvelle }) });
  else await ecrireFichier((t) => t.map((c) => (c.id === id ? nouvelle : c)));
  return nouvelle;
}

export async function trouverParTransaction(transaction: string) {
  return (await lister()).find((c) => c.paiement.transaction === transaction) ?? null;
}

// Tout changement d'étape passe par ici, pour garder l'heure de chaque étape.
export const changerStatut = (id: string, statut: Statut) =>
  modifier(id, (c) =>
    c.statut === statut
      ? c
      : { ...c, statut, historique: [...(c.historique ?? []), { statut, le: new Date().toISOString() }] },
  );

// Un paiement confirmé fait passer la commande de « attente » à « payée », une seule fois,
// et prévient Esther à ce moment-là.
export async function marquerPayee(id: string) {
  const avant = await lire(id);
  if (!avant || avant.statut !== "attente") return avant;
  const apres = await changerStatut(id, "payee");
  if (apres) await alerter(apres).catch((e) => console.error("Alerte non envoyée", e));
  return apres;
}

export async function laisserAvis(id: string, note: number, commentaire: string) {
  const c = await lire(id);
  if (!c || c.statut !== "livree" || c.avis) return null;
  return modifier(id, (x) => ({ ...x, avis: { note, commentaire, le: new Date().toISOString() } }));
}

// Le client signale un souci depuis sa page de suivi : Esther le voit sur le bon et reçoit l'alerte.
export async function signalerSouci(id: string, message: string) {
  const c = await lire(id);
  if (!c || c.statut === "attente" || (c.soucis?.length ?? 0) >= 5) return null;
  const apres = await modifier(id, (x) => ({
    ...x,
    soucis: [...(x.soucis ?? []), { message, le: new Date().toISOString() }],
  }));
  await envoyer(
    `Souci sur la commande ${c.numero}`,
    [`Souci signalé sur la commande ${c.numero}`, "", `« ${message} »`, "", `${c.nom}, ${c.telephone}`].join("\n"),
  ).catch((e) => console.error("Alerte non envoyée", e));
  return apres;
}
