"use client";

import { useEffect, useRef, useState } from "react";
import {
  DELAI,
  HORAIRES_TEXTE,
  LAITS,
  LATTES,
  QUARTIERS,
  cleLigne,
  detailLigne,
  erreurCreneau,
  fcfa,
  horairesDu,
  maintenantCotonou,
  ouvertMaintenant,
  prixLigne,
  type Ligne,
} from "@/lib/carte";

type Etape = "panier" | "livraison" | "recap";

export default function Commande({
  panier,
  setPanier,
  onFermer,
}: {
  panier: Ligne[];
  setPanier: React.Dispatch<React.SetStateAction<Ligne[]>>;
  onFermer: () => void;
}) {
  const boite = useRef<HTMLDialogElement>(null);
  const [etape, setEtape] = useState<Etape>("panier");
  const [ouvert] = useState(ouvertMaintenant); // Esther peut-elle livrer tout de suite ?
  const [aujourdhui] = useState(() => maintenantCotonou().date);
  const [f, setF] = useState(() => {
    // Les coordonnées de la dernière commande reviennent toutes seules
    let garde = { nom: "", telephone: "", quartier: "", lieu: "" };
    try {
      garde = {
        ...garde,
        ...JSON.parse(localStorage.getItem("latte-society-coordonnees") ?? "{}"),
      };
    } catch {}
    return {
      nom: garde.nom,
      telephone: garde.telephone,
      cadeau: false,
      pourNom: "",
      pourTelephone: "",
      mot: "",
      quartier: QUARTIERS.some((q) => q.nom === garde.quartier)
        ? garde.quartier
        : "",
      lieu: garde.lieu,
      quand: ouvert ? "vite" : "plus-tard",
      jour: "",
      heure: "",
    };
  });
  // La carte de la Society pour ce numéro : où elle en est, et le latté offert s'il y en a un
  const [carte, setCarte] = useState<{
    tampons: number;
    sur: number;
    remise: number;
  } | null>(null);
  const voirRecap = async () => {
    setCarte(null);
    setEtape("recap");
    const r = await fetch("/api/carte", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, lignes: panier }),
    }).catch(() => null);
    if (r?.ok) setCarte(await r.json());
  };
  const champ = (k: keyof typeof f) => ({
    value: f[k] as string,
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => setF((x) => ({ ...x, [k]: e.target.value })),
  });

  useEffect(() => {
    boite.current?.showModal();
  }, []);

  const total = panier.reduce((s, l) => s + prixLigne(l), 0);
  const [envoi, setEnvoi] = useState(false);
  const [refus, setRefus] = useState("");
  // Envoie la commande au serveur, qui recalcule le prix et renvoie l'adresse où payer
  const payer = async () => {
    setEnvoi(true);
    setRefus("");
    try {
      const r = await fetch("/api/commandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, lignes: panier }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erreur);
      try {
        localStorage.setItem("latte-society-derniere", JSON.stringify(panier));
        if (!f.cadeau)
          localStorage.setItem(
            "latte-society-coordonnees",
            JSON.stringify({
              nom: f.nom,
              telephone: f.telephone,
              quartier: f.quartier,
              lieu: f.lieu,
            }),
          );
        else
          localStorage.setItem(
            "latte-society-coordonnees",
            JSON.stringify({ nom: f.nom, telephone: f.telephone }),
          );
      } catch {}
      window.location.href = j.url;
    } catch (e) {
      setRefus(
        e instanceof Error && e.message
          ? e.message
          : "La commande n’est pas partie. Vérifiez votre connexion et réessayez.",
      );
      setEnvoi(false);
    }
  };

  const frais = QUARTIERS.find((q) => q.nom === f.quartier)?.frais ?? 0;
  const remise = carte?.remise ?? 0;
  const erreur =
    f.quand === "plus-tard" ? erreurCreneau(f.jour, f.heure) : null;
  const changer = (cle: string, d: number) =>
    setPanier((p) =>
      p.flatMap((l) =>
        l.cle !== cle
          ? [l]
          : l.quantite + d < 1
            ? []
            : [{ ...l, quantite: l.quantite + d }],
      ),
    );

  const changerLait = (cle: string, lait: string) =>
    setPanier((p) => {
      const ligne = p.find((l) => l.cle === cle);
      if (!ligne || ligne.lait === lait) return p;
      const nouvelle = { ...ligne, lait, cle: cleLigne({ ...ligne, lait }) };
      const jumelle = p.find((l) => l.cle === nouvelle.cle);
      if (jumelle)
        return p.flatMap((l) =>
          l.cle === cle
            ? []
            : l.cle === nouvelle.cle
              ? [{ ...l, quantite: l.quantite + ligne.quantite }]
              : [l],
        );
      return p.map((l) => (l.cle === cle ? nouvelle : l));
    });

  return (
    <dialog
      ref={boite}
      className="feuille feuille-cote"
      onClose={onFermer}
      aria-labelledby="commande-titre"
    >
      <div className="feuille-tete">
        <h2 id="commande-titre">
          {etape === "panier"
            ? "Votre commande"
            : etape === "livraison"
              ? "La livraison"
              : "Récapitulatif"}
        </h2>
        <button type="button" className="lien" onClick={onFermer}>
          Fermer
        </button>
      </div>

      {etape === "panier" && (
        <>
          <div className="feuille-corps">
            {panier.length === 0 && (
              <p>Votre commande est vide. Ajoutez un latté avec le bouton +.</p>
            )}
            <ul className="lignes">
              {panier.map((l) => {
                const latte = LATTES.find((x) => x.id === l.latte);
                if (!latte) return null;
                return (
                  <li key={l.cle} className="ligne">
                    <span
                      className="ligne-couleur"
                      style={{ background: latte.teinte }}
                      aria-hidden="true"
                    />
                    <div className="ligne-texte">
                      <strong>{latte.nom}</strong>
                      {detailLigne(l, false) && (
                        <span>{detailLigne(l, false)}</span>
                      )}
                      <span>{fcfa(prixLigne(l))}</span>
                      <span
                        className="laits"
                        role="group"
                        aria-label={`Lait du ${latte.nom}`}
                      >
                        {LAITS.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            className={
                              l.lait === o.id ? "lait lait-choisi" : "lait"
                            }
                            aria-pressed={l.lait === o.id}
                            onClick={() => changerLait(l.cle, o.id)}
                          >
                            {o.nom}
                            {o.prix ? `, + ${fcfa(o.prix)}` : ""}
                          </button>
                        ))}
                      </span>
                    </div>
                    <div className="compteur">
                      <button
                        type="button"
                        aria-label={`Un ${latte.nom} de moins`}
                        onClick={() => changer(l.cle, -1)}
                      >
                        −
                      </button>
                      <output>{l.quantite}</output>
                      <button
                        type="button"
                        aria-label={`Un ${latte.nom} de plus`}
                        onClick={() => changer(l.cle, 1)}
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          {panier.length > 0 && (
            <div className="feuille-pied">
              <p className="total">
                <span>Lattés</span>
                <strong>{fcfa(total)}</strong>
              </p>
              <button
                className="bouton bouton-grand bouton-large"
                onClick={() => setEtape("livraison")}
              >
                Continuer
              </button>
            </div>
          )}
        </>
      )}

      {etape === "livraison" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!erreur) voirRecap();
          }}
        >
          <div className="feuille-corps">
            <label className="champ">
              Votre nom
              <input required autoComplete="name" {...champ("nom")} />
            </label>
            <label className="champ">
              Votre numéro
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="01 00 00 00 00"
                {...champ("telephone")}
              />
            </label>

            <label className="case">
              <input
                type="checkbox"
                checked={f.cadeau}
                onChange={(e) =>
                  setF((x) => ({ ...x, cadeau: e.target.checked }))
                }
              />
              C’est un cadeau pour quelqu’un
            </label>
            {f.cadeau && (
              <>
                <label className="champ">
                  Le nom de la personne
                  <input required {...champ("pourNom")} />
                </label>
                <label className="champ">
                  Son numéro, pour que le livreur la joigne
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    {...champ("pourTelephone")}
                  />
                </label>
                <label className="champ">
                  Votre mot
                  <textarea
                    rows={3}
                    maxLength={240}
                    placeholder="Bon courage pour ton examen."
                    {...champ("mot")}
                  />
                </label>
              </>
            )}

            <label className="champ">
              Le quartier
              <select required {...champ("quartier")}>
                <option value="">Choisissez votre quartier</option>
                {(["Cotonou", "Abomey-Calavi"] as const).map((ville) => (
                  <optgroup key={ville} label={ville}>
                    {QUARTIERS.filter((q) => q.ville === ville)
                      .sort(
                        (a, b) =>
                          Number(a.nom.startsWith("Autre")) -
                            Number(b.nom.startsWith("Autre")) ||
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
                placeholder="Rue et repères : la pharmacie en face, le portail vert, le bureau au 2e étage."
                {...champ("lieu")}
              />
            </label>

            <fieldset className="choix">
              <legend>Pour quand ?</legend>
              <div className="choix-liste">
                {ouvert && (
                  <label
                    className={
                      f.quand === "vite" ? "option option-cochee" : "option"
                    }
                  >
                    <input
                      type="radio"
                      name="quand"
                      checked={f.quand === "vite"}
                      onChange={() => setF((x) => ({ ...x, quand: "vite" }))}
                    />
                    Dès que possible, environ {DELAI} minutes
                  </label>
                )}
                <label
                  className={
                    f.quand === "plus-tard" ? "option option-cochee" : "option"
                  }
                >
                  <input
                    type="radio"
                    name="quand"
                    checked={f.quand === "plus-tard"}
                    onChange={() => setF((x) => ({ ...x, quand: "plus-tard" }))}
                  />
                  Un jour et une heure précis
                </label>
              </div>
              {!ouvert && (
                <p>
                  Esther prépare {HORAIRES_TEXTE}. Elle est fermée en ce moment
                  : réservez votre créneau.
                </p>
              )}
            </fieldset>
            {f.quand === "plus-tard" && (
              <div className="duo">
                <label className="champ">
                  Le jour
                  <input
                    required
                    type="date"
                    min={aujourdhui}
                    {...champ("jour")}
                  />
                </label>
                <label className="champ">
                  L’heure
                  <input
                    required
                    type="time"
                    min={horairesDu(f.jour)?.ouverture}
                    max={horairesDu(f.jour)?.fermeture}
                    step={900}
                    {...champ("heure")}
                  />
                </label>
              </div>
            )}
            {erreur && (
              <p className="erreur" role="alert">
                {erreur}
              </p>
            )}
          </div>
          <div className="feuille-pied">
            <button className="bouton bouton-grand bouton-large" type="submit">
              Voir le récapitulatif
            </button>
            <button
              type="button"
              className="lien"
              onClick={() => setEtape("panier")}
            >
              Revenir au panier
            </button>
          </div>
        </form>
      )}

      {etape === "recap" && (
        <>
          <div className="feuille-corps">
            <ul className="lignes">
              {panier.map((l) => (
                <li key={l.cle} className="ligne">
                  <div className="ligne-texte">
                    <strong>
                      {l.quantite} × {LATTES.find((x) => x.id === l.latte)?.nom}
                    </strong>
                    <span>{detailLigne(l)}</span>
                  </div>
                  <span>{fcfa(prixLigne(l))}</span>
                </li>
              ))}
            </ul>
            <p>
              {f.cadeau
                ? `Pour ${f.pourNom}, de la part de ${f.nom}.`
                : `Pour ${f.nom}.`}{" "}
              Livraison à {f.quartier},{" "}
              {f.quand === "vite"
                ? "dès que possible"
                : `le ${new Date(`${f.jour}T12:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${f.heure}`}
              .
            </p>
            <p>{f.lieu}</p>
            {f.cadeau && f.mot && <p className="mot">« {f.mot} »</p>}
          </div>
          <div className="feuille-pied">
            <p className="total">
              <span>Lattés</span>
              <strong>{fcfa(total)}</strong>
            </p>
            <p className="total">
              <span>Livraison</span>
              <strong>{fcfa(frais)}</strong>
            </p>
            {remise > 0 && (
              <p className="total">
                <span>Carte de la Society, votre latté offert</span>
                <strong>− {fcfa(remise)}</strong>
              </p>
            )}
            <p className="total total-fort">
              <span>À payer</span>
              <strong>{fcfa(total + frais - remise)}</strong>
            </p>
            {carte && remise === 0 && (
              <p>
                Carte de la Society : {carte.tampons} latté
                {carte.tampons > 1 ? "s" : ""} sur {carte.sur}. Le dixième est
                offert.
              </p>
            )}
            <button
              type="button"
              className="bouton bouton-grand bouton-large"
              disabled={envoi}
              onClick={payer}
            >
              {envoi ? "Un instant…" : `Payer ${fcfa(total + frais - remise)}`}
            </button>
            {refus && (
              <p className="erreur" role="alert">
                {refus}
              </p>
            )}
            <button
              type="button"
              className="lien"
              onClick={() => setEtape("livraison")}
            >
              Modifier la livraison
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
