"use client";

// L'écran d'Esther : les commandes payées arrivent ici, elle les fait avancer d'un bouton.
import { useCallback, useEffect, useRef, useState } from "react";
import TableauDeBord from "@/components/TableauDeBord";
import { LATTES, detailLigne, fcfa, type Ligne } from "@/lib/carte";

type Statut =
  "attente" | "payee" | "preparation" | "en-route" | "livree" | "annulee";
type Commande = {
  id: string;
  numero: string;
  creeLe: string;
  statut: Statut;
  lignes: Ligne[];
  nom: string;
  telephone: string;
  cadeau: { nom: string; telephone: string; mot: string } | null;
  quartier: string;
  lieu: string;
  quand: "vite" | { jour: string; heure: string };
  total: number;
  frais: number;
  remise?: number;
  lienCadeau?: string | null;
  historique?: { statut: Statut; le: string }[];
  soucis?: { message: string; le: string }[];
};

const COLONNES: {
  statut: Statut;
  titre: string;
  vide: string;
  suite?: { vers: Statut; bouton: string };
}[] = [
  {
    statut: "payee",
    titre: "À préparer",
    vide: "Rien à préparer pour l’instant.",
    suite: { vers: "preparation", bouton: "Je la prépare" },
  },
  {
    statut: "preparation",
    titre: "En préparation",
    vide: "Aucune commande en cours.",
    suite: { vers: "en-route", bouton: "Elle est partie" },
  },
  {
    statut: "en-route",
    titre: "En route",
    vide: "Aucune livraison en cours.",
    suite: { vers: "livree", bouton: "Elle est livrée" },
  },
  { statut: "livree", titre: "Livrées aujourd’hui", vide: "Aucune commande livrée aujourd’hui." },
];

const heure = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Porto-Novo",
  });

// Le lien WhatsApp qui ouvre une conversation avec le message déjà écrit : Esther n'a qu'à envoyer.
// Les numéros du Bénin : dix chiffres commençant par 01, ou huit chiffres à l'ancienne.
const whatsapp = (telephone: string, message: string) => {
  let n = telephone.replace(/\D/g, "").replace(/^00/, "");
  if (n.length === 8) n = `22901${n}`;
  else if (n.length === 10 && n.startsWith("01")) n = `229${n}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
};
const messageDepart = (c: Commande, origine: string) =>
  c.cadeau
    ? `Bonjour ${c.cadeau.nom}, ici Esther de The Latte Society. ${c.nom} vous offre un latté, le livreur vient de partir. Suivez-le ici : ${origine}/cadeau?k=${c.lienCadeau}`
    : `Bonjour ${c.nom}, ici Esther de The Latte Society. Votre commande ${c.numero} vient de partir. Suivez-la ici : ${origine}/suivi?c=${c.id}`;

// Le jour où la commande a été livrée (et non celui où elle a été passée)
const livreeLe = (c: Commande) =>
  new Date(
    c.historique?.findLast((h) => h.statut === "livree")?.le ?? c.creeLe,
  ).toDateString();

export default function Esther() {
  const [etat, setEtat] = useState<"chargement" | "code" | "ouvert">(
    "chargement",
  );
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [demo, setDemo] = useState(false);
  const [onglet, setOnglet] = useState<"commandes" | "tableau">("commandes");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState("");
  const connues = useRef<Set<string> | null>(null);

  const sonner = () => {
    try {
      const audio = new AudioContext();
      const note = audio.createOscillator();
      const volume = audio.createGain();
      note.frequency.value = 880;
      volume.gain.setValueAtTime(0.25, audio.currentTime);
      volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.6);
      note.connect(volume).connect(audio.destination);
      note.start();
      note.stop(audio.currentTime + 0.6);
    } catch {}
  };

  const charger = useCallback(async () => {
    const r = await fetch("/api/esther/commandes", { cache: "no-store" }).catch(
      () => null,
    );
    if (!r) return;
    if (r.status === 401) return setEtat("code");
    if (!r.ok) return;
    const j = (await r.json()) as { commandes: Commande[]; demo: boolean };
    const aPreparer = j.commandes
      .filter((c) => c.statut === "payee")
      .map((c) => c.id);
    if (connues.current && aPreparer.some((id) => !connues.current!.has(id)))
      sonner();
    connues.current = new Set(aPreparer);
    setCommandes(j.commandes);
    setDemo(j.demo);
    setEtat("ouvert");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- premier chargement des commandes
    charger();
    const tic = setInterval(charger, 10000);
    return () => clearInterval(tic);
  }, [charger]);

  const avancer = async (id: string, statut: Statut) => {
    await fetch(`/api/esther/commandes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    charger();
  };

  if (etat === "chargement") return <main className="esther" />;

  if (etat === "code")
    return (
      <main className="esther">
        <form
          className="esther-code"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await fetch("/api/esther/connexion", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code }),
            });
            if (r.ok) {
              setErreur("");
              charger();
            } else setErreur("Code incorrect.");
          }}
        >
          <h1>Les commandes</h1>
          <label className="champ">
            Code d’accès
            <input
              type="password"
              autoComplete="current-password"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <button className="bouton bouton-grand">Entrer</button>
          {erreur && (
            <p className="erreur" role="alert">
              {erreur}
            </p>
          )}
        </form>
      </main>
    );

  const aujourdhui = new Date().toDateString();
  const attente = commandes.filter((c) => c.statut === "attente").length;

  return (
    <main className="esther">
      <header className="esther-tete">
        <div className="choix-liste" role="tablist">
          <button
            role="tab"
            aria-selected={onglet === "commandes"}
            className={onglet === "commandes" ? "lait lait-choisi" : "lait"}
            onClick={() => setOnglet("commandes")}
          >
            Les commandes
          </button>
          <button
            role="tab"
            aria-selected={onglet === "tableau"}
            className={onglet === "tableau" ? "lait lait-choisi" : "lait"}
            onClick={() => setOnglet("tableau")}
          >
            Le tableau de bord
          </button>
        </div>
        <h1>
          {onglet === "commandes" ? "Les commandes" : "Le tableau de bord"}
        </h1>
        <p>
          La page se met à jour toutes les dix secondes et sonne quand une
          commande payée arrive.
          {attente > 0
            ? ` ${attente} commande${attente > 1 ? "s" : ""} en attente de paiement.`
            : ""}
        </p>
        {demo && (
          <p className="erreur">
            Mode démonstration : FedaPay n’est pas relié, les paiements sont
            simulés.
          </p>
        )}
      </header>
      {onglet === "tableau" && <TableauDeBord />}
      <div className="esther-colonnes" hidden={onglet !== "commandes"}>
        {COLONNES.map((col) => {
          const liste = commandes.filter(
            (c) =>
              c.statut === col.statut &&
              (col.statut !== "livree" || livreeLe(c) === aujourdhui),
          );
          return (
            <section key={col.statut}>
              <h2>
                {col.titre} ({liste.length})
              </h2>
              {liste.length === 0 && <p>{col.vide}</p>}
              {liste.map((c) => (
                <article key={c.id} className="bon">
                  <h3>
                    {c.numero},{" "}
                    {c.quand === "vite"
                      ? `dès que possible (commandé à ${heure(c.creeLe)})`
                      : `pour le ${new Date(`${c.quand.jour}T12:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${c.quand.heure.replace(":", " h ")}`}
                  </h3>
                  <ul>
                    {c.lignes.map((l) => (
                      <li key={l.cle}>
                        <strong>
                          {l.quantite} ×{" "}
                          {LATTES.find((x) => x.id === l.latte)?.nom ?? l.latte}
                        </strong>
                        <span>{detailLigne(l)}</span>
                      </li>
                    ))}
                  </ul>
                  {c.cadeau ? (
                    <>
                      <p>
                        Cadeau pour <strong>{c.cadeau.nom}</strong>,{" "}
                        <a href={`tel:${c.cadeau.telephone}`}>
                          {c.cadeau.telephone}
                        </a>
                        . Offert par {c.nom},{" "}
                        <a href={`tel:${c.telephone}`}>{c.telephone}</a>.
                      </p>
                      {c.cadeau.mot && (
                        <p className="mot">« {c.cadeau.mot} »</p>
                      )}
                    </>
                  ) : (
                    <p>
                      <strong>{c.nom}</strong>,{" "}
                      <a href={`tel:${c.telephone}`}>{c.telephone}</a>
                    </p>
                  )}
                  <p>
                    <strong>{c.quartier}</strong>. {c.lieu}
                  </p>
                  <p>
                    Payé {fcfa(c.total)}, dont {fcfa(c.frais)} pour le livreur.
                    {c.remise
                      ? ` Carte de la Society : un latté offert (${fcfa(c.remise)}).`
                      : ""}
                  </p>
                  {c.soucis?.map((s) => (
                    <p key={s.le} className="erreur" role="alert">
                      Souci signalé à {heure(s.le)} : « {s.message} »
                    </p>
                  ))}
                  {col.suite && (
                    <button
                      className="bouton bouton-grand bouton-large"
                      onClick={() => avancer(c.id, col.suite!.vers)}
                    >
                      {col.suite.bouton}
                    </button>
                  )}
                  {col.statut === "en-route" && (
                    <a
                      className="lien"
                      target="_blank"
                      rel="noreferrer"
                      href={whatsapp(
                        c.cadeau?.telephone ?? c.telephone,
                        messageDepart(c, window.location.origin),
                      )}
                    >
                      Prévenir {c.cadeau?.nom ?? c.nom} sur WhatsApp
                    </a>
                  )}
                  {col.suite && (
                    <button
                      className="lien"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Annuler la commande ${c.numero} ? Le client verra « Commande annulée ». Le remboursement de ${fcfa(c.total)} reste à faire depuis FedaPay.`,
                          )
                        )
                          avancer(c.id, "annulee");
                      }}
                    >
                      Annuler cette commande
                    </button>
                  )}
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </main>
  );
}
