-- Migration : ajout des champs franchise
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS est_franchise BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS enseigne_franchise TEXT,
  ADD COLUMN IF NOT EXISTS nombre_franchises INTEGER DEFAULT 1;
