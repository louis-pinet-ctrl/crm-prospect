-- ============================================
-- CRM "Avocat des Restaurateurs" — Schéma Supabase
-- À exécuter dans la console SQL de Supabase
-- ============================================

-- 1. Création des types ENUM
CREATE TYPE type_dossier_enum AS ENUM (
  'cession_fonds', 'cession_droit_bail', 'bail_nu', 'franchise', 'liquidation', 'contentieux', 'autre'
);

CREATE TYPE mode_honoraires_enum AS ENUM (
  'pourcentage', 'forfait'
);

CREATE TYPE source_enum AS ENUM (
  'linkedin', 'site_web', 'simulateur_precession', 'diaglocal', 'recommandation', 'autre'
);

CREATE TYPE profil_restaurateur_enum AS ENUM (
  'primo_accedant', 'proprietaire_unique', 'multi_etablissements'
);

CREATE TYPE statut_enum AS ENUM (
  'lead_simulateur',
  'prospect_identifie',
  'premier_contact',
  'diagnostic_rdv',
  'relance_en_attente',
  'lettre_mission_envoyee',
  'mission_en_cours',
  'facture',
  'cloture',
  'perdu_refuse',
  'prescripteur',
  'suivi_long_terme'
);

CREATE TYPE priorite_enum AS ENUM (
  'haute', 'moyenne', 'basse'
);

CREATE TYPE type_note_enum AS ENUM (
  'appel', 'email', 'whatsapp', 'rdv', 'courrier', 'note_libre'
);

-- 2. Table prospects
CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  etablissement TEXT,
  ville TEXT,
  type_dossier type_dossier_enum DEFAULT 'autre',
  type_dossier_detail TEXT,
  mode_honoraires mode_honoraires_enum DEFAULT 'pourcentage',
  taux_pourcentage NUMERIC DEFAULT 1.3,
  base_calcul NUMERIC DEFAULT 0,
  montant_forfait NUMERIC DEFAULT 0,
  ca_estime NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN mode_honoraires = 'pourcentage' THEN
        CASE
          WHEN type_dossier = 'cession_fonds' THEN GREATEST(COALESCE(base_calcul, 0) * COALESCE(taux_pourcentage, 1.3) / 100, 2000)
          ELSE COALESCE(base_calcul, 0) * COALESCE(taux_pourcentage, 1.3) / 100
        END
      WHEN mode_honoraires = 'forfait' THEN COALESCE(montant_forfait, 0)
      ELSE 0
    END
  ) STORED,
  -- Profil restaurateur
  profil_restaurateur profil_restaurateur_enum DEFAULT 'primo_accedant',
  nombre_restaurants INTEGER DEFAULT 1,
  type_cuisine TEXT,
  nombre_salaries INTEGER,
  siret TEXT,
  ca_annuel_declare NUMERIC,
  -- Expert comptable
  a_expert_comptable BOOLEAN DEFAULT FALSE,
  nom_expert_comptable TEXT,
  -- Infos local
  surface_local_m2 NUMERIC,
  loyer_mensuel NUMERIC,
  -- Outils
  simulateur_valorisation BOOLEAN DEFAULT FALSE,
  simulateur_estimation NUMERIC,
  diaglocal BOOLEAN DEFAULT FALSE,
  diaglocal_adresse TEXT,
  diaglocal_notes TEXT,
  guide_recu BOOLEAN DEFAULT FALSE,
  source source_enum DEFAULT 'autre',
  source_detail TEXT,
  statut statut_enum DEFAULT 'prospect_identifie',
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  date_modification TIMESTAMPTZ DEFAULT NOW(),
  date_relance DATE,
  priorite priorite_enum DEFAULT 'moyenne',
  position_kanban INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- 3. Table notes
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  contenu TEXT NOT NULL,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  type_note type_note_enum DEFAULT 'note_libre',
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- 4. Table commentaires (notes générales)
CREATE TABLE commentaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contenu TEXT NOT NULL,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- 5. Index pour les performances
CREATE INDEX idx_prospects_statut ON prospects(statut);
CREATE INDEX idx_prospects_date_relance ON prospects(date_relance);
CREATE INDEX idx_prospects_user_id ON prospects(user_id);
CREATE INDEX idx_notes_prospect_id ON notes(prospect_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_commentaires_user_id ON commentaires(user_id);
CREATE INDEX idx_commentaires_date ON commentaires(date_creation);

-- 5. Trigger pour date_modification automatique
CREATE OR REPLACE FUNCTION update_date_modification()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_modification = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_date_modification
  BEFORE UPDATE ON prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_date_modification();

-- 6. Row Level Security (RLS)
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commentaires ENABLE ROW LEVEL SECURITY;

-- Policies pour prospects : l'utilisateur ne voit que ses propres données
CREATE POLICY "Users can view own prospects"
  ON prospects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prospects"
  ON prospects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prospects"
  ON prospects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own prospects"
  ON prospects FOR DELETE
  USING (auth.uid() = user_id);

-- Policies pour notes
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- Policies pour commentaires
CREATE POLICY "Users can view own commentaires"
  ON commentaires FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own commentaires"
  ON commentaires FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own commentaires"
  ON commentaires FOR DELETE
  USING (auth.uid() = user_id);
