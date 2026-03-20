-- Migration : ajout complément d'honoraires + override manuel
-- Nouveau champ pour ajouter un montant complémentaire (dossier complexe, multi-fonds, etc.)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS complement_honoraires NUMERIC DEFAULT 0;
-- Nouveau champ pour forcer un montant manuellement (override le calcul auto)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS honoraires_override NUMERIC;
-- Motif du complément/override
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS honoraires_commentaire TEXT;

-- Recréer ca_estime pour intégrer le complément et l'override
-- On doit DROP puis re-CREATE car c'est un GENERATED ALWAYS
ALTER TABLE prospects DROP COLUMN IF EXISTS ca_estime;

ALTER TABLE prospects ADD COLUMN ca_estime NUMERIC GENERATED ALWAYS AS (
  CASE
    WHEN honoraires_override IS NOT NULL THEN honoraires_override
    WHEN mode_honoraires = 'pourcentage' THEN
      CASE
        WHEN type_dossier = 'cession_fonds' THEN
          GREATEST(COALESCE(base_calcul, 0) * COALESCE(taux_pourcentage, 1.3) / 100, 2000)
          + COALESCE(complement_honoraires, 0)
        ELSE
          COALESCE(base_calcul, 0) * COALESCE(taux_pourcentage, 1.3) / 100
          + COALESCE(complement_honoraires, 0)
      END
    WHEN mode_honoraires = 'forfait' THEN
      COALESCE(montant_forfait, 0) + COALESCE(complement_honoraires, 0)
    ELSE 0
  END
) STORED;
