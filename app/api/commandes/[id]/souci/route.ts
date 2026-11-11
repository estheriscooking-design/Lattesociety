// Le client signale un souci sur sa commande depuis la page de suivi.
import { signalerSouci } from "@/lib/commandes";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { message } = (await req.json().catch(() => ({}))) as { message?: string };
  const m = typeof message === "string" ? message.trim().slice(0, 500) : "";
  if (!m) return Response.json({ erreur: "Écrivez votre message." }, { status: 400 });
  const c = await signalerSouci(id, m);
  return c ? Response.json({ ok: true }) : Response.json({ erreur: "Message non reçu." }, { status: 409 });
}
