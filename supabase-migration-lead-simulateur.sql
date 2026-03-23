-- Migration : Ajouter le statut 'lead_simulateur' et les valeurs manquantes
-- À exécuter dans la console SQL de Supabase (SQL Editor)

-- 1. Ajouter lead_simulateur au statut_enum
ALTER TYPE statut_enum ADD VALUE IF NOT EXISTS 'lead_simulateur' BEFORE 'prospect_identifie';

-- 2. Ajouter les statuts prescripteur et suivi_long_terme s'ils n'existent pas
ALTER TYPE statut_enum ADD VALUE IF NOT EXISTS 'prescripteur';
ALTER TYPE statut_enum ADD VALUE IF NOT EXISTS 'suivi_long_terme';

-- 3. Ajouter 'whatsapp' au type_note_enum s'il n'existe pas
ALTER TYPE type_note_enum ADD VALUE IF NOT EXISTS 'whatsapp';
