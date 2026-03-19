-- ============================================
-- Migration: Ajout champs profil restaurateur
-- À exécuter dans la console SQL de Supabase
-- ============================================

-- 1. Type ENUM pour le profil restaurateur
CREATE TYPE profil_restaurateur_enum AS ENUM (
  'primo_accedant', 'proprietaire_unique', 'multi_etablissements'
);

-- 2. Nouveaux ENUM values pour source (simulateur_precession, diaglocal)
-- Note: On ajoute les nouvelles valeurs au type existant
ALTER TYPE source_enum ADD VALUE IF NOT EXISTS 'simulateur_precession';
ALTER TYPE source_enum ADD VALUE IF NOT EXISTS 'diaglocal';

-- 3. Ajout des colonnes à la table prospects
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS profil_restaurateur profil_restaurateur_enum DEFAULT 'primo_accedant',
  ADD COLUMN IF NOT EXISTS nombre_restaurants INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS type_cuisine TEXT,
  ADD COLUMN IF NOT EXISTS nombre_salaries INTEGER,
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS ca_annuel_declare NUMERIC,
  ADD COLUMN IF NOT EXISTS a_expert_comptable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nom_expert_comptable TEXT,
  ADD COLUMN IF NOT EXISTS surface_local_m2 NUMERIC,
  ADD COLUMN IF NOT EXISTS loyer_mensuel NUMERIC,
  ADD COLUMN IF NOT EXISTS diaglocal_adresse TEXT,
  ADD COLUMN IF NOT EXISTS diaglocal_notes TEXT,
  ADD COLUMN IF NOT EXISTS simulateur_estimation NUMERIC;
