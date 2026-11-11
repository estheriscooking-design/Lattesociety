// Compte une visite du site ou un panier ouvert. Aucune donnée personnelle.
import { QUOI, noter, sourceDe, type Quoi } from "@/lib/visites";

export async function POST(req: Request) {
  const { quoi, source } = (await req.json().catch(() => ({}))) as { quoi?: Quoi; source?: string };
  if (!quoi || !QUOI.includes(quoi)) return Response.json({ erreur: "Inconnu." }, { status: 400 });
  await noter(quoi, sourceDe(source)).catch((e) => console.error("Visite non comptée", e));
  return Response.json({ ok: true });
}
