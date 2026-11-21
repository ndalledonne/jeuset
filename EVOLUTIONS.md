# Évolutions envisagées

Idées pour les prochaines versions de JeuSet. Rien n'est encore décidé : cette liste sert à choisir et à prioriser.
Les versions publiées sont décrites dans [CHANGELOG.md](CHANGELOG.md).

## Réalisé

- [x] **Partager le score à tout moment** (WhatsApp, SMS, e-mail, copie) — version 1.0.0.
- [x] **Bouton « Installer l'appli »** sur l'écran d'accueil (Android : fenêtre d'installation ; iPhone : mode d'emploi) — version 1.1.0.

## Sans serveur (reste 100 % dans le navigateur)

- [ ] **Statistiques du match** : aces, doubles fautes, fautes directes, coups gagnants.
  Un appui long ou un petit menu sur le bouton de point permettrait de préciser le type de point, sans l'imposer.
- [ ] **Première / deuxième balle** : pourcentage de premières balles et points gagnés derrière.
- [ ] **Historique des matchs** : date, adversaire, tournoi, score final, consultable après coup.
  Limite : stocké dans le navigateur du téléphone (`localStorage`), donc perdu si les données du site sont effacées.
- [ ] **Export / import de l'historique** (fichier JSON) pour le sauvegarder ou le changer de téléphone.
- [ ] **Partage en image** : une carte « tableau de score » à envoyer, en plus du texte.
- [ ] **Double** : rotation des quatre serveurs et côté de chaque joueur.
- [ ] **Format de tie-break réglable** : déclenchement à un autre score (par exemple 3-3 en sets courts), selon le règlement de la catégorie.
- [ ] **Écran toujours allumé pendant le match** (API Wake Lock), pour ne pas déverrouiller le téléphone à chaque point.
- [ ] **Mode paysage** : tableau et boutons côte à côte.

## Avec un serveur (PHP + MySQL sur l'hébergement Nuxit)

Changement d'architecture : il faudrait une API, une base de données et une gestion de la confidentialité.

- [ ] **Score en direct** : un lien à partager pour suivre le match en temps réel depuis un autre téléphone.
- [ ] **Historique synchronisé** entre plusieurs appareils (comptes ou lien privé).
- [ ] **Statistiques sur la saison** : bilan victoires / défaites, évolution par adversaire.

## Qualité

- [ ] Tests de l'interface dans un navigateur (Playwright) dans la CI, en plus des tests de la logique.
- [ ] Traduction de l'interface en anglais.
