// Relie l'alerte de commande au Telegram d'Esther.
// Avant : créer le bot avec @BotFather, coller son jeton dans .env.local (TELEGRAM_BOT_TOKEN=...),
// puis écrire un message au bot depuis le téléphone d'Esther.
// Ce script retrouve la conversation, l'enregistre dans .env.local et envoie un message d'essai.
// Usage : node scripts/telegram.mjs
import { readFileSync, writeFileSync } from "node:fs";

const FICHIER = new URL("../.env.local", import.meta.url);
let env = readFileSync(FICHIER, "utf8");
const jeton = env.match(/^TELEGRAM_BOT_TOKEN=(.+)$/m)?.[1]?.trim();
if (!jeton) {
  console.error("Il manque la ligne TELEGRAM_BOT_TOKEN=... dans .env.local.");
  process.exit(1);
}
const api = (methode, corps) =>
  fetch(`https://api.telegram.org/bot${jeton}/${methode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps ?? {}),
  }).then((r) => r.json());

const moi = await api("getMe");
if (!moi.ok) {
  console.error("Telegram refuse ce jeton. Vérifiez qu'il est collé en entier.");
  process.exit(1);
}
const maj = await api("getUpdates");
const messages = (maj.result ?? []).map((u) => u.message).filter(Boolean);
const dernier = messages.at(-1);
if (!dernier) {
  console.error(`Aucun message reçu. Depuis le téléphone d'Esther, ouvrez @${moi.result.username}, appuyez sur Démarrer, puis relancez.`);
  process.exit(1);
}
const chat = String(dernier.chat.id);
env = /^TELEGRAM_CHAT_ID=/m.test(env)
  ? env.replace(/^TELEGRAM_CHAT_ID=.*$/m, `TELEGRAM_CHAT_ID=${chat}`)
  : `${env.trimEnd()}\nTELEGRAM_CHAT_ID=${chat}\n`;
writeFileSync(FICHIER, env);
const essai = await api("sendMessage", {
  chat_id: chat,
  text: "The Latte Society : l'alerte de commande est reliée. Chaque commande payée arrivera ici.",
});
console.log(
  essai.ok
    ? `Relié à ${dernier.chat.first_name ?? "la conversation"} via @${moi.result.username}. Message d'essai envoyé. Redémarrez le site pour qu'il prenne le réglage.`
    : "La conversation est enregistrée, mais le message d'essai n'est pas parti.",
);
