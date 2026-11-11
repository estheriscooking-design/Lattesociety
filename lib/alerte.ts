// Prévenir Esther dès qu'une commande est payée, avec tout le détail.
// Deux canaux possibles, activés par les variables d'environnement présentes :
// - Telegram : TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (gratuit, immédiat sur le téléphone) ;
// - e-mail par Resend : RESEND_API_KEY + ALERTE_EMAIL (+ ALERTE_EXPEDITEUR).
// Sans aucune variable, rien n'est envoyé : la commande reste visible sur l'écran d'Esther.
import { LATTES, detailLigne, fcfa } from "./carte";
import type { Commande } from "./commandes";

export const canauxAlerte = () => [
  ...(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID ? ["Telegram"] : []),
  ...(process.env.RESEND_API_KEY && process.env.ALERTE_EMAIL ? ["e-mail"] : []),
];

export function texteAlerte(c: Commande, origine = process.env.SITE_URL ?? "") {
  const quand =
    c.quand === "vite"
      ? "Dès que possible"
      : `Pour le ${new Date(`${c.quand.jour}T12:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${c.quand.heure.replace(":", " h ")}`;
  return [
    `Nouvelle commande ${c.numero}`,
    quand,
    "",
    ...c.lignes.map((l) => `${l.quantite} × ${LATTES.find((x) => x.id === l.latte)?.nom ?? l.latte} (${detailLigne(l)})`),
    "",
    c.cadeau
      ? `Cadeau pour ${c.cadeau.nom}, ${c.cadeau.telephone}. Offert par ${c.nom}, ${c.telephone}.`
      : `${c.nom}, ${c.telephone}`,
    ...(c.cadeau?.mot ? [`Mot : « ${c.cadeau.mot} »`] : []),
    `${c.quartier}. ${c.lieu}`,
    "",
    `Payé ${fcfa(c.total)}, dont ${fcfa(c.frais)} pour le livreur.`,
    ...(c.remise ? [`Carte de la Society : un latté offert (${fcfa(c.remise)}).`] : []),
    ...(origine ? ["", `${origine}/esther`] : []),
  ].join("\n");
}

export const alerter = (c: Commande) => envoyer(`Nouvelle commande ${c.numero}, ${fcfa(c.total)}`, texteAlerte(c));

export async function envoyer(sujet: string, texte: string) {
  const envois: Promise<unknown>[] = [];
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
    envois.push(
      fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: texte }),
      }).then((r) => (r.ok ? null : Promise.reject(new Error(`Telegram ${r.status}`)))),
    );
  if (process.env.RESEND_API_KEY && process.env.ALERTE_EMAIL)
    envois.push(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.ALERTE_EXPEDITEUR ?? "The Latte Society <onboarding@resend.dev>",
          to: process.env.ALERTE_EMAIL,
          subject: sujet,
          text: texte,
        }),
      }).then((r) => (r.ok ? null : Promise.reject(new Error(`Resend ${r.status}`)))),
    );
  const resultats = await Promise.allSettled(envois);
  for (const r of resultats) if (r.status === "rejected") console.error("Alerte", r.reason);
}
