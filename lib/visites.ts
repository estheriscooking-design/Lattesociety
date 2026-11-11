// La mesure des visites : une ligne par visite du site et une par panier ouvert.
// Rien de personnel n'est gardé (ni adresse, ni appareil) : seulement l'heure et le type.
// Comme les commandes : Supabase en ligne (table latte_visites), un fichier en local.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const QUOI = ["visite", "panier"] as const;
export type Quoi = (typeof QUOI)[number];
type Ligne = { le: string; quoi: Quoi };

const FICHIER = path.join(process.cwd(), ".data", "visites.json");
const supabase = () =>
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? { url: `${process.env.SUPABASE_URL}/rest/v1/latte_visites`, cle: process.env.SUPABASE_SERVICE_ROLE_KEY }
    : null;
const entetes = (cle: string) => ({ apikey: cle, Authorization: `Bearer ${cle}`, "Content-Type": "application/json" });

async function lireFichier(): Promise<Ligne[]> {
  try {
    return JSON.parse(await readFile(FICHIER, "utf8"));
  } catch {
    return [];
  }
}
let file: Promise<unknown> = Promise.resolve(); // une écriture à la fois

export async function noter(quoi: Quoi) {
  const s = supabase();
  if (s) {
    await fetch(s.url, { method: "POST", headers: entetes(s.cle), body: JSON.stringify({ quoi }) });
    return;
  }
  file = file
    .then(async () => {
      const toutes = [...(await lireFichier()), { le: new Date().toISOString(), quoi }];
      await mkdir(path.dirname(FICHIER), { recursive: true });
      await writeFile(FICHIER, JSON.stringify(toutes));
    })
    .catch(() => {});
  await file;
}

async function nombre(quoi: Quoi, debut: number, fin: number) {
  const s = supabase();
  if (!s) {
    return (await lireFichier()).filter((l) => {
      const t = new Date(l.le).getTime();
      return l.quoi === quoi && t >= debut && t < fin;
    }).length;
  }
  const a = encodeURIComponent(new Date(debut).toISOString());
  const b = encodeURIComponent(new Date(fin).toISOString());
  const r = await fetch(`${s.url}?quoi=eq.${quoi}&le=gte.${a}&le=lt.${b}&select=id`, {
    method: "HEAD",
    headers: { ...entetes(s.cle), Prefer: "count=exact" },
    cache: "no-store",
  });
  return Number(r.headers.get("content-range")?.split("/")[1] ?? 0) || 0;
}

export async function compter(jours: number) {
  const fin = Date.now();
  const debut = fin - jours * 86400000;
  const [visites, paniers, avant] = await Promise.all([
    nombre("visite", debut, fin),
    nombre("panier", debut, fin),
    nombre("visite", debut - jours * 86400000, debut),
  ]);
  return { visites, paniers, avant };
}
