import { NextResponse } from "next/server";
import { COOKIE, codeJuste, jeton } from "@/lib/esther";

export async function POST(req: Request) {
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  if (typeof code !== "string" || !codeJuste(code.trim())) {
    await new Promise((r) => setTimeout(r, 800)); // ralentit les essais au hasard
    return Response.json({ erreur: "Code incorrect." }, { status: 401 });
  }
  const r = NextResponse.json({ ok: true });
  r.cookies.set(COOKIE, jeton()!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return r;
}
