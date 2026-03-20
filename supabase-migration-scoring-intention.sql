-- Migration : ajout du champ intention (acheteur/cédant)
DO $$ BEGIN
  CREATE TYPE intention_enum AS ENUM ('cedant', 'acquereur', 'les_deux');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS intention intention_enum;
