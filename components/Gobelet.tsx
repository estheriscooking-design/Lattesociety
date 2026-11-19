"use client";

// Le gobelet : un seul objet 3D, fixé à l'écran, qui suit les emplacements
// marqués `data-gobelet` dans la page. Dans la séquence, il tourne sur lui-même
// et change de latté quand l'autocollant passe derrière. Dans un emplacement
// `data-prepare`, il se prépare au défilement : glaçons, lait, café et sirop, paille et sceau.

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { LATTES } from "@/lib/carte";

const HAUTEUR = 2.4;
const NIVEAU = 2.06; // hauteur du liquide
const LAIT = "#F8F0E2"; // le lait seul, avant le café et le sirop
export const NB_ETAPES = 4; // glaçons, lait, café et sirop, paille et sceau
const rayon = (y: number) => (y <= 0.22 ? 0.8 : 0.8 + ((y - 0.22) / (HAUTEUR - 0.22)) * 0.2);
const lisse = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
// Hasard stable : le gobelet est le même à chaque visite
const entre = (p: number, a: number, b: number) => lisse((p - a) / (b - a));
const hasard = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export default function Gobelet({ onLatte, onEtape }: { onLatte: (i: number) => void; onEtape?: (i: number) => void }) {
  const toile = useRef<HTMLCanvasElement>(null);
  const rappel = useRef(onLatte);
  const rappelEtape = useRef(onEtape);
  useEffect(() => {
    rappel.current = onLatte;
    rappelEtape.current = onEtape;
  });

  useEffect(() => {
    const canvas = toile.current;
    if (!canvas) return;
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const rendu = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    rendu.toneMapping = THREE.NeutralToneMapping;
    rendu.localClippingEnabled = true; // le liquide est coupé à son niveau pendant la préparation
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(rendu);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.85;
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
    camera.position.z = 14;
    const lampe = new THREE.DirectionalLight(0xffffff, 1.8);
    lampe.position.set(-3, 5, 6);
    scene.add(lampe);
    const contre = new THREE.DirectionalLight(0xffffff, 0.7);
    contre.position.set(4, 2, -3);
    scene.add(contre);

    const gobelet = new THREE.Group();
    const corps = new THREE.Group(); // centré en hauteur
    corps.position.y = -HAUTEUR / 2 - 0.2;
    gobelet.add(corps);
    scene.add(gobelet);

    // L'ombre au sol
    const tache = document.createElement("canvas");
    tache.width = tache.height = 128;
    const ctx = tache.getContext("2d")!;
    const fondu = ctx.createRadialGradient(64, 64, 4, 64, 64, 64); // slop-ok : ombre portée du gobelet 3D
    fondu.addColorStop(0, "rgba(77,47,47,0.5)"); // slop-ok : ombre portée
    fondu.addColorStop(1, "rgba(77,47,47,0)"); // slop-ok : ombre portée
    ctx.fillStyle = fondu;
    ctx.fillRect(0, 0, 128, 128);
    const ombre = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 2.7),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(tache), transparent: true, depthWrite: false }),
    );
    ombre.rotation.x = -Math.PI / 2;
    ombre.position.y = -0.02;
    corps.add(ombre);

    // Le liquide : un dégradé du fond vers le haut, marbré comme un latté qu'on vient de verser
    const profilLiquide: THREE.Vector2[] = [new THREE.Vector2(0, 0.03), new THREE.Vector2(0.56, 0.03)];
    for (const y of [0.06, 0.12, 0.22]) profilLiquide.push(new THREE.Vector2(rayon(y) * 0.95 - (0.22 - y) * 0.5, y));
    for (let i = 1; i <= 44; i++) {
      const y = 0.22 + ((NIVEAU - 0.22) * i) / 44;
      profilLiquide.push(new THREE.Vector2(rayon(y) * 0.955, y));
    }
    const geoLiquide = new THREE.LatheGeometry(profilLiquide, 120);
    const nb = geoLiquide.attributes.position.count;
    geoLiquide.setAttribute("color", new THREE.BufferAttribute(new Float32Array(nb * 3), 3));
    const melange = new Float32Array(nb);
    {
      const pos = geoLiquide.attributes.position;
      for (let i = 0; i < nb; i++) {
        const y = pos.getY(i);
        const a = Math.atan2(pos.getZ(i), pos.getX(i));
        const marbre =
          Math.sin(a * 3 + y * 2.4) * 0.5 + Math.sin(a * 5 - y * 4.3 + 1.3) * 0.3 + Math.sin(a * 2 + y * 7.5 + 4) * 0.2;
        melange[i] = lisse((y / NIVEAU - 0.16 + marbre * 0.15) / 0.5);
      }
    }
    const coupe = new THREE.Plane();
    const liquide = new THREE.Mesh(
      geoLiquide,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, clippingPlanes: [coupe] }),
    );
    corps.add(liquide);

    const matSurface = new THREE.MeshStandardMaterial({ roughness: 0.3 });
    const surface = new THREE.Mesh(new THREE.CircleGeometry(rayon(NIVEAU) * 0.955, 64), matSurface);
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = NIVEAU;
    corps.add(surface);

    // Les glaçons
    const matGlace = new THREE.MeshPhysicalMaterial({
      roughness: 0.06,
      clearcoat: 1,
      transparent: true,
      opacity: 0.82, // slop-ok : glaçons translucides du gobelet 3D
    });
    const geoGlace = new RoundedBoxGeometry(0.42, 0.42, 0.42, 3, 0.07);
    const places: [number, number, number, number][] = [
      [-0.45, 0.02, 0.32, 1],
      [0.08, 0.1, 0.52, 0.9],
      [0.52, 0.0, 0.12, 1.05],
      [-0.08, 0.06, -0.38, 1],
      [-0.58, -0.02, -0.18, 0.85],
      [0.42, 0.04, -0.46, 0.95],
      [-0.12, 0.2, 0.08, 0.8],
      [0.3, -0.04, 0.6, 0.75],
    ];
    const glacons = places.map(([x, y, z, s], i) => {
      const g = new THREE.Mesh(geoGlace, matGlace);
      g.position.set(x, NIVEAU + y, z);
      g.rotation.set(i * 0.9, i * 1.7, i * 0.5);
      g.scale.setScalar(s);
      corps.add(g);
      // Au fond du gobelet vide, les six premiers se posent, les deux derniers par-dessus
      return { g, flotte: y, pose: i < 6 ? 0.26 : 0.66 };
    });

    // La paille
    const paille = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 3, 20),
      new THREE.MeshStandardMaterial({ color: "#1D1716", roughness: 0.35 }),
    );
    paille.position.set(0.2, 1.72, -0.12);
    paille.rotation.z = -0.13;
    corps.add(paille);

    // Le gobelet transparent
    const profil: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.6, 0),
      new THREE.Vector2(0.7, 0.03),
      new THREE.Vector2(0.76, 0.1),
      new THREE.Vector2(0.8, 0.22),
      new THREE.Vector2(1, HAUTEUR),
      new THREE.Vector2(1.035, HAUTEUR),
      new THREE.Vector2(1.035, HAUTEUR + 0.05),
    ];
    const matParoi = new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.18, // slop-ok : plastique transparent du gobelet 3D
        roughness: 0.03,
        clearcoat: 1,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    const paroi = new THREE.Mesh(new THREE.LatheGeometry(profil, 96), matParoi);
    paroi.renderOrder = 2;
    corps.add(paroi);

    // La buée : des gouttes sur la paroi, parce que c'est glacé
    const NB_GOUTTES = 130;
    const matGouttes = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0,
      clearcoat: 1,
      transparent: true,
      opacity: 0.42, // slop-ok : gouttes d'eau du gobelet 3D
      depthWrite: false,
    });
    const gouttes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), matGouttes, NB_GOUTTES);
    const pose = new THREE.Object3D();
    for (let i = 0; i < NB_GOUTTES; i++) {
      const y = 0.35 + hasard(i) * 1.6;
      let a = hasard(i + 200) * Math.PI * 2;
      // pas de gouttes sur l'autocollant
      if (y > 0.65 && y < 1.8 && Math.abs(a) < 0.62) a += 1.3;
      const r = rayon(y) + 0.006;
      const t = 0.007 + hasard(i + 400) * 0.015;
      pose.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
      pose.rotation.set(0, a, 0);
      pose.scale.set(t, t * (1.1 + hasard(i + 600) * 0.9), t * 0.45);
      pose.updateMatrix();
      gouttes.setMatrixAt(i, pose.matrix);
    }
    gouttes.renderOrder = 3;
    corps.add(gouttes);

    // L'autocollant, collé sur le devant
    const y0 = 0.72;
    const y1 = 1.72;
    const arc = (y1 - y0) / rayon((y0 + y1) / 2);
    const texture = new THREE.TextureLoader().load("/logo/autocollant-creme.png");
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const matAutocollant = new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.7, depthWrite: false });
    const autocollant = new THREE.Mesh(
      new THREE.CylinderGeometry(rayon(y1) + 0.012, rayon(y0) + 0.012, y1 - y0, 40, 1, true, -arc / 2, arc),
      matAutocollant,
    );
    autocollant.position.y = (y0 + y1) / 2;
    autocollant.renderOrder = 4;
    corps.add(autocollant);

    // Couleurs
    const cibleHaut = new THREE.Color();
    const cibleBas = new THREE.Color();
    const haut = new THREE.Color(LATTES[1].haut);
    const bas = new THREE.Color(LATTES[1].bas);
    const tmp = new THREE.Color();
    const blanc = new THREE.Color("#ffffff");
    const lait = new THREE.Color(LAIT);
    const versLeBas = new THREE.Vector3(0, -1, 0);
    const peindre = () => {
      const col = geoLiquide.attributes.color as THREE.BufferAttribute;
      for (let i = 0; i < nb; i++) {
        tmp.copy(bas).lerp(haut, melange[i]);
        col.setXYZ(i, tmp.r, tmp.g, tmp.b);
      }
      col.needsUpdate = true;
      matSurface.color.copy(haut);
      matGlace.color.copy(haut).lerp(blanc, 0.45);
    };
    peindre();

    // Taille
    let lv = 0;
    let hv = 0;
    const tailler = () => {
      lv = window.innerWidth;
      hv = window.innerHeight;
      rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rendu.setSize(lv, hv, false);
      camera.aspect = lv / hv;
      camera.updateProjectionMatrix();
    };
    tailler();
    window.addEventListener("resize", tailler);

    let emplacements = Array.from(document.querySelectorAll<HTMLElement>("[data-gobelet]"));
    const etat = { x: 0, y: 0, h: 0, rot: 0, penche: 0, pret: false, latte: -1, fait: 1, etape: -1 };
    let avant = performance.now();
    let defilement = window.scrollY;
    let image = 0;
    let boucle = 0;

    const tour = (t: number) => {
      boucle = requestAnimationFrame(tour);
      const dt = Math.max(0.001, Math.min(0.05, (t - avant) / 1000));
      avant = t;
      // Certains navigateurs changent de taille sans prévenir (barre d'adresse, panneau redimensionné)
      if (window.innerWidth !== lv || window.innerHeight !== hv) tailler();
      if (image++ % 40 === 0) emplacements = Array.from(document.querySelectorAll<HTMLElement>("[data-gobelet]"));

      // L'emplacement le plus proche du milieu de l'écran
      let choix: HTMLElement | null = null;
      let rect: DOMRect | null = null;
      let mieux = Infinity;
      for (const e of emplacements) {
        const r = e.getBoundingClientRect();
        if (r.height === 0 || r.bottom < -hv * 0.3 || r.top > hv * 1.3) continue;
        const d = Math.abs(r.top + r.height / 2 - hv / 2);
        if (d < mieux) {
          mieux = d;
          choix = e;
          rect = r;
        }
      }

      let cx = etat.x;
      let cy = etat.y;
      let ch = 0;
      let rot = etat.rot;
      let latte = etat.latte < 0 ? 1 : etat.latte;
      let fait = 1; // part de la préparation accomplie : 1 partout, sauf dans la section qui la montre
      let etape = -1;
      if (choix && rect) {
        cx = rect.left + rect.width / 2;
        cy = rect.top + rect.height / 2;
        ch = Math.min(rect.height, rect.width * 1.5);
        const sequence = choix.dataset.sequence && document.getElementById(choix.dataset.sequence);
        if (sequence) {
          const r = sequence.getBoundingClientRect();
          const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - hv)));
          const n = LATTES.length;
          const u = Math.min(n - 0.0001, p * n);
          const i = Math.floor(u);
          const s = i < n - 1 ? lisse((u - i - 0.55) / 0.45) : 0;
          rot = calme ? 0 : Math.PI * 2 * (i + s);
          latte = s > 0.5 ? i + 1 : i;
        } else {
          latte = Number(choix.dataset.latte ?? 1);
          const base = Math.round(etat.rot / (Math.PI * 2)) * Math.PI * 2;
          rot = base + (calme ? 0 : Math.sin(t / 1400) * 0.22 - 0.18);
          const section = choix.dataset.prepare && document.getElementById(choix.dataset.prepare);
          if (section) {
            const r = section.getBoundingClientRect();
            fait = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - hv)));
            etape = Math.min(NB_ETAPES - 1, Math.floor(fait * NB_ETAPES));
            // Il se tourne peu à peu vers nous : le sceau arrive de face à la fin
            if (!calme) rot -= (1 - fait) * 1.1;
          }
        }
      }

      if (!etat.pret) {
        // Entrée : le gobelet arrive d'en bas en faisant un tour
        etat.x = cx;
        etat.y = cy + (calme ? 0 : hv * 0.35);
        etat.h = calme ? ch : ch * 0.5;
        etat.rot = calme ? rot : rot - Math.PI * 2;
        etat.pret = true;
      }
      // Caché, il réapparaît à sa nouvelle place au lieu de traverser l'écran pour la rejoindre
      if (etat.h < 4) {
        etat.x = cx;
        etat.y = cy;
      }
      const k = 1 - Math.exp(-dt * 6);
      etat.x += (cx - etat.x) * k;
      etat.y += (cy - etat.y) * k;
      etat.h += (ch - etat.h) * k;
      etat.rot += (rot - etat.rot) * (1 - Math.exp(-dt * 8));

      // Il penche dans le sens du défilement
      const vitesse = (window.scrollY - defilement) / dt;
      defilement = window.scrollY;
      const cible = calme ? 0 : Math.max(-0.22, Math.min(0.22, vitesse * 0.00009));
      etat.penche += (cible - etat.penche) * (1 - Math.exp(-dt * 5));

      if (latte !== etat.latte) {
        etat.latte = latte;
        rappel.current(latte);
      }
      if (etape !== etat.etape) {
        etat.etape = etape;
        rappelEtape.current?.(etape);
      }

      // La préparation, en quatre temps égaux
      etat.fait += (fait - etat.fait) * (1 - Math.exp(-dt * 7));
      const f = etat.fait;
      const verse = entre(f, 0.27, 0.48); // le lait
      const colore = entre(f, 0.52, 0.73); // le café et le sirop
      const niveau = NIVEAU * (0.66 * verse + 0.34 * colore);
      liquide.visible = surface.visible = niveau > 0.05;
      surface.position.y = niveau;
      surface.scale.setScalar(rayon(niveau) / rayon(NIVEAU));
      glacons.forEach(({ g, flotte, pose }, i) => {
        const chute = Math.min(1, Math.max(0, (f / 0.22 - i * 0.08) / 0.44));
        g.visible = chute > 0;
        g.position.y = Math.max(HAUTEUR + 1.4 + (pose - HAUTEUR - 1.4) * chute * chute, niveau + flotte);
      });
      const plante = entre(f, 0.77, 0.88);
      paille.visible = plante > 0;
      paille.position.y = 1.72 + (1 - plante) * 3.4;
      matAutocollant.opacity = entre(f, 0.86, 0.97);
      matGouttes.opacity = 0.42 * entre(f, 0.3, 0.75); // slop-ok : la buée vient avec le froid
      matParoi.opacity = 0.18 + 0.14 * (1 - verse); // slop-ok : le gobelet vide reste lisible sur le fond

      cibleHaut.copy(lait).lerp(tmp.set(LATTES[latte].haut), colore);
      cibleBas.copy(lait).lerp(tmp.set(LATTES[latte].bas), colore);
      if (Math.abs(haut.r - cibleHaut.r) + Math.abs(haut.g - cibleHaut.g) + Math.abs(bas.b - cibleBas.b) + Math.abs(bas.r - cibleBas.r) > 0.002) {
        haut.lerp(cibleHaut, 1 - Math.exp(-dt * 9));
        bas.lerp(cibleBas, 1 - Math.exp(-dt * 9));
        peindre();
      }

      const parPixel = (2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360)) / hv;
      gobelet.visible = etat.h > 4;
      gobelet.position.set((etat.x - lv / 2) * parPixel, -(etat.y - hv / 2) * parPixel, 0);
      gobelet.scale.setScalar((etat.h * parPixel) / 3.3);
      gobelet.rotation.set(0.16 + etat.penche * 0.5, etat.rot, (calme ? 0 : Math.sin(t / 1900) * 0.03 - 0.05) + etat.penche);
      gobelet.updateMatrixWorld();
      coupe.set(versLeBas, niveau).applyMatrix4(corps.matrixWorld);
      rendu.render(scene, camera);
    };
    boucle = requestAnimationFrame(tour);

    // Outil de développement : rend un latté seul, de face, pour les vignettes de la carte.
    // Après l'ajout d'une saveur, dans la console : envoyer `__capture(i, 720)` à /api/capture.
    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __capture?: (i: number, taille: number) => string }).__capture = (i, taille) => {
        haut.set(LATTES[i].haut);
        bas.set(LATTES[i].bas);
        peindre();
        rendu.setPixelRatio(1);
        rendu.setSize(taille, taille, false);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
        gobelet.visible = true;
        gobelet.position.set(0, 0, 0);
        gobelet.scale.setScalar(1.62);
        gobelet.rotation.set(0.16, -0.22, -0.04);
        rendu.render(scene, camera);
        const png = canvas.toDataURL("image/png");
        lv = 0; // force le retour à la taille de l'écran
        etat.latte = -1;
        return png;
      };
    }

    return () => {
      cancelAnimationFrame(boucle);
      window.removeEventListener("resize", tailler);
      pmrem.dispose();
      rendu.dispose();
    };
  }, []);

  return <canvas ref={toile} className="gobelet" aria-hidden="true" />;
}
