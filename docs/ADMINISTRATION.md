# Studio des carnets — administration et publication

Travail réalisé sur la base actuelle issue de `Homepage-html.zip`. La page d’accueil, les autres pages du prototype et les archives originales sont conservées. Le lecteur public utilise désormais les versions publiées de la base de données.

## Démarrer et présenter le projet

Node.js 24.9 minimum, testé ici avec Node.js 24.22.1.

```powershell
npm.cmd ci
node tools/server.mjs
```

- Site : `http://127.0.0.1:5173/`
- Bibliothèque : `http://127.0.0.1:5173/#/carnets`
- Studio : `http://127.0.0.1:5173/admin.html`
- Démonstration sans compte : `http://127.0.0.1:5173/admin.html?showcase=1#demonstration`

La démonstration charge une copie des carnets publics dans la mémoire du navigateur. Son profil est explicitement fictif. Elle permet de modifier des pages, changer les couvertures, prévisualiser et simuler une publication. Les modifications disparaissent au rechargement. Les invitations, imports de fichiers et opérations de sécurité réelles sont indisponibles dans ce mode. Le mode démonstration n’est pas un raccourci d’authentification et ne donne aucun droit sur les API privées.

## Créer le premier compte réel

1. Ouvrir le studio.
2. Lire le fichier local `.data/setup-code.txt` sur l’ordinateur du serveur.
3. Copier son code dans le formulaire d’installation.
4. Choisir un nom, une adresse électronique et un mot de passe personnel d’au moins 12 caractères.

Le code à usage unique est supprimé après la création du compte. Aucun mot de passe prédéfini n’est livré. Les comptes de tests ne sont pas créés dans la base réelle.

Le compte initial peut inviter d’autres personnes depuis **Accès de l’équipe**. Les liens d’invitation expirent après 48 heures et ne fonctionnent qu’une fois. Le studio ne prétend pas envoyer d’e-mail : l’administrateur transmet le lien privé par le canal approprié. Un compte sans rôle administrateur peut s’authentifier mais ne peut pas accéder aux brouillons ni modifier le contenu.

## Préparer et publier un carnet

1. Créer un carnet, renseigner le voyage et sélectionner une couverture.
2. Composer les doubles pages, les ordonner et choisir une mise en page.
3. Importer les photos dans la photothèque. Ajouter une description accessible, un crédit et la référence de l’autorisation.
4. Ajouter les images aux pages, définir les légendes et le cadrage.
5. Enregistrer puis ouvrir la prévisualisation privée.
6. Lire les points signalés par l’analyse du carnet.
7. Confirmer explicitement **Publier**.

Le brouillon et la version publique sont deux documents distincts. Enregistrer une modification d’un carnet publié ne change pas la version visible par le public. Une nouvelle publication remplace ce document public. La dépublication retire également l’accès public aux images qui ne sont plus utilisées dans aucun autre carnet publié. L’archivage conserve le brouillon. La suppression du carnet requiert une confirmation ; les images restent dans la photothèque tant qu’elles ne sont pas supprimées séparément.

Les dates exactes restent facultatives pour les archives dont seule l’année est connue. Les emplacements sans photographie sont explicitement signalés et ne bloquent pas la publication. Le système ne crée jamais de faux souvenirs pour les remplir.

## Reconnaissance et aide à la décision

Le panneau **Reconnaissance & accès** distingue identité authentifiée, rôle, compte suspendu, session expirée et deuxième facteur requis. Son laboratoire de scénarios explique chaque décision et les actions autorisées. Modifier un scénario ne change aucun droit réel.

Le vérificateur de publication utilise des règles explicables, partagées entre le navigateur et le serveur : informations essentielles, disponibilité des médias, autorisations documentées, descriptions accessibles, images invisibles dans une composition, contraste du titre de couverture. Les dates absentes et les emplacements réservés restent des conseils non bloquants.

Il ne s’agit pas d’une reconnaissance faciale, d’une vérification automatique de documents d’identité, ni d’un modèle d’IA capable de certifier le consentement. L’école reste responsable de vérifier les autorisations déclarées. Une connexion SSO à son annuaire n’est pas implémentée.

## Protection effectivement implémentée

- Mots de passe salés et dérivés avec scrypt (N=32768, r=8, p=3).
- Sessions opaques aléatoires, stockées sous forme de hachage côté serveur. Cookie HttpOnly, SameSite=Strict, Secure lorsque l’origine est HTTPS.
- Expiration absolue de 8 heures, expiration après 30 minutes d’inactivité et invalidation à la déconnexion.
- Rôle et état actif contrôlés côté serveur pour chaque requête privée.
- Protection contre les requêtes intersites par vérification de l’origine et jeton CSRF.
- Limitation des tentatives de connexion et des opérations sensibles.
- Double authentification TOTP facultative, vérification du code avant activation, refus de réutilisation d’un code déjà accepté.
- Réauthentification pour invitations, changement de droits, mot de passe et configuration MFA.
- Validation des données, contrôle de version pour éviter l’écrasement d’une modification concurrente, requêtes SQL paramétrées.
- Images JPEG/PNG/WebP décodées et réencodées avec Sharp : 10 Mo maximum, 24 mégapixels, sortie WebP limitée à 2400 px. Métadonnées d’appareil supprimées ; SVG et contenus invalides refusés.
- Médias stockés hors des chemins statiques autorisés. Leur accès public exige une référence dans un album publié et une autorisation approuvée.
- Journal des actions d’administration. Configuration et données privées exclues du serveur statique et de Git.

Les principes de session et de protection intersite ont été vérifiés dans les documentations [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) et [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html). Le traitement des images s’appuie sur [Sharp](https://sharp.pixelplumbing.com/api-constructor/), le stockage sur [SQLite intégré à Node.js](https://nodejs.org/download/release/v24.9.0/docs/api/sqlite.html), et les codes temporaires sur [OTPAuth](https://github.com/hectorm/otpauth).

## Exploitation et limites

Cette implémentation convient à un serveur unique avec stockage persistant local. Par défaut, elle écoute uniquement sur `127.0.0.1`. Elle ne doit pas être déployée comme un simple ensemble de fichiers statiques.

Pour un hébergement réel, configurer une origine HTTPS explicite avec `PUBLIC_ORIGIN`, un reverse proxy conservant l’en-tête Host, un répertoire persistant `DATA_DIR`, des sauvegardes privées et une surveillance adaptée. `HOST` reste local par défaut. Une origine externe HTTP non chiffrée est refusée. Aucune infrastructure n’a été achetée ou déployée.

Le dossier `.data` contient la base, les fichiers importés et des secrets MFA nécessaires au serveur. Protéger ses droits d’accès et les sauvegardes au niveau du système. Pour une sauvegarde simple et cohérente : arrêter le serveur, copier le dossier `.data` complet dans un emplacement privé, puis redémarrer. Ne pas placer ce dossier sur un hébergement statique ou dans un dépôt Git.

Récupération par l’opérateur disposant d’un accès au serveur :

```powershell
node tools/admin-recovery.mjs --email=personne@exemple.fr
```

Cette commande ferme les sessions, révoque le mot de passe actuel et écrit un lien de récupération valable une heure dans `.data/recovery-link.txt`. La MFA existante reste exigée. Ajouter `--reset-mfa` uniquement si l’opérateur décide explicitement de réinitialiser ce facteur après vérification de l’identité. Les liens privés ne doivent pas être publiés.

Le prototype d’origine comporte encore des interactions conceptuelles de contact/newsletter sans backend : elles ne font pas partie du studio. L’authentification du studio est distincte de Pronote, dont le lien reste externe.

## Vérification réalisée

`npm.cmd run check` : syntaxe des 28 modules JavaScript validée.

`npm.cmd test` : 62 contrôles API/sécurité et 14 contrôles de règles. Cas couverts : accès anonyme et non administrateur, cookies forgés, fichiers privés, CSRF/origine, vie des invitations, médias privés, images invalides, autorisations, publication et dépublication, brouillons distincts, versions concurrentes, MFA et réutilisation de code, session expirée, désactivation de compte, limitation de connexion, persistance après redémarrage, conservation des huit albums.

`npm.cmd run test:browser` : Chrome réel, base temporaire. Création du premier compte par formulaire, panneau de reconnaissance, création/édition/ordre des pages, enregistrement, prévisualisation privée, publication, isolation du brouillon, reconnexion après expiration sans perte du formulaire, import et autorisation d’image, déconnexion, démonstration sans écriture dans la base. Contrôles visuels et absence de débordement horizontal à 1440, 768, 390 et 320 px. Aucune erreur console rapportée. Captures : `docs/admin-tests/`.

La suite du lecteur public vérifie aussi les quatre largeurs, les ouvertures/fermetures animées, la navigation inverse, les liens directs, le clavier, le focus et la réduction des animations. Une régression du runtime React d’origine a été corrigée en isolant les états de chargement dans le Shadow DOM.

Non vérifié : appareils physiques Safari/iOS/Android, lecteurs d’écran, audit d’intrusion indépendant, forte charge, infrastructure HTTPS externe et annuaire réel de l’école. Ne pas présenter ces tests locaux comme une certification de sécurité ou d’accessibilité.

## Album editor usability update — 16 November 2026

- Follow Informations → Couverture → Les pages. Required travel fields are marked with an asterisk.
- Import JPEG, PNG or WebP directly from a page or cover. Pages accept up to three photos in collage mode, or one in other layouts. Existing images remain available through the library picker.
- Describe each imported image and record publication permission within the editor. These media records are shared across albums and are saved with the draft. No separate trip to the photothèque is required.
- The live render updates during editing; “Ouvrir le rendu” saves and opens the full private reader.
- Blocking publication checks are always expanded, with correction buttons. Optional dates, unfinished narratives and explicitly labelled photo placeholders do not block publication. Server errors remain in a persistent editor message and unsaved edits are retained.
- “Retour au site du lycée” opens the school homepage in a separate tab, preserving the editing session.
- Showcase photo imports use temporary browser object URLs. They are not uploaded and disappear when the demonstration is reloaded. The full reader preview receives these URLs only through the origin-checked parent handshake.

Validation: JavaScript syntax; 62 API/security checks; 14 readiness/access checks; isolated Chrome workflow covering inline imports, permission correction, preview, publishing, session recovery, and 1440/768/390/320px layouts. Physical mobile devices and Safari have not been tested.
