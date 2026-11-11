"use client";

// La page que reçoit la personne à qui on offre un latté : le mot, ce qui arrive, où en est la livraison.
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Vue = {
  statut: "payee" | "preparation" | "en-route" | "livree" | "annulee";
  pour: string;
  de: string;
  mot: string;
  lignes: { quantite: number; nom: string; detail: string }[];
  quand: "vite" | { jour: string; heure: string };
};

const ETAT: Record<Vue["statut"], string> = {
  payee: "Esther a reçu la commande.",
  preparation: "Esther is cooking. Votre latté est en préparation.",
  "en-route": "Le livreur est parti. Gardez votre téléphone près de vous.",
  livree: "Votre latté est livré. Bonne dégustation.",
  annulee: "Cette commande a été annulée.",
};

export default function Cadeau() {
  const [vue, setVue] = useState<Vue | null>(null);
  const [introuvable, setIntrouvable] = useState(false);

  useEffect(() => {
    const jeton = new URLSearchParams(window.location.search).get("k");
    let fini = false;
    const lire = async () => {
      const r = await fetch("/api/cadeau", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jeton }),
      }).catch(() => null);
      if (fini || !r) return;
      if (r.status === 404) return setIntrouvable(true);
      if (r.ok) setVue(await r.json());
    };
    lire();
    const tic = setInterval(lire, 15000);
    return () => {
      fini = true;
      clearInterval(tic);
    };
  }, []);

  return (
    <main className="suivi">
      <Link href="/" aria-label="The Latte Society, accueil">
        <Image src="/logo/autocollant-orange.png" alt="" width={1024} height={1024} sizes="140px" priority />
      </Link>
      {introuvable && (
        <>
          <h1>Cadeau introuvable.</h1>
          <p>Ce lien ne correspond à aucun cadeau. Vérifiez le lien reçu.</p>
        </>
      )}
      {!vue && !introuvable && <p>Un instant.</p>}
      {vue && (
        <>
          <h1>{vue.pour}, {vue.de} vous offre un latté.</h1>
          {vue.mot && <p className="mot">« {vue.mot} »</p>}
          <p>{ETAT[vue.statut]}</p>
          <section className="suivi-detail">
            <h2>Ce qui arrive</h2>
            <ul className="lignes">
              {vue.lignes.map((l, i) => (
                <li key={i} className="ligne">
                  <div className="ligne-texte">
                    <strong>
                      {l.quantite} × {l.nom}
                    </strong>
                    <span>{l.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
            <p>
              Livraison{" "}
              {vue.quand === "vite"
                ? "dès que possible"
                : `le ${new Date(`${vue.quand.jour}T12:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${vue.quand.heure.replace(":", " h ")}`}
              . Le livreur vous appelle en arrivant.
            </p>
          </section>
          <Link className="lien" href="/">
            Voir la carte de The Latte Society
          </Link>
        </>
      )}
    </main>
  );
}
