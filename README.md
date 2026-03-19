# CRM — Avocat des Restaurateurs

CRM/Kanban de suivi de prospects et dossiers pour un avocat spécialisé en droit CHR.

## Stack

- **Frontend** : React + Vite + Tailwind CSS
- **Backend/BDD** : Supabase (PostgreSQL + Auth + API REST)
- **Déploiement** : GitHub Pages

## Installation

```bash
npm install
cp .env.example .env
# Remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env
```

## Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Exécuter le fichier `supabase-schema.sql` dans l'éditeur SQL de Supabase
3. Créer un utilisateur dans Authentication > Users
4. Copier l'URL du projet et la clé anon dans `.env`

## Développement

```bash
npm run dev
```

## Build & déploiement

```bash
npm run build
# Le dossier dist/ est prêt pour GitHub Pages
```
