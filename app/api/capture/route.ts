// Outil de développement : enregistre les vignettes du gobelet dans public/lattes.
// Sert quand on ajoute une saveur (voir `__capture` dans components/Gobelet.tsx).
// Ne répond qu'en développement.
import { writeFile } from "node:fs/promises";
import path from "node:path";

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("non", { status: 404 });
  const { id, png } = (await req.json()) as { id: string; png: string };
  if (!/^[a-z-]+$/.test(id)) return new Response("id", { status: 400 });
  await writeFile(path.join(process.cwd(), "public", "lattes", `${id}.png`), Buffer.from(png.split(",")[1], "base64"));
  return Response.json({ ok: true });
}
