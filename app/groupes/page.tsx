"use client";

// La commande pour un bureau ou un événement : beaucoup de lattés, une seule livraison, une seule facture.
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import Tournees from "@/components/Tournees";
import {
  LAITS,
  LATTES,
  MINI_GROUPE,
  QUARTIERS,
  cleLigne,
  fcfa,
  heureEnClair,
  jourEnClair,
  prixLigne,
  type Ligne,
} from "@/lib/carte";

const CARTE = LATTES.filter((l) => !l.libre);

export default function Groupes() {
  const [quantites, setQuantites] = useState<Record<string, number>>({});
  const [f, setF] = useState({
    societe: "",
    nom: "",
    telephone: "",
    quartier: "",
    lieu: "",
    jour: "",
    heure: "",
    note: "",
    facture: false,
  });
  const [envoi, setEnvoi] = useState(false);
  const [refus, setRefus] = useState("");
  const champ = (k: "societe" | "nom" | "telephone" | "quartier" | "lieu" | "note") => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setF((x) => ({ ...x, [k]: e.target.value })),
  });

  const lignes: Ligne[] = CARTE.flatMap((latte) =>
    LAITS.flatMap((lait) => {
      const quantite = quantites[`${latte.id}|${lait.id}`] ?? 0;
      if (!quantite) return [];
      const l = { latte: latte.id, lait: lait.id, sirops: [], supplements: [], quantite };
      return [{ ...l, cle: cleLigne(l) }];
    }),
  );
  const gobelets = lignes.reduce((s, l) => s + l.quantite, 0);
  const total = lignes.reduce((s, l) => s + prixLigne(l), 0);
  const frais = QUARTIERS.find((q) => q.nom === f.quartier)?.frais ?? 0;
  const manque = MINI_GROUPE - gobelets;
  const changer = (cle: string, d: number) =>
    setQuantites((q) => ({ ...q, [cle]: Math.min(100, Math.max(0, (q[cle] ?? 0) + d)) }));

  const payer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manque > 0 || !f.jour || !f.heure) return;
    setEnvoi(true);
    setRefus("");
    try {
      const r = await fetch("/api/commandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, groupe: true, cadeau: false, lignes }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erreur);
      window.location.assign(j.url);
    } catch (err) {
      setRefus(
        err instanceof Error && err.message
          ? err.message
          : "La commande n’est pas partie. Vérifiez votre connexion et réessayez.",
      );
      setEnvoi(false);
    }
  };

  return (
    <main className="suivi">
      <Link href="/" aria-label="The Latte Society, accueil">
        <Image src="/logo/autocollant-orange.png" alt="" width={1024} height={1024} sizes="140px" priority />
      </Link>
      <h1>Pour le bureau ou la fête.</h1>
      <p>
        À partir de {MINI_GROUPE} lattés, Esther prépare tout pour la même heure et le livreur vient en une seule
        course. Commandez la veille au plus tard. Le paiement se fait en ligne, en une fois.
      </p>

      <form className="groupe" onSubmit={payer}>
        <section className="suivi-detail">
          <h2>Les lattés</h2>
          <ul className="lignes">
            {CARTE.map((latte) => (
              <li key={latte.id} className="ligne">
                <span className="ligne-couleur" style={{ background: latte.teinte }} aria-hidden="true" />
                <div className="ligne-texte">
                  <strong>{latte.nom}</strong>
                  <span>{fcfa(latte.prix)}</span>
                </div>
                <div className="groupe-laits">
                  {LAITS.map((lait) => {
                    const cle = `${latte.id}|${lait.id}`;
                    return (
                      <div key={lait.id} className="groupe-lait">
                        <span>
                          {lait.nom}
                          {lait.prix ? `, + ${fcfa(lait.prix)}` : ""}
                        </span>
                        <div className="compteur">
                          <button
                            type="button"
                            aria-label={`Un ${latte.nom} au ${lait.nom.toLowerCase()} de moins`}
                            onClick={() => changer(cle, -1)}
                          >
                            −
                          </button>
                          <output>{quantites[cle] ?? 0}</output>
                          <button
                            type="button"
                            aria-label={`Un ${latte.nom} au ${lait.nom.toLowerCase()} de plus`}
                            onClick={() => changer(cle, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
          <p>
            {gobelets} latté{gobelets > 1 ? "s" : ""} choisi{gobelets > 1 ? "s" : ""}.
            {manque > 0 ? ` Encore ${manque} pour atteindre ${MINI_GROUPE}.` : ""}
          </p>
        </section>

        <section className="suivi-detail">
          <h2>Pour qui</h2>
          <label className="champ">
            L’entreprise ou l’événement
            <input required placeholder="Cabinet Dossou, anniversaire de Mireille" {...champ("societe")} />
          </label>
          <label className="champ">
            Votre nom
            <input required autoComplete="name" {...champ("nom")} />
          </label>
          <label className="champ">
            Votre numéro
            <input required type="tel" inputMode="tel" autoComplete="tel" placeholder="01 00 00 00 00" {...champ("telephone")} />
          </label>
          <label className="case">
            <input
              type="checkbox"
              checked={f.facture}
              onChange={(e) => setF((x) => ({ ...x, facture: e.target.checked }))}
            />
            Il me faut une facture
          </label>
        </section>

        <section className="suivi-detail">
          <h2>La livraison</h2>
          <label className="champ">
            Le quartier
            <select required {...champ("quartier")}>
              <option value="">Choisissez le quartier</option>
              {(["Cotonou", "Abomey-Calavi"] as const).map((ville) => (
                <optgroup key={ville} label={ville}>
                  {QUARTIERS.filter((q) => q.ville === ville)
                    .sort(
                      (a, b) =>
                        Number(a.nom.startsWith("Autre")) - Number(b.nom.startsWith("Autre")) ||
                        a.nom.localeCompare(b.nom, "fr"),
                    )
                    .map((q) => (
                      <option key={q.nom} value={q.nom}>
                        {q.nom}, livraison {fcfa(q.frais)}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="champ">
            Le lieu de livraison
            <textarea
              required
              rows={3}
              placeholder="Immeuble, étage, repères, et la personne à demander à l’accueil."
              {...champ("lieu")}
            />
          </label>
          <Tournees
            quartier={f.quartier}
            gobelets={gobelets}
            groupe
            jour={f.jour}
            heure={f.heure}
            onChoisir={(jour, heure) => setF((x) => ({ ...x, jour, heure }))}
          />
          <label className="champ">
            Des précisions, si besoin
            <textarea rows={3} maxLength={500} placeholder="Une allergie, un prénom sur chaque gobelet." {...champ("note")} />
          </label>
        </section>

        <section className="suivi-detail">
          <h2>À payer</h2>
          <p className="total">
            <span>
              {gobelets} latté{gobelets > 1 ? "s" : ""}
            </span>
            <strong>{fcfa(total)}</strong>
          </p>
          <p className="total">
            <span>Livraison</span>
            <strong>{fcfa(frais)}</strong>
          </p>
          <p className="total total-fort">
            <span>Total</span>
            <strong>{fcfa(total + frais)}</strong>
          </p>
          {f.jour && f.heure && (
            <p>
              Livraison {jourEnClair(f.jour).toLowerCase()}, vers {heureEnClair(f.heure)}.
            </p>
          )}
          <button className="bouton bouton-grand bouton-large" disabled={envoi || manque > 0}>
            {envoi ? "Un instant…" : manque > 0 ? `Encore ${manque} lattés` : `Payer ${fcfa(total + frais)}`}
          </button>
          {refus && (
            <p className="erreur" role="alert">
              {refus}
            </p>
          )}
        </section>
      </form>
      <Link className="lien" href="/">
        Revenir à la carte
      </Link>
    </main>
  );
}
