-- Migration : système de clone client (dossiers liés)
-- Un prospect peut être lié à un "client parent" pour les dossiers récurrents
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS client_parent_id UUID REFERENCES prospects(id) ON DELETE SET NULL;

-- Index pour retrouver rapidement les dossiers d'un client
CREATE INDEX IF NOT EXISTS idx_prospects_client_parent ON prospects(client_parent_id);

-- Permettre la mise à jour des notes (edit/delete)
-- RLS policy pour update
DO $$ BEGIN
  CREATE POLICY "Users can update own notes" ON notes FOR UPDATE
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own notes" ON notes FOR DELETE
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
