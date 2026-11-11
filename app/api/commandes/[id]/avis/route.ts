// L'avis du client, une fois la commande livrée : une note de 1 à 5 et un mot facultatif.
import { laisserAvis } from "@/lib/commandes";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { note, commentaire } = (await req.json().catch(() => ({}))) as { note?: number; commentaire?: string };
  const n = Math.round(Number(note));
  if (!(n >= 1 && n <= 5)) return Response.json({ erreur: "Note de 1 à 5." }, { status: 400 });
  const c = await laisserAvis(id, n, typeof commentaire === "string" ? commentaire.trim().slice(0, 400) : "");
  return c ? Response.json({ ok: true }) : Response.json({ erreur: "Avis déjà donné ou commande non livrée." }, { status: 409 });
}
