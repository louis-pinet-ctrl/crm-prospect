-- Migration : enrichissement du suivi des interactions
-- Ajouter WhatsApp au type_note_enum
ALTER TYPE type_note_enum ADD VALUE IF NOT EXISTS 'whatsapp';

-- Enum pour le résultat d'une interaction
DO $$ BEGIN
  CREATE TYPE resultat_interaction_enum AS ENUM (
    'pas_de_reponse',
    'message_laisse',
    'interesse',
    'a_rappeler',
    'rdv_pris',
    'refus',
    'info_envoyee'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ajouter les colonnes à la table notes
ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS date_interaction TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS resultat resultat_interaction_enum;
