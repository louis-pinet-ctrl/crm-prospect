-- ============================================
-- Migration : Suivi long terme & Prescripteurs
-- Nouveaux statuts, champs prescripteur, compteurs
-- ============================================

-- 1. Ajouter les nouveaux statuts à l'enum
ALTER TYPE statut_enum ADD VALUE IF NOT EXISTS 'prescripteur';
ALTER TYPE statut_enum ADD VALUE IF NOT EXISTS 'suivi_long_terme';

-- 2. Créer l'enum type_prescripteur
DO $$ BEGIN
  CREATE TYPE type_prescripteur_enum AS ENUM (
    'expert_comptable', 'notaire', 'agent_immobilier', 'avocat', 'banquier', 'courtier', 'autre'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Ajouter les nouvelles colonnes à la table prospects
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS type_prescripteur type_prescripteur_enum;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS nombre_deals_apportes INTEGER DEFAULT 0;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS nombre_relances_effectuees INTEGER DEFAULT 0;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS date_derniere_interaction TIMESTAMPTZ;

-- 4. Index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_prospects_type_prescripteur ON prospects(type_prescripteur);
CREATE INDEX IF NOT EXISTS idx_prospects_date_derniere_interaction ON prospects(date_derniere_interaction);
