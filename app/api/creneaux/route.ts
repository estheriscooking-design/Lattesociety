// Les tournées encore ouvertes pour un quartier, avec les places qui restent.
import { PERSONNALISATIONS, QUARTIERS, ZONES } from "@/lib/carte";
import { tourneesOuvertes } from "@/lib/commandes";

export async function POST(req: Request) {
  const { quartier, groupe, perso } = (await req.json().catch(() => ({}))) as {
    quartier?: string;
    groupe?: boolean;
    perso?: string;
  };
  const delai = PERSONNALISATIONS.find((x) => x.id === perso)?.delai ?? 1;
  const q = QUARTIERS.find((x) => x.nom === quartier);
  if (!q) return Response.json({ erreur: "Quartier inconnu." }, { status: 400 });
  return Response.json(
    { zone: ZONES[q.frais], frais: q.frais, jours: await tourneesOuvertes(q.frais, groupe === true, delai) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
