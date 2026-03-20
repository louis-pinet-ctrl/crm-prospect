-- Migration : table factures pour le suivi de facturation partielle
CREATE TABLE IF NOT EXISTS factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  montant NUMERIC NOT NULL,
  description TEXT,
  numero_facture TEXT,
  date_facture DATE DEFAULT CURRENT_DATE,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_factures_prospect ON factures(prospect_id);

-- RLS
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own factures" ON factures FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own factures" ON factures FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own factures" ON factures FOR UPDATE
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own factures" ON factures FOR DELETE
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
