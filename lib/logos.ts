// Le logo qu'un client envoie pour l'autocollant d'une commande de groupe.
// En ligne : Supabase Storage (compartiment privé « latte-logos »). En local : un fichier dans .data/logos.
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "application/pdf": "pdf" };
const DOSSIER = path.join(process.cwd(), ".data", "logos");
const supabase = () =>
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? { url: `${process.env.SUPABASE_URL}/storage/v1/object/latte-logos`, cle: process.env.SUPABASE_SERVICE_ROLE_KEY }
    : null;

// Renvoie un message de refus, ou null si le fichier est enregistré.
export async function enregistrerLogo(id: string, donnees: string): Promise<string | null> {
  const m = /^data:([a-z/]+);base64,([A-Za-z0-9+/=]+)$/.exec(donnees);
  const ext = m ? TYPES[m[1]] : undefined;
  if (!m || !ext) return "Le logo doit être une image PNG ou JPEG, ou un PDF.";
  const octets = Buffer.from(m[2], "base64");
  if (octets.length > 2_000_000) return "Le logo dépasse 2 Mo.";
  const s = supabase();
  if (s) {
    const r = await fetch(`${s.url}/${id}.${ext}`, {
      method: "POST",
      headers: { apikey: s.cle, Authorization: `Bearer ${s.cle}`, "Content-Type": m[1] },
      body: octets,
    });
    return r.ok ? null : "Le logo n’a pas pu être enregistré. Réessayez.";
  }
  await mkdir(DOSSIER, { recursive: true });
  await writeFile(path.join(DOSSIER, `${id}.${ext}`), octets);
  return null;
}

export async function lireLogo(id: string): Promise<{ type: string; octets: Buffer } | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const s = supabase();
  for (const [type, ext] of Object.entries(TYPES)) {
    if (s) {
      const r = await fetch(`${s.url}/${id}.${ext}`, { headers: { apikey: s.cle, Authorization: `Bearer ${s.cle}` }, cache: "no-store" });
      if (r.ok) return { type, octets: Buffer.from(await r.arrayBuffer()) };
    } else if ((await readdir(DOSSIER).catch(() => [] as string[])).includes(`${id}.${ext}`)) {
      return { type, octets: await readFile(path.join(DOSSIER, `${id}.${ext}`)) };
    }
  }
  return null;
}
