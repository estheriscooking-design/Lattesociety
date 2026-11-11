"use client";

// Les tournées vues par Esther : ce qu'il faut préparer pour chaque départ, et la feuille du livreur.
import { LATTES, ZONES, detailLigne, heureEnClair, jourEnClair, type Ligne } from "@/lib/carte";

export type CommandeEsther = {
  id: string;
  numero: string;
  statut: string;
  lignes: Ligne[];
  nom: string;
  telephone: string;
  cadeau: { nom: string; telephone: string; mot: string } | null;
  groupe?: { societe: string; facture: boolean; note: string } | null;
  quartier: string;
  lieu: string;
  quand: "vite" | { jour: string; heure: string };
  frais: number;
};

const nomLatte = (id: string) => LATTES.find((x) => x.id === id)?.nom ?? id;
const gobelets = (c: CommandeEsther) => c.lignes.reduce((s, l) => s + l.quantite, 0);

export default function FeuillesDeRoute({
  commandes,
  avancer,
}: {
  commandes: CommandeEsther[];
  avancer: (id: string, statut: "en-route") => Promise<void>;
}) {
  // Une tournée = un jour, une heure, une zone. Une commande de groupe forme sa propre course.
  const tournees = new Map<string, { jour: string; heure: string; titre: string; liste: CommandeEsther[] }>();
  for (const c of commandes) {
    if (c.quand === "vite" || !["payee", "preparation", "en-route"].includes(c.statut)) continue;
    const cle = c.groupe ? `${c.quand.jour}|${c.quand.heure}|${c.id}` : `${c.quand.jour}|${c.quand.heure}|${c.frais}`;
    const t = tournees.get(cle) ?? {
      jour: c.quand.jour,
      heure: c.quand.heure,
      titre: c.groupe ? `Groupe : ${c.groupe.societe}` : (ZONES[c.frais] ?? c.quartier),
      liste: [],
    };
    t.liste.push(c);
    tournees.set(cle, t);
  }
  const triees = [...tournees.values()].sort((a, b) => `${a.jour}${a.heure}`.localeCompare(`${b.jour}${b.heure}`));
  if (triees.length === 0) return <p>Aucune tournée à venir.</p>;

  return (
    <div className="esther-colonnes">
      {triees.map((t) => {
        // Ce qu'il faut préparer, tous clients confondus
        const aFaire = new Map<string, number>();
        for (const c of t.liste)
          for (const l of c.lignes) {
            const nom = `${nomLatte(l.latte)} (${detailLigne(l).toLowerCase()})`;
            aFaire.set(nom, (aFaire.get(nom) ?? 0) + l.quantite);
          }
        const restent = t.liste.filter((c) => c.statut !== "en-route");
        const feuille = [
          `Tournée ${t.titre}, ${jourEnClair(t.jour).toLowerCase()}, arrivée vers ${heureEnClair(t.heure)}`,
          ...t.liste.map((c, i) =>
            [
              "",
              `${i + 1}. ${c.numero}, ${gobelets(c)} gobelet${gobelets(c) > 1 ? "s" : ""}`,
              `${c.cadeau?.nom ?? c.nom}, ${c.cadeau?.telephone ?? c.telephone}`,
              `${c.quartier}. ${c.lieu}`,
            ].join("\n"),
          ),
        ].join("\n");
        const total = t.liste.reduce((s, c) => s + gobelets(c), 0);
        return (
          <section key={`${t.jour}${t.heure}${t.titre}`}>
            <h2>
              {heureEnClair(t.heure)}, {t.titre}
            </h2>
            <p>
              {jourEnClair(t.jour)}. {t.liste.length} commande{t.liste.length > 1 ? "s" : ""}, {total} gobelet
              {total > 1 ? "s" : ""}.
            </p>
            <article className="bon">
              <h3>À préparer</h3>
              <ul>
                {[...aFaire.entries()].map(([nom, n]) => (
                  <li key={nom}>
                    <strong>
                      {n} × {nom}
                    </strong>
                  </li>
                ))}
              </ul>
              <h3>Les arrêts</h3>
              <ul>
                {t.liste.map((c) => (
                  <li key={c.id}>
                    <strong>
                      {c.numero}, {c.cadeau?.nom ?? c.nom}
                    </strong>
                    <span>
                      {c.quartier}. {c.lieu}
                    </span>
                  </li>
                ))}
              </ul>
              {restent.length > 0 ? (
                <button
                  className="bouton bouton-grand bouton-large"
                  onClick={async () => {
                    for (const c of restent) await avancer(c.id, "en-route");
                  }}
                >
                  Toute la tournée est partie
                </button>
              ) : (
                <p>Cette tournée est en route.</p>
              )}
              <a
                className="lien"
                target="_blank"
                rel="noreferrer"
                href={`https://wa.me/?text=${encodeURIComponent(feuille)}`}
              >
                Envoyer la feuille au livreur sur WhatsApp
              </a>
            </article>
          </section>
        );
      })}
    </div>
  );
}
