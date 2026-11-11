// La carte de The Latte Society. Tout ce qui se vend se change ici.
// Les prix sont en FCFA. Un prix `null` veut dire « pas encore fixé par Esther » :
// l'option s'affiche sans montant et n'ajoute rien au total.

export type Latte = {
  id: string;
  nom: string;
  texte: string; // À FAIRE RELIRE par Esther : descriptions écrites d'après le nom seul.
  prix: number;
  sirop: string | null; // le sirop de la recette, qu'on ne change pas ; null = pas encore précisé
  libre?: boolean; // le latté à composer : le seul où l'on choisit sirops et dessus
  teinte: string; // couleur franche du latté : pastille, couronne, panier
  haut: string; // couleur du haut du gobelet
  bas: string; // couleur du fond du gobelet
  fond: string; // couleur de la page quand ce latté est à l'écran
};

export const LATTES: Latte[] = [
  {
    id: "cookies-butter-cloud",
    nom: "Cookies Butter Cloud Latté",
    texte: "Café, lait et sirop spéculoos, sous un nuage de crème.",
    prix: 4000,
    sirop: "Spéculoos",
    teinte: "#C28E55",
    haut: "#F6E7D0",
    bas: "#C28E55",
    fond: "#F8DDB8",
  },
  {
    id: "iced-caramel",
    nom: "Iced Caramel Latté",
    texte: "Café, lait froid et sirop caramel, sur beaucoup de glaçons.",
    prix: 4000,
    sirop: "Caramel",
    teinte: "#B4743A",
    haut: "#EBD2B0",
    bas: "#B4743A",
    fond: "#FFD79F",
  },
  {
    id: "brown-sugar-shaken-espresso",
    nom: "Brown Sugar Shaken Espresso",
    texte:
      "Espresso secoué avec du sucre roux et des glaçons, sirop vanille, allongé au lait.",
    prix: 3500,
    sirop: "Vanille",
    teinte: "#633A24",
    haut: "#B07C52",
    bas: "#633A24",
    fond: "#EBC7A2",
  },
  {
    id: "matcha",
    nom: "Matcha Latté",
    texte: "Thé matcha fouetté et sirop vanille, versés sur du lait glacé.",
    prix: 4500,
    sirop: "Vanille",
    teinte: "#7E9A45",
    // Vert mesuré sur les photos d'Esther (#8CA654, #849661, #718C48) : olive, pas menthe.
    haut: "#7E9A45",
    bas: "#DDE2BC",
    fond: "#DCE2B4",
  },
  {
    id: "ube",
    nom: "Ube Latté",
    texte: "Ube, l’igname violette, et sirop vanille, sur du lait glacé.",
    prix: 4500,
    sirop: "Vanille",
    teinte: "#8752C2",
    haut: "#8752C2",
    bas: "#ECDDF6",
    fond: "#E4D2F5",
  },
  // Ajoutés le 11/2026. Descriptions écrites d'après des recettes courantes, à faire relire par Esther.
  {
    id: "tiramisu",
    nom: "Tiramisu Latté",
    texte: "Café et lait glacé au tiramisu, sous une crème poudrée de cacao.",
    prix: 4000,
    sirop: "Tiramisu",
    teinte: "#8A5A3A",
    haut: "#F1E2CC",
    bas: "#7B5134",
    fond: "#F0D8BD",
  },
  {
    id: "chocolate-chips",
    nom: "Chocolate Chips Latté",
    texte: "Café, lait glacé et chocolat, avec des pépites de chocolat.",
    prix: 3500,
    sirop: "Chocolat",
    teinte: "#5C3520",
    haut: "#A9704A",
    bas: "#4A2A1C",
    fond: "#E8CDB6",
  },
  {
    id: "compose",
    nom: "Composez le vôtre",
    texte:
      "Un latté glacé avec le lait, les sirops et le dessus que vous voulez.",
    prix: 4000,
    sirop: null,
    libre: true,
    teinte: "#FC740D",
    haut: "#F3DFC6",
    bas: "#D49A5E",
    fond: "#FFE2BF",
  },
];

export type Option = { id: string; nom: string; prix: number | null };

export const LAITS: Option[] = [
  { id: "classique", nom: "Lait classique", prix: 0 },
  { id: "vegetal", nom: "Lait végétal", prix: 500 } // supplément validé le 11/11/2026,
];

// Latté à composer : les options sont comprises dans son prix (décision du 11/2026).
// Plafonds proposés par Claude pour que le prix reste tenable, à valider par Esther.
export const MAX_SIROPS = 2;
export const MAX_DESSUS = 1;

// Les sirops ne se choisissent que pour le latté à composer.
export const SIROPS: Option[] = [
  { id: "vanille", nom: "Vanille", prix: 0 },
  { id: "speculoos", nom: "Spéculoos", prix: 0 },
  { id: "coco", nom: "Coco", prix: 0 },
  { id: "caramel", nom: "Caramel", prix: 0 },
  { id: "noisette", nom: "Noisette", prix: 0 },
  { id: "cannelle", nom: "Cannelle", prix: 0 },
  { id: "creme-brulee", nom: "Crème brûlée", prix: 0 },
  { id: "chocolat-blanc", nom: "Chocolat blanc", prix: 0 },
  { id: "pepites-chocolat", nom: "Pépites de chocolat", prix: 0 },
];

export const SUPPLEMENTS: Option[] = [
  { id: "sweet-cream", nom: "Sweet cream", prix: 0 },
  { id: "chantilly", nom: "Crème chantilly", prix: 0 },
  { id: "cold-foam", nom: "Cold foam", prix: 0 },
];

// Livraison, payée par le client. Tarifs des livreurs au départ d'Akpakpa (11/2026) :
// 500 F tout près, 1 000 F plus loin, 1 500 à 2 000 F très loin.
// LE CLASSEMENT DES QUARTIERS EST UNE PROPOSITION de Claude, d'après la distance : à corriger par Esther.
export type Quartier = {
  nom: string;
  ville: "Cotonou" | "Abomey-Calavi";
  frais: number;
};

const cotonou = (frais: number, noms: string[]): Quartier[] =>
  noms.map((nom) => ({ nom, ville: "Cotonou", frais }));

export const QUARTIERS: Quartier[] = [
  ...cotonou(500, [
    "Akpakpa centre",
    "Abokicodji",
    "Agbato",
    "Avotrou",
    "Ayélawadjè",
    "Dandji",
    "Kpondéhou",
    "Midombo",
    "Missessin",
    "PK3",
    "Sènadé",
    "Sodjèatinmè",
    "Suru-Léré",
    "Tanto",
    "Yénawa",
  ]),
  ...cotonou(1000, [
    "Cadjèhoun",
    "Dantokpa",
    "Ganhi",
    "Gbégamey",
    "Haie Vive",
    "Jonquet",
    "Les Cocotiers",
    "Missèbo",
    "Patte d’Oie",
    "Saint-Michel",
    "Sainte-Rita",
    "Sikècodji",
    "Wologuèdè",
    "Zongo",
  ]),
  ...cotonou(1500, [
    "Agla",
    "Aïbatin",
    "Fidjrossè",
    "Houéyiho",
    "Kouhounou",
    "Mènontin",
    "Vèdoko",
    "Vodjè",
    "Zogbo",
    "Autre quartier de Cotonou",
  ]),
  ...[
    "Akassato",
    "Calavi centre",
    "Cocotomey",
    "Godomey",
    "Tankpè",
    "Togoudo",
    "Womey",
    "Zogbadjè",
    "Autre quartier de Calavi",
  ].map((nom): Quartier => ({ nom, ville: "Abomey-Calavi", frais: 2000 })),
];

export const LIVRAISON = {
  mini: Math.min(...QUARTIERS.map((q) => q.frais)),
  maxi: Math.max(...QUARTIERS.map((q) => q.frais)),
};

// Horaires d'Esther (11/2026) : lundi 10 h à 19 h, mardi au samedi 15 h 30 à 19 h 30, fermé le dimanche.
// Indice 0 = dimanche. 30 minutes de délai entre la commande et la livraison.
export const HORAIRES: ({ ouverture: string; fermeture: string } | null)[] = [
  null,
  { ouverture: "10:00", fermeture: "19:00" },
  { ouverture: "15:30", fermeture: "19:30" },
  { ouverture: "15:30", fermeture: "19:30" },
  { ouverture: "15:30", fermeture: "19:30" },
  { ouverture: "15:30", fermeture: "19:30" },
  { ouverture: "15:30", fermeture: "19:30" },
];
export const DELAI = 30;
export const HORAIRES_TEXTE =
  "le lundi de 10 h à 19 h, du mardi au samedi de 15 h 30 à 19 h 30";
export const CONTENANCE = "500 ml";

const enMinutes = (h: string) => {
  const [a, b] = h.split(":").map(Number);
  return a * 60 + b;
};
const enClair = (h: string) => h.replace(":00", " h").replace(":", " h ");

export const horairesDu = (jour: string) =>
  jour ? HORAIRES[new Date(`${jour}T12:00`).getDay()] : null;

// L'heure qu'il est à Cotonou, où que se trouve le téléphone du client
export function maintenantCotonou() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Porto-Novo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const v = (t: string) => parts.find((x) => x.type === t)!.value;
  return {
    date: `${v("year")}-${v("month")}-${v("day")}`,
    minutes: Number(v("hour")) * 60 + Number(v("minute")),
  };
}

// Peut-on commander « dès que possible » ? Oui si Esther est ouverte et qu'il reste le temps de livrer.
export function ouvertMaintenant() {
  const m = maintenantCotonou();
  const h = horairesDu(m.date);
  return (
    !!h &&
    m.minutes >= enMinutes(h.ouverture) &&
    m.minutes + DELAI <= enMinutes(h.fermeture)
  );
}

export function erreurCreneau(jour: string, heure: string): string | null {
  if (!jour || !heure) return null;
  const h = horairesDu(jour);
  if (!h)
    return "Esther ne livre pas le dimanche. Choisissez un jour du lundi au samedi.";
  const t = enMinutes(heure);
  if (t < enMinutes(h.ouverture) || t > enMinutes(h.fermeture))
    return `Ce jour-là, les livraisons se font de ${enClair(h.ouverture)} à ${enClair(h.fermeture)}.`;
  const m = maintenantCotonou();
  if (jour < m.date) return "Ce jour est déjà passé.";
  if (jour === m.date && t < m.minutes + DELAI)
    return `Il faut au moins ${DELAI} minutes pour préparer et livrer. Choisissez une heure plus tard.`;
  return null;
}

// ---------- Les tournées de livraison
// Au lieu d'une course par commande, les commandes d'une même zone partent ensemble à heure fixe.
// Une zone = un tarif de livraison. Plus la zone est proche d'Akpakpa, plus elle a de tournées.
// HEURES, CAPACITÉ ET DÉLAIS SONT UNE PROPOSITION de Claude (11/2026), à régler par Esther.
export const ZONES: Record<number, string> = {
  500: "Akpakpa et environs",
  1000: "Centre de Cotonou",
  1500: "Ouest de Cotonou",
  2000: "Abomey-Calavi",
};
// Heure d'arrivée prévue chez le client, par zone
const TOURNEES_LUNDI: Record<number, string[]> = {
  500: ["11:00", "12:30", "14:00", "15:30", "17:00", "18:30"],
  1000: ["11:30", "13:30", "15:30", "17:30"],
  1500: ["12:00", "15:00", "18:00"],
  2000: ["12:00", "15:00", "18:00"],
};
const TOURNEES_SEMAINE: Record<number, string[]> = {
  500: ["16:15", "17:15", "18:15", "19:15"],
  1000: ["16:30", "18:00", "19:15"],
  1500: ["17:00", "18:45"],
  2000: ["17:00", "18:45"],
};
// Minutes entre la dernière commande acceptée et l'arrivée : préparation + trajet
export const AVANCE: Record<number, number> = { 500: 45, 1000: 45, 1500: 60, 2000: 60 };
// Gobelets qu'un livreur emporte en une tournée. Les commandes de groupe ont leur propre course.
export const CAPACITE = 12;
// Commandes de groupe : au moins dix gobelets, passées la veille au plus tard
export const MINI_GROUPE = 10;

// Personnalisation des gobelets pour les commandes de groupe.
// SUPPLÉMENT ET DÉLAI DE L'AUTOCOLLANT SONT PROVISOIRES (11/2026) : à fixer après le devis de l'imprimeur.
export const PERSONNALISATIONS = [
  { id: "aucune", nom: "Sans personnalisation", texte: "Le sceau d’Esther seul.", prix: 0, delai: 1 },
  { id: "prenoms", nom: "Un prénom par gobelet", texte: "Esther écrit le prénom de chaque invité.", prix: 0, delai: 1 },
  {
    id: "autocollant",
    nom: "Un autocollant à votre nom",
    texte: "Votre logo ou le nom de la fête, collé à côté du sceau d’Esther.",
    prix: 200, // par gobelet
    delai: 4, // jours entre la commande et la livraison, le temps d'imprimer
  },
] as const;
export type Personnalisation = (typeof PERSONNALISATIONS)[number]["id"];

const dansJours = (n: number) => {
  const d = new Date(`${maintenantCotonou().date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function tourneesDu(jour: string, frais: number): string[] {
  if (!jour) return [];
  const j = new Date(`${jour}T12:00`).getDay();
  if (j === 0) return [];
  return (j === 1 ? TOURNEES_LUNDI : TOURNEES_SEMAINE)[frais] ?? [];
}

// Les sept prochains jours où Esther livre, aujourd'hui compris
export function joursOuverts(n = 7, delai = 0): string[] {
  const jours: string[] = [];
  const d = new Date(`${dansJours(delai)}T12:00:00Z`);
  while (jours.length < n) {
    if (d.getUTCDay() !== 0) jours.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return jours;
}

// La tournée existe-t-elle, et est-il encore temps de s'y inscrire ?
export function erreurTournee(jour: string, heure: string, frais: number, groupe = false, delai = 1): string | null {
  if (!tourneesDu(jour, frais).includes(heure)) return "Choisissez une tournée de livraison.";
  const m = maintenantCotonou();
  if (jour < m.date) return "Ce jour est déjà passé.";
  if (groupe)
    return jour >= dansJours(delai)
      ? null
      : delai > 1
        ? `Avec un autocollant à imprimer, la livraison se fait au plus tôt dans ${delai} jours.`
        : "Une commande de groupe se passe la veille au plus tard.";
  if (jour === m.date && enMinutes(heure) - (AVANCE[frais] ?? 60) < m.minutes)
    return "Cette tournée est déjà en préparation. Choisissez la suivante.";
  return null;
}

export const heureEnClair = (h: string) => h.replace(":00", " h").replace(":", " h ");
export const jourEnClair = (jour: string) => {
  const m = maintenantCotonou().date;
  const texte = new Date(`${jour}T12:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return jour === m ? `Aujourd’hui, ${texte}` : texte.charAt(0).toUpperCase() + texte.slice(1);
};

export type Ligne = {
  cle: string;
  latte: string;
  lait: string;
  sirops: string[];
  supplements: string[];
  quantite: number;
};

export const cleLigne = (l: Omit<Ligne, "cle" | "quantite">) =>
  [
    l.latte,
    l.lait,
    [...l.sirops].sort().join("+"),
    [...l.supplements].sort().join("+"),
  ].join("|");

const trouve = (liste: Option[], id: string | null) =>
  liste.find((o) => o.id === id);

export function prixLigne(l: Ligne): number {
  const latte = LATTES.find((x) => x.id === l.latte);
  if (!latte) return 0;
  const extras =
    (trouve(LAITS, l.lait)?.prix ?? 0) +
    l.sirops.reduce((s, id) => s + (trouve(SIROPS, id)?.prix ?? 0), 0) +
    l.supplements.reduce(
      (s, id) => s + (trouve(SUPPLEMENTS, id)?.prix ?? 0),
      0,
    );
  return (latte.prix + extras) * l.quantite;
}

export function detailLigne(l: Ligne, avecLait = true): string {
  const parts = avecLait ? [trouve(LAITS, l.lait)?.nom] : [];
  for (const id of l.sirops) {
    const sirop = trouve(SIROPS, id);
    if (sirop) parts.push(`sirop ${sirop.nom.toLowerCase()}`);
  }
  for (const id of l.supplements) parts.push(trouve(SUPPLEMENTS, id)?.nom);
  return parts.filter(Boolean).join(", ");
}

export const fcfa = (n: number) =>
  `${new Intl.NumberFormat("fr-FR").format(n)} F`;
