# Guitare Zero

Jeu d'apprentissage de la guitare : on charge une tablature texte, l'appli écoute la guitare (câble jack ou micro du téléphone) et valide chaque note.

## Fichiers
- `index.html` : toute l'appli (jeu, bibliothèque, scores, difficulté)
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png` : installation sur l'écran d'accueil
- `sw.js` : fonctionnement hors connexion

## Mise en ligne sur GitHub Pages
1. Sur github.com, créer un dépôt public `guitare-zero`.
2. « uploading an existing file » : glisser les 6 fichiers, puis « Commit changes ».
3. Settings → Pages → Source « Deploy from a branch », branche `main`, dossier `/ (root)`, Save.
4. Après 1 à 2 minutes : `https://<pseudo>.github.io/guitare-zero/`

Le micro ne fonctionne que sur une page `https://` (ou en ouvrant le fichier directement sur PC).

## Sur le téléphone
- Android (Chrome) : menu ⋮ → « Installer l'application » ou « Ajouter à l'écran d'accueil ».
- iPhone/iPad (Safari) : Partager → « Sur l'écran d'accueil ».
