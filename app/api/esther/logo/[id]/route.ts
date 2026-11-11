// Le logo d'une commande de groupe, visible par Esther seulement.
import type { NextRequest } from "next/server";
import { connectee } from "@/lib/esther";
import { lireLogo } from "@/lib/logos";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!connectee(req)) return Response.json({ erreur: "Code demandé." }, { status: 401 });
  const logo = await lireLogo((await params).id);
  if (!logo) return Response.json({ erreur: "Logo introuvable." }, { status: 404 });
  return new Response(new Uint8Array(logo.octets), {
    headers: { "Content-Type": logo.type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
