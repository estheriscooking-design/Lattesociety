-- Table des commandes de The Latte Society. À exécuter une fois dans le projet Supabase choisi.
-- Le site y accède uniquement depuis le serveur, avec la clé « service role ».
create table if not exists latte_commandes (
  id uuid primary key,
  statut text not null,
  cree_le timestamptz not null default now(),
  donnees jsonb not null
);
create index if not exists latte_commandes_cree_le on latte_commandes (cree_le desc);
alter table latte_commandes enable row level security; -- aucune règle : fermé à tout sauf au serveur

-- Mesure des visites : une ligne par visite du site ou par panier ouvert, sans donnée personnelle.
create table if not exists latte_visites (
  id bigint generated always as identity primary key,
  le timestamptz not null default now(),
  quoi text not null,
  source text not null default 'direct' -- instagram, tiktok, whatsapp ou direct
);
create index if not exists latte_visites_le on latte_visites (le desc);
alter table latte_visites enable row level security;

-- Logos envoyés pour les autocollants des commandes de groupe : compartiment privé de fichiers.
insert into storage.buckets (id, name, public) values ('latte-logos', 'latte-logos', false)
on conflict (id) do nothing;
