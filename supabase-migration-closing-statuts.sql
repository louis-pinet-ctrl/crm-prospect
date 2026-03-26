-- Migration : Ajout des statuts 'deal_maturation' et 'negociation' au tunnel closing
-- deal_maturation : deal qualifié mais long terme, pas de propal immédiate
-- negociation : discussion périmètre/honoraires après envoi lettre de mission

ALTER TYPE statut_enum ADD VALUE IF NOT EXISTS 'deal_maturation' AFTER 'relance_en_attente';
ALTER TYPE statut_enum ADD VALUE IF NOT EXISTS 'negociation' AFTER 'lettre_mission_envoyee';
