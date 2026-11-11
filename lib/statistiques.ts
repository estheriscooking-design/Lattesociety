// Les chiffres du tableau de bord d'Esther, calculés à partir des commandes.
// Le chiffre d'affaires est celui des lattés : les frais de livraison vont au livreur.
import { LATTES, SIROPS, SUPPLEMENTS } from "./carte";
import type { Commande } from "./commandes";

const JOUR = 86400000;
const COTONOU = 3600000; // UTC+1, sans heure d'été
const local = (iso: string) => new Date(new Date(iso).getTime() + COTONOU);
const jourDe = (iso: string) => local(iso).toISOString().slice(0, 10);
const comptee = (c: Commande) => c.statut !== "attente" && c.statut !== "annulee";
const gobelets = (c: Commande) => c.lignes.reduce((s, l) => s + l.quantite, 0);
const mediane = (v: number[]) => {
  if (v.length === 0) return null;
  const t = [...v].sort((a, b) => a - b);
  return Math.round(t.length % 2 ? t[(t.length - 1) / 2] : (t[t.length / 2 - 1] + t[t.length / 2]) / 2);
};
const client = (c: Commande) => c.telephone.replace(/\D/g, "");

function resume(liste: Commande[]) {
  const ca = liste.reduce((s, c) => s + (c.sousTotal - (c.remise ?? 0)), 0);
  const g = liste.reduce((s, c) => s + gobelets(c), 0);
  return {
    commandes: liste.length,
    gobelets: g,
    ca,
    panier: liste.length ? Math.round(ca / liste.length) : 0,
    gobeletsParCommande: liste.length ? Math.round((g / liste.length) * 10) / 10 : 0,
    livraison: liste.reduce((s, c) => s + c.frais, 0),
  };
}

const classer = <T extends { n: number }>(m: Map<string, T>) =>
  [...m.entries()].map(([nom, v]) => ({ nom, ...v })).sort((a, b) => b.n - a.n);

export function statistiques(toutes: Commande[], jours: number) {
  const fin = Date.now();
  const debut = fin - jours * JOUR;
  const dans = (c: Commande, a: number, b: number) => {
    const t = new Date(c.creeLe).getTime();
    return t >= a && t < b;
  };
  const creees = toutes.filter((c) => dans(c, debut, fin));
  const periode = creees.filter(comptee);
  const precedente = toutes.filter((c) => dans(c, debut - jours * JOUR, debut) && comptee(c));

  // Par jour, jours vides compris
  const parJour = new Map<string, { n: number; ca: number }>();
  for (let i = jours - 1; i >= 0; i--) parJour.set(jourDe(new Date(fin - i * JOUR).toISOString()), { n: 0, ca: 0 });
  // Par jour de la semaine et par heure de livraison demandée
  const semaine = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"].map((nom) => ({ nom, n: 0, ca: 0 }));
  const heures = new Map<string, { n: number }>();
  const lattes = new Map<string, { n: number; ca: number }>();
  const sirops = new Map<string, { n: number }>();
  const dessus = new Map<string, { n: number }>();
  const quartiers = new Map<string, { n: number; ca: number; frais: number }>();
  let vegetal = 0;
  let cadeaux = 0;
  let immediates = 0;
  const preparation: number[] = [];
  const livraison: number[] = [];
  const total: number[] = [];
  let aTemps = 0;
  let mesurees = 0;

  for (const c of periode) {
    const j = parJour.get(jourDe(c.creeLe));
    if (j) {
      j.n++;
      j.ca += (c.sousTotal - (c.remise ?? 0));
    }
    const prevu = c.quand === "vite" ? local(c.creeLe) : new Date(`${c.quand.jour}T${c.quand.heure}:00Z`);
    semaine[prevu.getUTCDay()].n++;
    semaine[prevu.getUTCDay()].ca += (c.sousTotal - (c.remise ?? 0));
    const h = `${String(prevu.getUTCHours()).padStart(2, "0")} h`;
    heures.set(h, { n: (heures.get(h)?.n ?? 0) + 1 });
    if (c.quand === "vite" || c.quand.jour === jourDe(c.creeLe)) immediates++; // livrée le jour même de la commande
    if (c.cadeau) cadeaux++;

    for (const l of c.lignes) {
      const latte = LATTES.find((x) => x.id === l.latte);
      const nom = latte?.nom ?? l.latte;
      const v = lattes.get(nom) ?? { n: 0, ca: 0 };
      v.n += l.quantite;
      v.ca += (latte?.prix ?? 0) * l.quantite;
      lattes.set(nom, v);
      if (l.lait === "vegetal") vegetal += l.quantite;
      for (const id of l.sirops) {
        const s = SIROPS.find((x) => x.id === id)?.nom ?? id;
        sirops.set(s, { n: (sirops.get(s)?.n ?? 0) + l.quantite });
      }
      for (const id of l.supplements) {
        const s = SUPPLEMENTS.find((x) => x.id === id)?.nom ?? id;
        dessus.set(s, { n: (dessus.get(s)?.n ?? 0) + l.quantite });
      }
    }

    const q = quartiers.get(c.quartier) ?? { n: 0, ca: 0, frais: 0 };
    q.n++;
    q.ca += (c.sousTotal - (c.remise ?? 0));
    q.frais += c.frais;
    quartiers.set(c.quartier, q);

    // Délais, d'après l'heure de chaque étape
    const le = (s: string) => {
      const e = c.historique?.find((x) => x.statut === s);
      return e ? new Date(e.le).getTime() : null;
    };
    const [paye, prep, parti, livre] = [le("payee"), le("preparation"), le("en-route"), le("livree")];
    if (prep && parti) preparation.push((parti - prep) / 60000);
    if (parti && livre) livraison.push((livre - parti) / 60000);
    if (c.quand === "vite" && paye && livre) {
      const minutes = (livre - paye) / 60000;
      total.push(minutes);
      mesurees++;
      if (minutes <= 45) aTemps++;
    }
  }

  // Clients : reconnus à leur numéro de téléphone
  const premiere = new Map<string, number>();
  for (const c of toutes.filter(comptee)) {
    const t = new Date(c.creeLe).getTime();
    const k = client(c);
    if (!premiere.has(k) || t < premiere.get(k)!) premiere.set(k, t);
  }
  const parClient = new Map<string, { nom: string; n: number; ca: number }>();
  for (const c of periode) {
    const v = parClient.get(client(c)) ?? { nom: c.nom, n: 0, ca: 0 };
    v.n++;
    v.ca += (c.sousTotal - (c.remise ?? 0));
    parClient.set(client(c), v);
  }
  const uniques = parClient.size;
  const nouveaux = [...parClient.keys()].filter((k) => (premiere.get(k) ?? 0) >= debut).length;
  const revenus = [...parClient.values()].filter((v) => v.n > 1).length;

  const notes = periode.filter((c) => c.avis).map((c) => c.avis!);
  const tousGobelets = periode.reduce((s, c) => s + gobelets(c), 0);

  return {
    jours,
    resume: resume(periode),
    precedent: resume(precedente),
    groupes: {
      n: periode.filter((c) => c.groupe).length,
      ca: periode.filter((c) => c.groupe).reduce((s, c) => s + c.sousTotal, 0),
    },
    tunnel: {
      creees: creees.length,
      payees: creees.filter((c) => c.statut !== "attente").length,
      annulees: creees.filter((c) => c.statut === "annulee").length,
    },
    parJour: [...parJour.entries()].map(([jour, v]) => ({ jour, ...v })),
    semaine: semaine.slice(1), // lundi à samedi
    heures: [...heures.entries()].map(([nom, v]) => ({ nom, ...v })).sort((a, b) => a.nom.localeCompare(b.nom)),
    lattes: classer(lattes),
    sirops: classer(sirops),
    dessus: classer(dessus),
    quartiers: classer(quartiers),
    sources: (["instagram", "tiktok", "whatsapp", "direct"] as const).map((s) => {
      const siennes = periode.filter((c) => (c.source ?? "direct") === s);
      return {
        nom: { instagram: "Instagram", tiktok: "TikTok", whatsapp: "WhatsApp", direct: "Lien direct ou autre" }[s],
        n: siennes.length,
        ca: siennes.reduce((t, c) => t + c.sousTotal - (c.remise ?? 0), 0),
      };
    }),
    parts: {
      vegetal: tousGobelets ? Math.round((vegetal / tousGobelets) * 100) : 0,
      cadeaux: periode.length ? Math.round((cadeaux / periode.length) * 100) : 0,
      immediates: periode.length ? Math.round((immediates / periode.length) * 100) : 0,
    },
    delais: {
      preparation: mediane(preparation),
      livraison: mediane(livraison),
      total: mediane(total),
      aTemps: mesurees ? Math.round((aTemps / mesurees) * 100) : null,
      mesurees,
    },
    clients: {
      uniques,
      nouveaux,
      fideles: uniques - nouveaux,
      rachat: uniques ? Math.round((revenus / uniques) * 100) : 0,
      meilleurs: [...parClient.values()].sort((a, b) => b.ca - a.ca).slice(0, 5),
    },
    avis: {
      nombre: notes.length,
      moyenne: notes.length ? Math.round((notes.reduce((s, a) => s + a.note, 0) / notes.length) * 10) / 10 : null,
      derniers: notes
        .filter((a) => a.commentaire)
        .sort((a, b) => b.le.localeCompare(a.le))
        .slice(0, 5),
    },
  };
}

export type Statistiques = ReturnType<typeof statistiques>;
