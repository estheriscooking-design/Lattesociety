// Compte une visite du site ou un panier ouvert. Aucune donnée personnelle.
import { QUOI, noter, type Quoi } from "@/lib/visites";

export async function POST(req: Request) {
  const { quoi } = (await req.json().catch(() => ({}))) as { quoi?: Quoi };
  if (!quoi || !QUOI.includes(quoi)) return Response.json({ erreur: "Inconnu." }, { status: 400 });
  await noter(quoi).catch((e) => console.error("Visite non comptée", e));
  return Response.json({ ok: true });
}
