"use client";

// Le tableau de bord d'Esther. Des chiffres en tête, puis des barres d'une seule couleur,
// chacune avec sa valeur écrite : on lit le nombre, la barre ne fait que comparer.
import { useEffect, useState } from "react";
import { fcfa } from "@/lib/carte";
import type { Statistiques } from "@/lib/statistiques";

type Donnees = Statistiques & {
  alertes: string[];
  visites: { visites: number; paniers: number; avant: number };
};

const ecart = (a: number, b: number) => {
  if (b === 0)
    return a === 0 ? "comme la période d’avant" : "rien sur la période d’avant";
  const p = Math.round(((a - b) / b) * 100);
  return p === 0
    ? "comme la période d’avant"
    : `${p > 0 ? "+" : "−"}${Math.abs(p)} % sur la période d’avant`;
};
const minutes = (m: number | null) =>
  m === null ? "pas encore mesuré" : `${m} min`;

function Chiffre({
  titre,
  valeur,
  note,
}: {
  titre: string;
  valeur: string;
  note?: string;
}) {
  return (
    <div className="chiffre">
      <span>{titre}</span>
      <strong>{valeur}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

function Barres({
  titre,
  lignes,
  valeur,
  vide,
}: {
  titre: string;
  lignes: { nom: string; n: number; texte?: string }[];
  valeur?: (l: { nom: string; n: number }) => string;
  vide: string;
}) {
  const max = Math.max(1, ...lignes.map((l) => l.n));
  return (
    <section className="graphe">
      <h3>{titre}</h3>
      {lignes.every((l) => l.n === 0) ? (
        <p>{vide}</p>
      ) : (
        <table>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.nom} title={`${l.nom} : ${valeur ? valeur(l) : l.n}`}>
                <th scope="row">{l.nom}</th>
                <td className="graphe-piste">
                  <span
                    className="graphe-barre"
                    style={{ width: `${(l.n / max) * 100}%` }}
                  />
                </td>
                <td className="graphe-valeur">
                  {l.texte ?? (valeur ? valeur(l) : l.n)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function TableauDeBord() {
  const [jours, setJours] = useState(30);
  const [d, setD] = useState<Donnees | null>(null);

  useEffect(() => {
    let fini = false;
    fetch(`/api/esther/statistiques?jours=${jours}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!fini && j) setD(j);
      })
      .catch(() => {});
    return () => {
      fini = true;
    };
  }, [jours]);

  if (!d) return <p>Un instant, on fait les comptes.</p>;
  const r = d.resume;
  const p = d.precedent;
  const abandon = d.tunnel.creees
    ? Math.round(((d.tunnel.creees - d.tunnel.payees) / d.tunnel.creees) * 100)
    : 0;
  const jour = (iso: string) =>
    new Date(`${iso}T12:00`).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  return (
    <div className="tableau">
      <div className="choix-liste" role="group" aria-label="Période">
        {[7, 30, 90].map((n) => (
          <button
            key={n}
            className={jours === n ? "lait lait-choisi" : "lait"}
            aria-pressed={jours === n}
            onClick={() => setJours(n)}
          >
            {n} derniers jours
          </button>
        ))}
      </div>

      <section className="chiffres" aria-label="Les ventes">
        <Chiffre
          titre="Chiffre d’affaires des lattés"
          valeur={fcfa(r.ca)}
          note={ecart(r.ca, p.ca)}
        />
        <Chiffre
          titre="Commandes payées"
          valeur={String(r.commandes)}
          note={ecart(r.commandes, p.commandes)}
        />
        <Chiffre
          titre="Gobelets vendus"
          valeur={String(r.gobelets)}
          note={ecart(r.gobelets, p.gobelets)}
        />
        <Chiffre
          titre="Panier moyen"
          valeur={fcfa(r.panier)}
          note={`${String(r.gobeletsParCommande).replace(".", ",")} gobelet par commande`}
        />
        <Chiffre
          titre="Reversé aux livreurs"
          valeur={fcfa(r.livraison)}
          note="payé par les clients, pas un revenu"
        />
        <Chiffre
          titre="Commandes de groupe"
          valeur={String(d.groupes.n)}
          note={`${fcfa(d.groupes.ca)} de lattés`}
        />
        <Chiffre
          titre="Visites du site"
          valeur={String(d.visites.visites)}
          note={ecart(d.visites.visites, d.visites.avant)}
        />
        <Chiffre
          titre="Visites qui ouvrent le panier"
          valeur={
            d.visites.visites
              ? `${Math.round((d.visites.paniers / d.visites.visites) * 100)} %`
              : "pas encore mesuré"
          }
          note={`${d.visites.paniers} panier(s) ouvert(s)`}
        />
        <Chiffre
          titre="Visites qui finissent en commande payée"
          valeur={
            d.visites.visites
              ? `${Math.round((r.commandes / d.visites.visites) * 100)} %`
              : "pas encore mesuré"
          }
          note={`${r.commandes} commande(s) pour ${d.visites.visites} visite(s)`}
        />
        <Chiffre
          titre="Abandons au paiement"
          valeur={`${abandon} %`}
          note={`${d.tunnel.creees - d.tunnel.payees} commande(s) non payée(s) sur ${d.tunnel.creees}`}
        />
      </section>

      <div className="graphes">
        <Barres
          titre="Ventes par jour"
          lignes={d.parJour
            .slice(-14)
            .map((j) => ({
              nom: jour(j.jour),
              n: j.ca,
              texte: `${fcfa(j.ca)}, ${j.n} cde`,
            }))}
          vide="Aucune vente sur ces jours."
        />
        <Barres
          titre="Les lattés les plus vendus"
          lignes={d.lattes.map((l) => ({
            nom: l.nom,
            n: l.n,
            texte: `${l.n} gobelets, ${fcfa(l.ca)}`,
          }))}
          vide="Aucun latté vendu sur la période."
        />
        <Barres
          titre="Les jours de la semaine"
          lignes={d.semaine.map((j) => ({
            nom: j.nom,
            n: j.n,
            texte: `${j.n} cde, ${fcfa(j.ca)}`,
          }))}
          vide="Aucune commande sur la période."
        />
        <Barres
          titre="Les heures de livraison demandées"
          lignes={d.heures}
          valeur={(l) => `${l.n} cde`}
          vide="Aucune commande sur la période."
        />
        <Barres
          titre="Les quartiers"
          lignes={d.quartiers
            .slice(0, 10)
            .map((q) => ({
              nom: q.nom,
              n: q.n,
              texte: `${q.n} cde, ${fcfa(q.ca)}`,
            }))}
          vide="Aucune livraison sur la période."
        />
        <Barres
          titre="Les sirops du latté composé"
          lignes={d.sirops}
          valeur={(l) => `${l.n} fois`}
          vide="Aucun latté composé vendu."
        />
        <Barres
          titre="Les dessus du latté composé"
          lignes={d.dessus}
          valeur={(l) => `${l.n} fois`}
          vide="Aucun dessus choisi."
        />
      </div>

      <section className="chiffres" aria-label="Les habitudes">
        <Chiffre
          titre="Lait végétal"
          valeur={`${d.parts.vegetal} %`}
          note="des gobelets"
        />
        <Chiffre
          titre="Commandes cadeau"
          valeur={`${d.parts.cadeaux} %`}
          note="des commandes"
        />
        <Chiffre
          titre="Dès que possible"
          valeur={`${d.parts.immediates} %`}
          note="le reste est réservé à l’avance"
        />
      </section>

      <section className="chiffres" aria-label="Les délais">
        <Chiffre
          titre="Préparation"
          valeur={minutes(d.delais.preparation)}
          note="de « je la prépare » au départ, médiane"
        />
        <Chiffre
          titre="Trajet du livreur"
          valeur={minutes(d.delais.livraison)}
          note="du départ à la livraison, médiane"
        />
        <Chiffre
          titre="Du paiement à la livraison"
          valeur={minutes(d.delais.total)}
          note="commandes « dès que possible », médiane"
        />
        <Chiffre
          titre="Livrées en 45 minutes"
          valeur={
            d.delais.aTemps === null
              ? "pas encore mesuré"
              : `${d.delais.aTemps} %`
          }
          note={`sur ${d.delais.mesurees} commande(s) immédiate(s)`}
        />
      </section>

      <section className="chiffres" aria-label="Les clients">
        <Chiffre
          titre="Clients"
          valeur={String(d.clients.uniques)}
          note="reconnus à leur numéro"
        />
        <Chiffre
          titre="Nouveaux"
          valeur={String(d.clients.nouveaux)}
          note="première commande sur la période"
        />
        <Chiffre
          titre="Déjà venus"
          valeur={String(d.clients.fideles)}
          note="avaient commandé avant"
        />
        <Chiffre
          titre="Ont recommandé"
          valeur={`${d.clients.rachat} %`}
          note="au moins deux commandes sur la période"
        />
        <Chiffre
          titre="Note des clients"
          valeur={
            d.avis.moyenne === null
              ? "aucun avis"
              : `${String(d.avis.moyenne).replace(".", ",")} sur 5`
          }
          note={`${d.avis.nombre} avis`}
        />
      </section>

      <div className="graphes">
        <Barres
          titre="Les meilleurs clients"
          lignes={d.clients.meilleurs.map((c) => ({
            nom: c.nom,
            n: c.ca,
            texte: `${fcfa(c.ca)}, ${c.n} cde`,
          }))}
          vide="Aucun client sur la période."
        />
        <section className="graphe">
          <h3>Les derniers mots des clients</h3>
          {d.avis.derniers.length === 0 ? (
            <p>Aucun commentaire pour l’instant.</p>
          ) : (
            <ul className="avis">
              {d.avis.derniers.map((a) => (
                <li key={a.le}>
                  <strong>{a.note} sur 5</strong> {a.commentaire}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p>
        {d.alertes.length > 0
          ? `Alertes de nouvelle commande envoyées par ${d.alertes.join(" et ")}.`
          : "Aucune alerte de nouvelle commande n’est configurée : gardez cet écran ouvert pendant vos horaires."}
      </p>
    </div>
  );
}
