"use client";

// Mode démonstration : remplace la page de paiement FedaPay tant qu'aucune clé n'est configurée.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PaiementDemo() {
  const [id, setId] = useState("");
  const [erreur, setErreur] = useState("");
  const routeur = useRouter();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'adresse ne se lit que dans le navigateur
    setId(new URLSearchParams(window.location.search).get("c") ?? "");
  }, []);

  const payer = async () => {
    const r = await fetch("/api/paiement/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (r.ok) routeur.push(`/suivi?c=${id}`);
    else setErreur("Ce mode de démonstration est fermé, ou la commande est introuvable.");
  };

  return (
    <main className="suivi">
      <h1>Paiement de démonstration.</h1>
      <p>
        Le compte FedaPay n’est pas encore relié à ce site. Aucun argent ne circule ici : ce bouton fait comme si le
        paiement avait réussi, pour essayer la suite du parcours.
      </p>
      <button className="bouton bouton-grand" onClick={payer} disabled={!id}>
        Simuler un paiement réussi
      </button>
      <a className="lien" href={`/suivi?c=${id}`}>
        Abandonner le paiement
      </a>
      {erreur && (
        <p className="erreur" role="alert">
          {erreur}
        </p>
      )}
    </main>
  );
}
