-- ============================================
-- Migration : Table todos (to-do list intégrée)
-- À exécuter dans la console SQL de Supabase
-- ============================================

CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  fait BOOLEAN NOT NULL DEFAULT FALSE,
  categorie TEXT, -- appel, email, dossier, document, rdv, facturation, admin, autre
  echeance DATE,
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  prospect_nom TEXT, -- dénormalisé pour affichage rapide
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID DEFAULT auth.uid()
);

-- Index pour tri par échéance et statut
CREATE INDEX IF NOT EXISTS idx_todos_echeance ON todos (fait, echeance);
CREATE INDEX IF NOT EXISTS idx_todos_user ON todos (user_id);

-- RLS : chaque utilisateur voit ses propres todos
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own todos"
  ON todos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own todos"
  ON todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own todos"
  ON todos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own todos"
  ON todos FOR DELETE
  USING (auth.uid() = user_id);
