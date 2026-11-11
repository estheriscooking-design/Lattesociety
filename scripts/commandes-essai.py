# Remplit .data/commandes.json avec de FAUSSES commandes sur 60 jours, pour voir le tableau de bord vivre.
# Local seulement. Pour repartir de zéro : supprimer le fichier .data/commandes.json.
import json, os, random, uuid
from datetime import datetime, timedelta, timezone

random.seed(7)
LATTES = {"cookies-butter-cloud": 4000, "iced-caramel": 4000, "brown-sugar-shaken-espresso": 3500, "matcha": 4500,
          "ube": 4500, "tiramisu": 4000, "chocolate-chips": 3500, "compose": 4000}
POIDS = [14, 20, 10, 22, 12, 9, 7, 6]
SIROPS = ["vanille", "speculoos", "coco", "caramel", "noisette", "cannelle", "creme-brulee", "chocolat-blanc", "pepites-chocolat"]
DESSUS = ["sweet-cream", "chantilly", "cold-foam"]
QUARTIERS = [("Akpakpa centre", 500), ("Sènadé", 500), ("PK3", 500), ("Cadjèhoun", 1000), ("Haie Vive", 1000), ("Ganhi", 1000),
             ("Gbégamey", 1000), ("Fidjrossè", 1500), ("Agla", 1500), ("Zogbo", 1500), ("Godomey", 2000), ("Togoudo", 2000)]
POIDS_Q = [10, 6, 5, 12, 11, 7, 6, 14, 5, 4, 5, 3]
MOTS = ["Très bon, bien frais.", "Le matcha est parfait.", "Livraison un peu longue.", "Ma collègue a adoré.", "", "", ""]
clients = [(f"Cliente essai {i}", f"01{random.randint(40000000, 99999999)}") for i in range(1, 46)]
maintenant = datetime.now(timezone.utc)
iso = lambda d: d.isoformat().replace("+00:00", "Z")
commandes = []
for j in range(60, -1, -1):
    jour = maintenant - timedelta(days=j)
    local = jour + timedelta(hours=1)
    if local.weekday() == 6:
        continue
    ouverture, fermeture = ((10, 0), (19, 0)) if local.weekday() == 0 else ((15, 30), (19, 30))
    for _ in range(random.randint(2, 6) + (3 if local.weekday() in (4, 5) else 0) + (60 - j) // 20):
        minute = random.randint(ouverture[0] * 60 + ouverture[1], fermeture[0] * 60 + fermeture[1] - 35)
        cree = local.replace(hour=minute // 60, minute=minute % 60, second=random.randint(0, 59), microsecond=0) - timedelta(hours=1)
        if cree > maintenant:
            continue
        nom, tel = random.choice(clients[: 15 + (60 - j) // 2])
        lignes = []
        for latte in random.sample(list(LATTES), k=random.choices([1, 2, 3], [70, 22, 8])[0]):
            libre = latte == "compose"
            l = {"latte": latte, "lait": random.choices(["classique", "vegetal"], [82, 18])[0],
                 "sirops": random.sample(SIROPS, k=random.randint(1, 2)) if libre else [],
                 "supplements": random.sample(DESSUS, k=random.randint(0, 1)) if libre else [],
                 "quantite": random.choices([1, 2, 3], [78, 17, 5])[0]}
            l["cle"] = "|".join([l["latte"], l["lait"], "+".join(sorted(l["sirops"])), "+".join(sorted(l["supplements"]))])
            lignes.append(l)
        lignes = random.choices([lignes], k=1)[0]
        for l in lignes:
            l["latte"] = l["latte"]
        # la popularité : on retire au hasard les lattés peu demandés
        sous = sum(LATTES[l["latte"]] * l["quantite"] for l in lignes)
        quartier, frais = random.choices(QUARTIERS, POIDS_Q)[0]
        tirage = random.random()
        statut = "attente" if tirage < 0.12 else "annulee" if tirage < 0.14 else "livree"
        if j == 0 and statut == "livree":
            statut = random.choice(["payee", "preparation", "en-route", "livree"])
        vite = random.random() < 0.7
        hist = []
        if statut != "attente":
            t = cree + timedelta(seconds=random.randint(40, 180)); hist.append({"statut": "payee", "le": iso(t)})
            if statut in ("preparation", "en-route", "livree"):
                t += timedelta(minutes=random.randint(1, 6)); hist.append({"statut": "preparation", "le": iso(t)})
            if statut in ("en-route", "livree"):
                t += timedelta(minutes=random.randint(5, 14)); hist.append({"statut": "en-route", "le": iso(t)})
            if statut == "livree":
                t += timedelta(minutes=random.randint(8, 16) + frais // 100); hist.append({"statut": "livree", "le": iso(t)})
            if statut == "annulee":
                hist.append({"statut": "annulee", "le": iso(t + timedelta(minutes=5))})
        avis = None
        if statut == "livree" and random.random() < 0.35:
            avis = {"note": random.choices([5, 4, 3, 2], [58, 28, 10, 4])[0], "commentaire": random.choice(MOTS), "le": iso(cree + timedelta(hours=2))}
        cadeau = {"nom": "Amie essai", "telephone": "0100000001", "mot": "Bon courage."} if random.random() < 0.15 else None
        i = str(uuid.UUID(int=random.getrandbits(128), version=4))
        commandes.append({"id": i, "numero": "LS-" + i.replace("-", "")[:4].upper(), "creeLe": iso(cree), "statut": statut, "lignes": lignes,
                          "nom": nom, "telephone": tel, "cadeau": cadeau, "quartier": quartier, "lieu": "Adresse d’essai.",
                          "quand": "vite" if vite else {"jour": (cree + timedelta(hours=1)).strftime("%Y-%m-%d"), "heure": "18:00"},
                          "sousTotal": sous, "frais": frais, "total": sous + frais,
                          "paiement": {"mode": "demo", "transaction": None}, "historique": hist, "avis": avis})
commandes.sort(key=lambda c: c["creeLe"])
os.makedirs(".data", exist_ok=True)
json.dump(commandes, open(".data/commandes.json", "w"), ensure_ascii=False, indent=1)
print(len(commandes), "fausses commandes écrites dans .data/commandes.json")
