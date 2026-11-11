"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Gobelet from "./Gobelet";
import Commande from "./Commande";
import {
  LAITS,
  CONTENANCE,
  HORAIRES_TEXTE,
  LATTES,
  LIVRAISON,
  MAX_DESSUS,
  MAX_SIROPS,
  SIROPS,
  SUPPLEMENTS,
  cleLigne,
  fcfa,
  prixLigne,
  type Latte,
  type Ligne,
  type Option,
} from "@/lib/carte";

const CLE = "latte-society-panier-2";
const NOMBRES = ["Zéro", "Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix", "Onze", "Douze"];

export default function Boutique() {
  const [latte, setLatte] = useState(1);
  const [panier, setPanier] = useState<Ligne[]>([]);
  const [compose, setCompose] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [charge, setCharge] = useState(false);
  const [suivi, setSuivi] = useState<string | null>(null); // dernière commande payée sur ce téléphone
  const [derniere, setDerniere] = useState<Ligne[]>([]); // ce qu'elle contenait, pour recommander d'un geste

  useEffect(() => {
    try {
      const brut = localStorage.getItem(CLE);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- le panier enregistré ne se lit qu'après l'hydratation
      if (brut) setPanier(JSON.parse(brut));
      setSuivi(localStorage.getItem("latte-society-suivi"));
      const avant = JSON.parse(localStorage.getItem("latte-society-derniere") ?? "[]") as Ligne[];
      setDerniere(avant.filter((l) => LATTES.some((x) => x.id === l.latte)));
    } catch {}
    setCharge(true);
  }, []);
  // On n'enregistre qu'une fois le panier relu, sinon on l'écrase par un panier vide
  useEffect(() => {
    if (!charge) return;
    try {
      localStorage.setItem(CLE, JSON.stringify(panier));
    } catch {}
  }, [panier, charge]);

  // Mesure des visites : une par session de navigation, et une quand le panier s'ouvre pour la première fois
  const compter = (quoi: "visite" | "panier") => {
    let source = "direct";
    try {
      // Le lien court (/ig, /tt, /wa) ajoute ?de=… : on le retient pour la visite et pour la commande
      const de = new URLSearchParams(window.location.search).get("de");
      if (de) sessionStorage.setItem("latte-society-source", de);
      source = sessionStorage.getItem("latte-society-source") ?? "direct";
      if (sessionStorage.getItem(`latte-society-${quoi}`)) return;
      sessionStorage.setItem(`latte-society-${quoi}`, "1");
    } catch {}
    fetch("/api/visite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoi, source }),
      keepalive: true,
    }).catch(() => {});
  };
  useEffect(() => compter("visite"), []);
  useEffect(() => {
    if (ouvert) compter("panier");
  }, [ouvert]);

  // La couronne tourne avec le défilement
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let prevu = 0;
    const tourner = () => {
      prevu = 0;
      document.documentElement.style.setProperty("--tour", `${(window.scrollY * 0.06).toFixed(1)}deg`);
    };
    const defile = () => {
      if (!prevu) prevu = requestAnimationFrame(tourner);
    };
    window.addEventListener("scroll", defile, { passive: true });
    return () => {
      window.removeEventListener("scroll", defile);
      cancelAnimationFrame(prevu);
    };
  }, []);

  const ajouter = useCallback((l: Omit<Ligne, "cle">) => {
    const cle = cleLigne(l);
    setPanier((p) => {
      const deja = p.find((x) => x.cle === cle);
      if (deja) return p.map((x) => (x.cle === cle ? { ...x, quantite: x.quantite + l.quantite } : x));
      return [...p, { ...l, cle }];
    });
  }, []);

  // Le bouton − d'une tuile retire un gobelet de ce latté, d'abord la dernière ligne ajoutée
  const retirer = useCallback((id: string) => {
    setPanier((p) => {
      const i = p.findLastIndex((l) => l.latte === id);
      if (i < 0) return p;
      return p.flatMap((l, n) => (n !== i ? [l] : l.quantite > 1 ? [{ ...l, quantite: l.quantite - 1 }] : []));
    });
  }, []);

  const combien = (id: string) => panier.reduce((s, l) => s + (l.latte === id ? l.quantite : 0), 0);
  const nombre = panier.reduce((s, l) => s + l.quantite, 0);
  const total = panier.reduce((s, l) => s + prixLigne(l), 0);
  const actif = LATTES[latte];

  const achat = (l: Latte, visible = true) =>
    l.libre ? (
      <button className="bouton bouton-grand" tabIndex={visible ? 0 : -1} onClick={() => setCompose(true)}>
        Composer{combien(l.id) > 0 ? ` (${combien(l.id)})` : ""}
      </button>
    ) : (
      <Compteur
        nom={l.nom}
        valeur={combien(l.id)}
        visible={visible}
        onMoins={() => retirer(l.id)}
        onPlus={() => ajouter({ latte: l.id, lait: "classique", sirops: [], supplements: [], quantite: 1 })}
      />
    );

  return (
    <div className="page" style={{ "--fond": actif.fond } as React.CSSProperties}>
      <Gobelet onLatte={setLatte} />

      <div className="corps">
        <header className="barre">
          <div className="barre-dedans">
            <a href="#haut" className="barre-logo" aria-label="The Latte Society, haut de page">
              <Image src="/logo/script-brun.png" alt="Esther is cooking" width={600} height={357} priority />
            </a>
            <nav className="barre-liens" aria-label="Sections">
              <a href="#carte">La carte</a>
              <a href="#offrir">Offrir</a>
              <Link href="/groupes">Bureaux et fêtes</Link>
              <a href="#livraison">Livraison</a>
            </nav>
            <a className="bouton" href="#commander">
              Commander
            </a>
          </div>
        </header>

        <main id="haut">
          <section className="heros">
            <div className="heros-texte">
              <h1>
                <span>Esther prépare</span> <span>le vôtre.</span>
              </h1>
              <p>
                {NOMBRES[LATTES.length - 1]} lattés signature, ou le vôtre à composer. Faits à la commande et livrés à Cotonou et Calavi, du
                lundi au samedi. Gobelet de {CONTENANCE}, à partir de {fcfa(Math.min(...LATTES.map((l) => l.prix)))}.
              </p>
              <div className="heros-actions">
                <a className="bouton bouton-grand" href="#commander">
                  Commander
                </a>
                <a className="lien" href="#offrir">
                  En offrir un
                </a>
                {suivi && (
                  <a className="lien" href={`/suivi?c=${suivi}`}>
                    Suivre ma commande
                  </a>
                )}
                {suivi && derniere.length > 0 && (
                  <button
                    className="lien"
                    onClick={() => {
                      setPanier(derniere);
                      setOuvert(true);
                    }}
                  >
                    La même chose que la dernière fois
                  </button>
                )}
              </div>
            </div>
            <div className="heros-gobelet" data-gobelet data-latte="1">
              <Couronne />
            </div>
          </section>

          <div className="bande" aria-hidden="true">
            <div className="bande-file">
              {[0, 1].map((n) => (
                <p key={n}>
                  Esther is cooking ✦ The Latte Society ✦ Esther is cooking ✦ The Latte Society ✦ Esther is cooking ✦
                  The Latte Society ✦{" "}
                </p>
              ))}
            </div>
          </div>

          <section className="sequence" id="carte" style={{ height: `${LATTES.length * 80}vh` }}>
            <div className="sequence-fixe">
              <div className="sequence-textes">
                {LATTES.map((l, i) => (
                  <article key={l.id} className={i === latte ? "fiche fiche-active" : "fiche"} aria-hidden={i !== latte}>
                    <h2>{l.nom}</h2>
                    <p>{l.texte}</p>
                    <div className="fiche-achat">
                      <span className="prix">{fcfa(l.prix)}</span>
                      {achat(l, i === latte)}
                    </div>
                  </article>
                ))}
              </div>
              <div className="sequence-gobelet" data-gobelet data-sequence="carte" style={{ color: actif.teinte }}>
                <Couronne />
              </div>
              <ol className="sequence-liste" aria-label="La carte">
                {LATTES.map((l, i) => (
                  <li key={l.id}>
                    <button
                      className={i === latte ? "pastille pastille-active" : "pastille"}
                      style={{ background: l.teinte }}
                      aria-label={l.nom}
                      aria-current={i === latte}
                      onClick={() => {
                        const s = document.getElementById("carte");
                        if (!s) return;
                        const haut = s.getBoundingClientRect().top + window.scrollY;
                        const course = s.offsetHeight - window.innerHeight;
                        window.scrollTo({ top: haut + (course * (i + 0.25)) / LATTES.length, behavior: "smooth" });
                      }}
                    />
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="commander" id="commander">
            <div className="commander-tete">
              <h2>Composez votre commande</h2>
              <p>
                Ajoutez vos lattés avec le bouton +. Tous sont servis en gobelet de {CONTENANCE}. Le lait, classique ou végétal, se choisit ensuite dans votre
                commande.
              </p>
            </div>
            <ul className="tuiles">
              {LATTES.map((l) => (
                <li key={l.id} className="tuile">
                  <div className="tuile-image" style={{ background: l.fond }}>
                    <Image
                      src={`/lattes/${l.id}.png`}
                      alt=""
                      width={720}
                      height={720}
                      sizes="(max-width: 860px) 50vw, 33vw"
                    />
                  </div>
                  <h3>{l.nom}</h3>
                  <p>{l.libre ? "Sirops et dessus compris" : l.sirop ? `Sirop ${l.sirop.toLowerCase()}` : "Recette d’Esther"}</p>
                  <p className="tuile-prix">{fcfa(l.prix)}</p>
                  {achat(l)}
                </li>
              ))}
            </ul>
          </section>

          <section className="vrai">
            <h2>Ce que vous recevez, photographié chez Esther.</h2>
            <div className="vrai-photos">
              {[2, 4, 3].map((n) => (
                <Image
                  key={n}
                  src={`/photos/esther-${n}.jpg`}
                  alt="Lattés glacés préparés par Esther, dans leurs gobelets"
                  width={619}
                  height={1100}
                  sizes="(max-width: 700px) 70vw, 30vw"
                />
              ))}
            </div>
          </section>

          <section className="offrir" id="offrir">
            <div className="offrir-texte">
              <h2>Offrez-en un à quelqu’un.</h2>
              <p>
                Au moment de commander, indiquez que c’est un cadeau. Vous donnez le nom et le numéro de la personne,
                l’endroit où la trouver, et le mot qu’Esther glissera avec le gobelet.
              </p>
              <a className="bouton bouton-grand" href="#commander">
                Choisir le latté à offrir
              </a>
            </div>
            <Image
              className="offrir-sceau"
              src="/logo/autocollant-orange.png"
              alt=""
              width={1024}
              height={1024}
              sizes="(max-width: 700px) 60vw, 360px"
            />
          </section>

          <section className="livraison" id="livraison">
            <h2>La livraison</h2>
            <dl>
              <div>
                <dt>Où</dt>
                <dd>Cotonou et Abomey-Calavi.</dd>
              </div>
              <div>
                <dt>Quand</dt>
                <dd>
                  Esther prépare {HORAIRES_TEXTE}. Comptez 30 minutes entre votre commande et la livraison,
                  ou réservez à l’avance pour une heure précise.
                </dd>
              </div>
              <div>
                <dt>Combien</dt>
                <dd>
                  La livraison est à votre charge : de {fcfa(LIVRAISON.mini)} à {fcfa(LIVRAISON.maxi)} selon votre
                  quartier. Le montant exact s’affiche quand vous choisissez le vôtre.
                </dd>
              </div>
            </dl>
          </section>
        </main>
      </div>

      <footer className="pied">
        <div className="pied-gobelet" data-gobelet data-latte="4" />
        <a className="bouton bouton-clair bouton-grand" href="#commander">
          Commander
        </a>
        <p className="pied-nom" aria-hidden="true">
          The Latte Society
        </p>
        <p className="pied-ligne">
          <Link href="/groupes">Commander pour un bureau ou une fête, à partir de dix lattés</Link>
        </p>
        <p className="pied-ligne">© The Latte Society, Cotonou. Esther is cooking.</p>
      </footer>

      {nombre > 0 && !ouvert && !compose && (
        <aside className="recap" aria-label="Votre commande">
          <p>
            <span>Votre commande</span>
            <strong>
              {nombre} {nombre > 1 ? "lattés" : "latté"} = {fcfa(total)}
            </strong>
          </p>
          <button className="bouton bouton-clair bouton-grand" onClick={() => setOuvert(true)}>
            Voir et commander
          </button>
        </aside>
      )}

      {compose && (
        <Composer
          onFermer={() => setCompose(false)}
          onAjouter={(l) => {
            ajouter(l);
            setCompose(false);
          }}
        />
      )}
      {ouvert && <Commande panier={panier} setPanier={setPanier} onFermer={() => setOuvert(false)} />}
    </div>
  );
}

function Compteur({
  nom,
  valeur,
  visible = true,
  onMoins,
  onPlus,
}: {
  nom: string;
  valeur: number;
  visible?: boolean;
  onMoins: () => void;
  onPlus: () => void;
}) {
  const tab = visible ? 0 : -1;
  return (
    <div className="compteur">
      <button type="button" tabIndex={tab} disabled={valeur === 0} aria-label={`Un ${nom} de moins`} onClick={onMoins}>
        −
      </button>
      <output aria-live="polite" aria-label={`${valeur} ${nom}`}>
        {valeur}
      </output>
      <button type="button" tabIndex={tab} aria-label={`Un ${nom} de plus`} onClick={onPlus}>
        +
      </button>
    </div>
  );
}

function Couronne() {
  const id = useId();
  return (
    <svg className="couronne" viewBox="0 0 500 500" aria-hidden="true">
      <defs>
        <path id={id} d="M250,250 m-205,0 a205,205 0 1,1 410,0 a205,205 0 1,1 -410,0" />
      </defs>
      <text>
        <textPath href={`#${id}`} textLength="1270">
          THE LATTE SOCIETY ✦ ESTHER IS COOKING ✦ THE LATTE SOCIETY ✦ ESTHER IS COOKING ✦
        </textPath>
      </text>
    </svg>
  );
}

function Choix({
  titre,
  nom,
  options,
  valeur,
  multiple,
  max,
  onChange,
}: {
  titre: string;
  nom: string;
  options: Option[];
  valeur: string[];
  multiple?: boolean;
  max?: number; // au-delà, un seul choix se remplace, plusieurs se bloquent
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset className="choix">
      <legend>{titre}</legend>
      <div className="choix-liste">
        {options.map((o) => {
          const coche = valeur.includes(o.id);
          const plein = !!max && max > 1 && !coche && valeur.length >= max;
          return (
            <label key={o.id} className={coche ? "option option-cochee" : plein ? "option option-pleine" : "option"}>
              <input
                type={multiple ? "checkbox" : "radio"}
                name={nom}
                checked={coche}
                disabled={plein}
                onChange={() =>
                  onChange(
                    !multiple || (max === 1 && !coche)
                      ? [o.id]
                      : coche
                        ? valeur.filter((v) => v !== o.id)
                        : [...valeur, o.id],
                  )
                }
              />
              {o.nom}
              {o.prix ? ` +${fcfa(o.prix)}` : ""}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// Le seul latté dont on choisit les sirops et le dessus
function Composer({ onFermer, onAjouter }: { onFermer: () => void; onAjouter: (l: Omit<Ligne, "cle">) => void }) {
  const latte = LATTES.find((l) => l.libre)!;
  const boite = useRef<HTMLDialogElement>(null);
  const [lait, setLait] = useState(["classique"]);
  const [sirops, setSirops] = useState<string[]>([]);
  const [supplements, setSupplements] = useState<string[]>([]);
  const [quantite, setQuantite] = useState(1);
  const ligne = { latte: latte.id, lait: lait[0], sirops, supplements, quantite };

  useEffect(() => {
    boite.current?.showModal();
  }, []);

  return (
    <dialog ref={boite} className="feuille" onClose={onFermer} aria-labelledby="composer-titre">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAjouter(ligne);
        }}
      >
        <div className="feuille-tete">
          <h2 id="composer-titre">Votre latté</h2>
          <button type="button" className="lien" onClick={onFermer}>
            Fermer
          </button>
        </div>
        <div className="feuille-corps">
          <Choix titre="Le lait" nom="lait" options={LAITS} valeur={lait} onChange={setLait} />
          <Choix
            titre={`Les sirops, ${MAX_SIROPS} au choix`}
            nom="sirop"
            options={SIROPS}
            valeur={sirops}
            multiple
            max={MAX_SIROPS}
            onChange={setSirops}
          />
          <Choix
            titre="Par-dessus, si vous voulez"
            nom="supplement"
            options={SUPPLEMENTS}
            valeur={supplements}
            multiple
            max={MAX_DESSUS}
            onChange={setSupplements}
          />
          <div className="quantite">
            <span>Combien ?</span>
            <Compteur
              nom="latté composé"
              valeur={quantite}
              onMoins={() => setQuantite((q) => Math.max(1, q - 1))}
              onPlus={() => setQuantite((q) => Math.min(20, q + 1))}
            />
          </div>
        </div>
        <div className="feuille-pied">
          <button className="bouton bouton-grand bouton-large" type="submit">
            Ajouter à la commande, {fcfa(prixLigne({ cle: "", ...ligne }))}
          </button>
        </div>
      </form>
    </dialog>
  );
}
