"use client";

// Le suivi d'une commande par le client. La page se met à jour toute seule.
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fcfa } from "@/lib/carte";

type Vue = {
  numero: string;
  statut:
    "attente" | "payee" | "preparation" | "en-route" | "livree" | "annulee";
  lignes: { quantite: number; nom: string; detail: string }[];
  total: number;
  frais: number;
  quand: "vite" | { jour: string; heure: string };
  quartier: string;
  pour: string | null;
  avis: number | null;
  remise: number;
  cadeau: string | null;
  souci: boolean;
  carte: { tampons: number; offert: boolean };
};

const ETAPES = [
  {
    statut: "payee",
    titre: "Commande reçue.",
    texte: "Votre paiement est arrivé. Esther a votre commande.",
  },
  {
    statut: "preparation",
    titre: "Esther is cooking.",
    texte: "Votre latté est en préparation.",
  },
  {
    statut: "en-route",
    titre: "C’est en route.",
    texte: "Le livreur est parti. Gardez votre téléphone près de vous.",
  },
  {
    statut: "livree",
    titre: "Bonne dégustation.",
    texte: "Votre commande est livrée. Merci.",
  },
] as const;

export default function Suivi() {
  const [vue, setVue] = useState<Vue | null>(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [note, setNote] = useState(0);
  const [mot, setMot] = useState("");
  const [merci, setMerci] = useState(false);
  const [souci, setSouci] = useState<"ferme" | "ouvert" | "envoye">("ferme");
  const [message, setMessage] = useState("");
  const [copie, setCopie] = useState(false);

  // Le lien à envoyer à la personne à qui on offre : il ne montre ni le prix ni l'adresse
  const prevenir = async (v: Vue) => {
    const url = `${window.location.origin}/cadeau?k=${v.cadeau}`;
    const text = `${v.pour}, un latté de The Latte Society arrive pour vous. Suivez-le ici :`;
    try {
      if (navigator.share) return await navigator.share({ text, url });
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopie(true);
    } catch {}
  };

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("c");
    let fini = false;
    const lire = async () => {
      if (!id) return setIntrouvable(true);
      const r = await fetch(`/api/commandes/${id}`, {
        cache: "no-store",
      }).catch(() => null);
      if (fini || !r) return;
      if (r.status === 404) return setIntrouvable(true);
      if (!r.ok) return;
      const v = (await r.json()) as Vue;
      setVue(v);
      if (v.statut !== "attente") {
        try {
          localStorage.removeItem("latte-society-panier-2"); // la commande est payée : le panier repart de zéro
          localStorage.setItem("latte-society-suivi", id);
        } catch {}
      }
    };
    lire();
    const tic = setInterval(lire, 15000);
    return () => {
      fini = true;
      clearInterval(tic);
    };
  }, []);

  const rang = vue ? ETAPES.findIndex((e) => e.statut === vue.statut) : -1;
  const etape = rang >= 0 ? ETAPES[rang] : null;

  return (
    <main className="suivi">
      <Link href="/" aria-label="The Latte Society, accueil">
        <Image
          src="/logo/autocollant-orange.png"
          alt=""
          width={1024}
          height={1024}
          sizes="140px"
          priority
        />
      </Link>

      {introuvable && (
        <>
          <h1>Commande introuvable.</h1>
          <p>
            Ce lien ne correspond à aucune commande. Vérifiez le lien reçu, ou
            repassez par la carte.
          </p>
        </>
      )}
      {!vue && !introuvable && <p>Un instant, on retrouve votre commande.</p>}

      {vue && (
        <>
          {vue.statut === "attente" && (
            <>
              <h1>Paiement en attente.</h1>
              <p>
                Nous n’avons pas encore reçu la confirmation de votre paiement.
                Cette page se met à jour toute seule. Si vous avez abandonné le
                paiement, repassez votre commande depuis la carte.
              </p>
            </>
          )}
          {vue.statut === "annulee" && (
            <>
              <h1>Commande annulée.</h1>
              <p>
                Cette commande a été annulée. Esther vous appelle pour le
                remboursement.
              </p>
            </>
          )}
          {etape && (
            <>
              <h1>{etape.titre}</h1>
              <p>{etape.texte}</p>
              <ol className="etapes">
                {ETAPES.map((e, i) => (
                  <li
                    key={e.statut}
                    className={
                      i < rang
                        ? "etape-faite"
                        : i === rang
                          ? "etape-actuelle"
                          : ""
                    }
                  >
                    {e.titre.replace(/\.$/, "")}
                  </li>
                ))}
              </ol>
            </>
          )}

          {vue.cadeau && vue.statut !== "attente" && vue.statut !== "annulee" && vue.statut !== "livree" && (
            <div className="suivi-action">
              <button className="bouton bouton-grand" onClick={() => prevenir(vue)}>
                Prévenir {vue.pour}
              </button>
              <p>
                {copie
                  ? "Le message est copié. Collez-le dans une conversation."
                  : "Envoyez-lui le lien de son cadeau. Il montre votre mot et l’avancée de la livraison, pas le prix."}
              </p>
            </div>
          )}

          {vue.statut === "livree" && (vue.avis || merci) && (
            <p className="mot">Merci pour votre avis.</p>
          )}

          {vue.statut === "livree" && !vue.avis && !merci && (
            <form
              className="avis-form"

              onSubmit={async (e) => {
                e.preventDefault();

                const id = new URLSearchParams(window.location.search).get("c");

                const r = await fetch(`/api/commandes/${id}/avis`, {
                  method: "POST",

                  headers: { "Content-Type": "application/json" },

                  body: JSON.stringify({ note, commentaire: mot }),
                });

                if (r.ok) setMerci(true);
              }}
            >
              <fieldset className="choix">
                <legend>C’était comment ?</legend>

                <div className="choix-liste">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label
                      key={n}
                      className={note === n ? "option option-cochee" : "option"}
                    >
                      <input
                        type="radio"
                        name="note"
                        required
                        checked={note === n}
                        onChange={() => setNote(n)}
                      />
                      {n} sur 5
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="champ">
                Un mot pour Esther, si vous voulez
                <textarea
                  rows={2}
                  maxLength={400}
                  value={mot}
                  onChange={(e) => setMot(e.target.value)}
                />
              </label>

              <button className="bouton bouton-grand">Envoyer mon avis</button>
            </form>
          )}

          <section className="suivi-detail">
            <h2>Commande {vue.numero}</h2>
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
              {vue.pour ? `Pour ${vue.pour}. ` : ""}Livraison à {vue.quartier},{" "}
              {vue.quand === "vite"
                ? "dès que possible"
                : `le ${new Date(`${vue.quand.jour}T12:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${vue.quand.heure.replace(":", " h ")}`}
              .
            </p>
            {vue.remise > 0 && (
              <p className="total">
                <span>Carte de la Society, latté offert</span>
                <strong>− {fcfa(vue.remise)}</strong>
              </p>
            )}
            <p className="total total-fort">
              <span>Payé, livraison comprise</span>
              <strong>{fcfa(vue.total)}</strong>
            </p>
          </section>
          {vue.statut !== "attente" && vue.statut !== "annulee" && (
            <section className="suivi-detail">
              <h2>Votre carte de la Society</h2>
              <p>
                {vue.carte.offert
                  ? "Votre prochain latté est offert. Il se déduit tout seul à la prochaine commande passée avec le même numéro."
                  : `${vue.carte.tampons} latté${vue.carte.tampons > 1 ? "s" : ""} sur 9. Le dixième est offert.`}
              </p>
              <p className="tampons" aria-hidden="true">
                {Array.from({ length: 9 }, (_, i) => (
                  <span key={i} className={i < vue.carte.tampons ? "tampon tampon-pose" : "tampon"} />
                ))}
              </p>
            </section>
          )}

          {vue.statut !== "attente" && (
            <section className="suivi-detail">
              {souci === "ferme" && !vue.souci && (
                <button className="lien" onClick={() => setSouci("ouvert")}>
                  Un souci avec ma commande ?
                </button>
              )}
              {souci === "ouvert" && (
                <form
                  className="avis-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const id = new URLSearchParams(window.location.search).get("c");
                    const r = await fetch(`/api/commandes/${id}/souci`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ message }),
                    });
                    if (r.ok) setSouci("envoye");
                  }}
                >
                  <label className="champ">
                    Dites à Esther ce qui ne va pas
                    <textarea
                      required
                      rows={3}
                      maxLength={500}
                      placeholder="Le livreur ne trouve pas le portail. Il manque un latté."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </label>
                  <button className="bouton bouton-grand">Envoyer à Esther</button>
                </form>
              )}
              {(souci === "envoye" || (vue.souci && souci !== "ouvert")) && (
                <>
                  <p className="mot">
                    Esther a reçu votre message. Elle vous appelle au numéro de la commande.
                  </p>
                  {souci !== "envoye" && (
                    <button className="lien" onClick={() => setSouci("ouvert")}>
                      Envoyer un autre message
                    </button>
                  )}
                </>
              )}
            </section>
          )}
          <Link className="lien" href="/">
            Revenir à la carte
          </Link>
        </>
      )}
    </main>
  );
}
