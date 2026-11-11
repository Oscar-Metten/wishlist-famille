# Déploiement dans le homelab

## Avant le premier démarrage

- Conserver le code et la configuration dans un dossier dédié.
- Copier `.env.example` en `.env`, choisir le premier mot de passe administrateur et l’adresse d’accès `APP_ORIGIN`.
- En accès local direct : `BIND_ADDRESS=0.0.0.0`, `APP_ORIGIN=http://ADRESSE_DU_SERVEUR:3187`.
- Derrière un reverse proxy : choisir un nom de domaine HTTPS et transmettre `Host` et `X-Forwarded-Proto: https`. Ne pas exposer un accès HTTP public en parallèle.
- Si le proxy est lui-même un conteneur, le joindre au même réseau Docker et le diriger vers `app:3000` ; adapter le nom de réseau et les ports au homelab. Le fichier fourni ne choisit aucun réseau existant à votre place.
- Limiter les corps de requête à environ 6 Mo et appliquer une limitation des tentatives de connexion sur `/api/auth/login` et `/api/lock` au niveau du proxy si le service est public.

## Démarrage

```sh
docker compose up -d --build
docker compose logs --tail=100 app
```

Ouvrir `/admin/login`. Créer les comptes de la famille dans l’administration. Chaque nouveau compte dispose immédiatement d’une première liste **privée**, qu’il peut compléter puis partager.

Aucun courriel n’est envoyé automatiquement. Les identifiants sont transmis personnellement. Il n’y a pas d’inscription publique, de récupération par courriel ou d’intégration Google/GitHub.

## Mise à jour et restauration

1. Arrêter l’application et sauvegarder le dossier `data/` avec `.env` séparément.
2. Mettre à jour le code et relancer `docker compose up -d --build`.
3. Vérifier la connexion et une liste publique.

Le schéma est créé ou complété automatiquement. Lors de la première migration d’une installation d’origine sans comptes, les listes existantes sont affectées au premier administrateur. Leurs prix et devises ne sont pas convertis : un prix USD existant reste en USD. Le nouveau choix par défaut est EUR.

Pour restaurer : arrêter le conteneur, remettre la sauvegarde complète et le code correspondant, puis démarrer. Ne pas restaurer uniquement le fichier principal SQLite pendant qu’il est ouvert.

## Réservations

L’annulation repose sur un cookie privé propre au navigateur ayant réservé. Changer d’appareil ou effacer les cookies fait perdre cette possibilité. Cette version ne fournit pas de lien d’annulation par courriel. Ne pas supprimer un cadeau pour annuler une réservation ; son propriétaire ne voit pas les réservations dans son espace.

## Import des boutiques

L’application accepte des pages produit publiques HTTP/HTTPS sur les ports standard. Elle exploite les informations présentes dans la page, sans comparateur ni suivi automatique des prix. Les boutiques protégées ou reposant uniquement sur JavaScript peuvent nécessiter une saisie manuelle. Les téléchargements sont limités en durée et en taille. Les images importées par lien restent hébergées chez la boutique ; pour en conserver une copie locale, l’importer comme fichier.
