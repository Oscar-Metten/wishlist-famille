# Wishlist Famille

Version familiale française de [Reggio-Digital/wishlist](https://github.com/Reggio-Digital/wishlist), sous licence MIT. Le projet d’origine et sa licence sont conservés.

- Une page d’accueil commune et une ou plusieurs listes par personne.
- Comptes personnels : chacun gère uniquement ses propres listes et cadeaux.
- Administration des comptes : création d’un membre avec sa première liste privée, réinitialisation des mots de passe. Chaque membre peut changer le sien.
- Photos par lien, import de fichier ou collage ; conversion en WebP, taille maximale 5 Mo.
- Prix indicatif en euros par défaut, format français, plusieurs liens de boutiques par cadeau.
- Import depuis un lien : titre, description, image, prix et devise quand la boutique les fournit. Vérification avant enregistrement ; les champs déjà saisis sont conservés.
- Réservation sans compte. Seul le navigateur qui a réservé peut annuler grâce à un cookie privé ; aucune preuve de réservation n’est exposée par les API.
- Réservations masquées au propriétaire connecté. Un propriétaire peut toujours découvrir les réservations en visitant anonymement sa propre liste : ce n’est pas une protection contre une recherche volontaire.
- Option de mot de passe familial pour l’accès des visiteurs, contrôlée côté serveur.

## Installation avec Docker Compose

1. Copier `.env.example` vers `.env`.
2. Remplir `ADMIN_PASSWORD` (12 caractères minimum) et `APP_ORIGIN`, l’adresse exacte ouverte dans le navigateur.
3. Lancer `docker compose up -d --build`.
4. Ouvrir `http://localhost:3187/admin/login` si vous conservez le port par défaut.
5. Se connecter, créer les comptes dans « Comptes de la famille » et transmettre les identifiants directement aux personnes concernées.
6. Chacun remplit sa liste puis coche « Partagée ». Les listes privées ne sont visibles que de leur propriétaire.

Le compte administrateur peut créer les membres et modifier les réglages du site ; il n’obtient pas automatiquement l’accès aux listes privées des autres. Pour ses propres cadeaux, il utilise ses propres listes.

Le mot de passe d’environnement initialise le tout premier compte. Après cela, les changements se font dans l’application. Modifier `.env` ne remplace pas le mot de passe d’un compte existant.

Les données et la clé de session sont conservées dans `data/`. Ce dossier et `.env` sont exclus de Git. Ne jamais partager une archive de `data/` avec le code. Pour une sauvegarde cohérente, arrêter le conteneur, copier tout `data/`, puis le redémarrer. Un retour vers la version d’origine nécessite la restauration de la sauvegarde antérieure à la migration.

## Accès depuis le homelab

Voir [DEPLOYMENT.md](DEPLOYMENT.md). Le fichier Compose construit votre version locale ; il ne télécharge pas l’image d’origine qui ne contient pas ces modifications. Pour une publication sur Internet, utiliser HTTPS et définir `APP_ORIGIN` sur l’URL publique. Configurer aussi la limite des requêtes du reverse proxy (6 Mo suffisent pour les photos). Les visiteurs ne doivent jamais avoir accès au dossier `data/`.

## Développement

Node.js 24 et pnpm 11.25.0.

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
# Définir les variables du premier compte dans .env.local (hors Git)
# Pour le développement : APP_ORIGIN=http://localhost:3000
pnpm dev
pnpm test
pnpm typecheck
pnpm build
```

L’import est fondé sur les données produit JSON-LD et les métadonnées publiques des pages. Il ne garantit ni le prix en direct ni le stock et ne contourne pas les CAPTCHA. Une fiche partielle reste modifiable manuellement. Les requêtes d’import ne peuvent pas atteindre les adresses locales, privées, de métadonnées cloud ou les ports non standard ; chaque redirection est vérifiée et la résolution DNS validée est utilisée pour la connexion.

Les fichiers `public/images/` viennent du projet d’origine et ne sont pas insérés dans les nouvelles listes. Aucun exemple de cadeau ou compte de test n’est ajouté dans l’installation familiale.

## Vérifications

Les tests couvrent les prix français, l’extraction produit, les adresses refusées, les comptes, les droits d’accès aux listes et cadeaux, les images, les réservations concurrentes, les preuves d’annulation, le mot de passe familial, l’invalidation des sessions et les origines de requêtes. Les tests utilisent un dossier temporaire indépendant.

## GitHub

La branche de préparation est `feature/famille-fr`. Un fork GitHub peut recevoir cette branche ; conserver le dépôt d’origine comme remote `upstream`. Le workflow « Vérifications » exécute les tests et la construction. La publication d’une image sur GHCR est **manuelle** via le workflow dédié ; aucun identifiant Docker Hub n’est nécessaire.
