"use client";

import Link from "next/link";
import Image from "next/image";
import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import Gobelet from "./Gobelet";
import Commande from "./Commande";
import {
  LAITS,
  CONTENANCE,
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
// La préparation montrée par le gobelet : l'ordre des étapes reste à confirmer par Esther
const ETAPES = [
  { titre: "D’abord, les glaçons", texte: "Beaucoup de glaçons, pour que le latté reste froid jusqu’à chez vous." },
  { titre: "Ensuite, le lait", texte: "Du lait bien froid, classique ou végétal. C’est vous qui choisissez." },
  { titre: "Le café et le sirop", texte: "Le café et le sirop de votre latté rejoignent le lait. Ici, le caramel." },
  { titre: "La paille et le sceau", texte: "Esther plante la paille, colle son sceau et confie le gobelet au livreur." },
];
const PHRASE = "Chaque latté est préparé à la commande, par Esther, chez elle, puis livré glacé à votre porte.".split(" ");
const PHOTOS: [number, string][] = [
  [2, "Trois lattés glacés alignés sur la table d’Esther : chocolat, matcha et ube."],
  [4, "Les trois mêmes gobelets vus de près, avec leurs glaçons et leurs pailles noires."],
  [3, "Un latté au chocolat au premier plan, un matcha juste derrière."],
];
const NOMBRES = ["Zéro", "Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix", "Onze", "Douze"];

export default function Boutique() {
  const [latte, setLatte] = useState(1);
  const [etape, setEtape] = useState(-1);
  const [offre, setOffre] = useState(false); // venu par « offrir » : la case cadeau sera déjà cochée
  const phrase = useRef<HTMLParagraphElement>(null);
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

  // Aller à un latté de la carte : la page défile jusqu'à sa place dans la séquence
  const depart = useRef<{ x: number; y: number } | null>(null);
  const allerAuLatte = (i: number) => {
    const s = document.getElementById("carte");
    if (!s) return;
    const haut = s.getBoundingClientRect().top + window.scrollY;
    const course = s.offsetHeight - window.innerHeight;
    window.scrollTo({ top: haut + (course * (i + 0.25)) / LATTES.length, behavior: "smooth" });
  };

  // La couronne tourne avec le défilement
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let prevu = 0;
    phrase.current?.classList.add("phrase-vive");
    const tourner = () => {
      prevu = 0;
      document.documentElement.style.setProperty("--tour", `${(window.scrollY * 0.06).toFixed(1)}deg`);
      // La phrase s'allume mot à mot pendant qu'elle traverse l'écran
      const p = phrase.current;
      if (!p) return;
      const r = p.getBoundingClientRect();
      const hv = window.innerHeight;
      if (r.bottom < -hv || r.top > hv * 2) return;
      const part = (hv * 0.82 - r.top) / (hv * 0.45 + r.height);
      const allumes = Math.ceil(Math.min(1, Math.max(0, part)) * p.children.length);
      for (let i = 0; i < p.children.length; i++) p.children[i].classList.toggle("mot-allume", i < allumes);
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
      <Gobelet onLatte={setLatte} onEtape={setEtape} />

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
                lundi au samedi. Gobelet de {CONTENANCE}, à partir de {fcfa(Math.min(...LATTES.map((l) => l.prix)))} CFA.
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
            <div
              className="sequence-fixe"
              onTouchStart={(e) => {
                depart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              }}
              onTouchEnd={(e) => {
                // Un glissement vers la gauche ou la droite passe au latté suivant ou précédent
                const d = depart.current;
                depart.current = null;
                if (!d) return;
                const dx = e.changedTouches[0].clientX - d.x;
                const dy = e.changedTouches[0].clientY - d.y;
                if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
                allerAuLatte(Math.min(LATTES.length - 1, Math.max(0, latte + (dx < 0 ? 1 : -1))));
              }}
            >
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
              <ul className="sequence-liste" aria-label="La carte">
                {LATTES.map((l, i) => (
                  <li key={l.id}>
                    <button
                      className={i === latte ? "pastille pastille-active" : "pastille"}
                      style={{ background: l.teinte }}
                      aria-label={l.nom}
                      aria-current={i === latte}
                      onClick={() => allerAuLatte(i)}
                    />
                  </li>
                ))}
              </ul>
              <p className="sequence-geste">Glissez vers la gauche pour voir le suivant.</p>
            </div>
          </section>

          <section className="commander" id="commander">
            <div className="commander-tete">
              <h2>Choisissez vos lattés</h2>
              <p>
                Ajoutez vos lattés avec le bouton +. Tous sont servis en gobelet de {CONTENANCE}. Le lait, classique ou végétal (+{fcfa(LAITS.find((l) => l.prix)?.prix ?? 0)}), se choisit ensuite dans votre
                commande.
              </p>
              <p>
                Dix lattés ou plus, pour un bureau ou une fête ?{" "}
                <Link className="lien" href="/groupes">
                  Passez par la commande de groupe
                </Link>
                , la veille au plus tard.
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

          <div className="recette" style={{ background: LATTES[1].fond }}>
            <section className="phrase-bloc">
              <p className="phrase" ref={phrase}>
                {/* L'espace reste entre les mots, hors des <span> : la phrase se lit et se copie normalement */}
                {PHRASE.map((mot, i) => (
                  <Fragment key={i}>
                    {i > 0 && " "}
                    <span>{mot}</span>
                  </Fragment>
                ))}
              </p>
            </section>
            <section className="sequence" id="preparation" style={{ height: `${ETAPES.length * 70}vh` }}>
              <div className="sequence-fixe">
                <div className="sequence-textes">
                  {ETAPES.map((e, i) => {
                    const montre = i === Math.max(0, etape);
                    return (
                      <article key={e.titre} className={montre ? "fiche fiche-active" : "fiche"} aria-hidden={!montre}>
                        <h2>{e.titre}</h2>
                        <p>{e.texte}</p>
                        {i === ETAPES.length - 1 && (
                          <div className="fiche-achat">
                            <a className="bouton bouton-grand" href="#commander" tabIndex={montre ? 0 : -1}>
                              Commander le vôtre
                            </a>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
                <div className="sequence-gobelet" data-gobelet data-latte="1" data-prepare="preparation" style={{ color: "var(--orange)" }}>
                  <Couronne />
                </div>
              </div>
            </section>
          </div>

          <section className="vrai">
            <h2>Ce que vous recevez, photographié chez Esther.</h2>
            <div className="vrai-photos">
              {PHOTOS.map(([n, alt]) => (
                <Image
                  key={n}
                  src={`/photos/esther-${n}.jpg`}
                  alt={alt}
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
              <a className="bouton bouton-grand" href="#commander" onClick={() => setOffre(true)}>
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
                  Esther livre par tournées : le lundi entre 11 h et 18 h 30, du mardi au samedi entre 16 h 15 et
                  19 h 15. Vous choisissez l’heure d’arrivée en commandant, pour le jour même ou à l’avance. Commandez au
                  moins 45 minutes avant, une heure pour les quartiers éloignés.
                </dd>
              </div>
              <div>
                <dt>Combien</dt>
                <dd>
                  La livraison est à votre charge : de {fcfa(LIVRAISON.mini)} à {fcfa(LIVRAISON.maxi)} selon votre
                  quartier. Le montant exact s’affiche quand vous choisissez le vôtre.
                </dd>
              </div>
              <div>
                <dt>Paiement</dt>
                <dd>En ligne, par Mobile Money (MTN ou Moov), au moment de commander.</dd>
              </div>
            </dl>
          </section>
        </main>
      </div>

      <footer className="pied">
        <Image
          className="pied-sceau"
          src="/logo/autocollant-creme.png"
          alt="Le sceau The Latte Society, Esther is cooking"
          width={1024}
          height={1024}
          sizes="(min-width: 860px) 360px, 62vw"
        />
        <a className="bouton bouton-clair bouton-grand" href="#commander">
          Commander
        </a>
        <p className="pied-nom" aria-hidden="true">
          The Latte Society
        </p>
        <Link className="lien pied-lien" href="/groupes">
          Commander pour un bureau ou une fête
        </Link>
        <p className="pied-reseaux">
          <a className="lien pied-lien" href="https://www.instagram.com/esther_is_cooking/" rel="noopener">
            Instagram
          </a>{" "}
          <a className="lien pied-lien" href="https://www.tiktok.com/@esther__tito" rel="noopener">
            TikTok
          </a>
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
      {ouvert && <Commande panier={panier} setPanier={setPanier} cadeau={offre} onFermer={() => setOuvert(false)} />}
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
