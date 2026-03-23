-- Migration: Gestion des dossiers clients (étapes + tâches)
-- Tables pour le suivi des dossiers en cours (post-closing)

-- Étapes d'un dossier (instanciées à partir d'un template)
CREATE TABLE IF NOT EXISTS dossier_etapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  description TEXT,
  ordre INT NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'a_faire' CHECK (statut IN ('a_faire', 'en_cours', 'termine')),
  date_debut DATE,
  date_fin DATE,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

-- Tâches libres dans une étape
CREATE TABLE IF NOT EXISTS dossier_taches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etape_id UUID NOT NULL REFERENCES dossier_etapes(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  fait BOOLEAN NOT NULL DEFAULT FALSE,
  echeance DATE,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dossier_etapes_prospect ON dossier_etapes(prospect_id);
CREATE INDEX IF NOT EXISTS idx_dossier_etapes_user ON dossier_etapes(user_id);
CREATE INDEX IF NOT EXISTS idx_dossier_taches_etape ON dossier_taches(etape_id);
CREATE INDEX IF NOT EXISTS idx_dossier_taches_prospect ON dossier_taches(prospect_id);
CREATE INDEX IF NOT EXISTS idx_dossier_taches_user ON dossier_taches(user_id);

-- RLS
ALTER TABLE dossier_etapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_taches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own etapes"
  ON dossier_etapes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own taches"
  ON dossier_taches FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
