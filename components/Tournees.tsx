"use client";

// Le choix de la tournée de livraison : les commandes d'une même zone partent ensemble à heure fixe.
// Le serveur dit quelles tournées sont encore ouvertes et combien de places il y reste.
import { useEffect, useState } from "react";
import { heureEnClair, jourEnClair } from "@/lib/carte";

type Jour = { jour: string; tournees: { heure: string; places: number | null }[] };

export default function Tournees({
  quartier,
  gobelets,
  groupe = false,
  jour,
  heure,
  onChoisir,
}: {
  quartier: string;
  gobelets: number;
  groupe?: boolean;
  jour: string;
  heure: string;
  onChoisir: (jour: string, heure: string) => void;
}) {
  const [etat, setEtat] = useState<{ quartier: string; zone: string; jours: Jour[] } | null>(null);

  useEffect(() => {
    if (!quartier) return;
    let fini = false;
    fetch("/api/creneaux", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quartier, groupe }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { zone: string; jours: Jour[] } | null) => {
        if (fini || !j) return;
        setEtat({ quartier, ...j });
        // La première tournée qui a assez de place est proposée d'office
        const libre = (t: Jour["tournees"][number]) => t.places === null || t.places >= gobelets;
        const garde = j.jours.find((x) => x.jour === jour)?.tournees.find((t) => t.heure === heure);
        if (garde && libre(garde)) return;
        for (const x of j.jours) {
          const t = x.tournees.find(libre);
          if (t) return onChoisir(x.jour, t.heure);
        }
        onChoisir("", "");
      })
      .catch(() => {});
    return () => {
      fini = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on ne recharge que si le quartier ou la taille de la commande change
  }, [quartier, gobelets, groupe]);

  if (!quartier) return <p>Choisissez d’abord le quartier : les heures de livraison en dépendent.</p>;
  if (!etat || etat.quartier !== quartier) return <p>Un instant, on regarde les tournées.</p>;
  const duJour = etat.jours.find((x) => x.jour === jour) ?? etat.jours[0];
  if (!duJour) return <p className="erreur">Aucune tournée ouverte pour ce quartier cette semaine.</p>;

  return (
    <>
      <label className="champ">
        Le jour
        <select
          value={duJour.jour}
          onChange={(e) => {
            const x = etat.jours.find((d) => d.jour === e.target.value)!;
            const t = x.tournees.find((t) => t.places === null || t.places >= gobelets);
            onChoisir(x.jour, t?.heure ?? "");
          }}
        >
          {etat.jours.map((x) => (
            <option key={x.jour} value={x.jour}>
              {jourEnClair(x.jour)}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="choix">
        <legend>L’heure de livraison, {etat.zone.toLowerCase().startsWith("a") ? `zone d’${etat.zone}` : `zone ${etat.zone}`}</legend>
        <div className="choix-liste">
          {duJour.tournees.map((t) => {
            const plein = t.places !== null && t.places < gobelets;
            const coche = duJour.jour === jour && t.heure === heure;
            return (
              <label key={t.heure} className={coche ? "option option-cochee" : "option"}>
                <input
                  type="radio"
                  name="tournee"
                  required
                  disabled={plein}
                  checked={coche}
                  onChange={() => onChoisir(duJour.jour, t.heure)}
                />
                Vers {heureEnClair(t.heure)}
                {plein
                  ? t.places === 0
                    ? ", complet"
                    : `, plus que ${t.places} place${t.places! > 1 ? "s" : ""}`
                  : t.places !== null && t.places <= 4
                    ? `, plus que ${t.places} place${t.places > 1 ? "s" : ""}`
                    : ""}
              </label>
            );
          })}
        </div>
        <p>
          {groupe
            ? "Une commande de groupe part dans sa propre course, à l’heure choisie."
            : "Les commandes d’une même zone partent ensemble. C’est ce qui garde la livraison à ce prix."}
        </p>
      </fieldset>
    </>
  );
}
