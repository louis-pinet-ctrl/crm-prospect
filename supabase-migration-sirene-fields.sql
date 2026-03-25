-- Migration : Ajout des champs SIRENE enrichis
-- Ces champs sont remplis automatiquement via l'API recherche-entreprises.api.gouv.fr

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS adresse_sirene TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS code_postal TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS code_naf TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS libelle_naf TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS forme_juridique TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS date_creation_entreprise DATE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS etat_administratif TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS dirigeants_sirene TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS resultat_net_sirene NUMERIC;
