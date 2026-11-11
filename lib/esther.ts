// L'accès à l'écran d'Esther : un code (ESTHER_CODE), échangé contre un cookie.
import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const COOKIE = "esther";
export const jeton = () =>
  process.env.ESTHER_CODE ? createHash("sha256").update(`latte-society|${process.env.ESTHER_CODE}`).digest("hex") : null;

export function codeJuste(code: string) {
  const attendu = process.env.ESTHER_CODE;
  if (!attendu) return false;
  const a = createHash("sha256").update(code).digest();
  const b = createHash("sha256").update(attendu).digest();
  return timingSafeEqual(a, b);
}

export const connectee = (req: NextRequest) => {
  const j = jeton();
  return !!j && req.cookies.get(COOKIE)?.value === j;
};
