# RPok — Ranges de poker 6-max

Site statique (HTML/CSS/JS vanilla, sans build) qui affiche des ranges Texas Hold'em 6-max 100 BB.
S'ouvre directement via `index.html`. Les ranges sont en lecture seule dans l'interface : on ne les modifie que dans le code (`js/ranges.js`).

- `js/ranges.js` : données (ranges par spot, position et indice de déviation) + couleurs des actions
- `js/app.js` : parsing de la notation, table 6-max, grille 13×13, panneau de stats
- `css/style.css` : style ; l'écran doit tenir sur un portable sans scroll (pas de barre de titre, pas de cartes sur la table)

## Parcours utilisateur

1. Sélecteur de position en haut (pas d'écran d'accueil : UTG affiché par défaut).
2. Table 6-max (héros toujours en bas) avec, à côté, le menu de l'indice de déviation (chiffres seuls, sans libellé).
3. Grille de range en dessous (façon Suited / GTO Wizard) avec fréquences mixtes.

## Indice de déviation

Entier de **-2 à +3** qui décrit la table et fait varier les ranges.
**L'indice -2 est retiré de l'interface et des données pour l'instant** (non utilisé) ; seuls -1 à +3 sont affichés.

| Indice | Signification |
|---|---|
| -2 | Table avec 2 joueurs très forts |
| -1 | Table avec 1 joueur fort |
| 0 | Range normale (stratégie de base) |
| +1 | 1 fish |
| +2 | 2 fish |
| +3 | 3 fish |

Règle de calcul : on compte **uniquement les joueurs qui restent à parler**. Indice = nombre de fish − nombre de regs forts, borné à [-2, +3].
Exemple : 3 fish et 1 bon reg restant à parler → indice = 3 − 1 = +2.

Un joueur très faible peut compter pour 2 : l'indice n'est donc **pas** limité par le nombre de joueurs restant à parler (ex. +3 possible au BTN). Tous les indices sont disponibles à toutes les positions.

Dans `js/ranges.js`, chaque position a une entrée par indice (`'-1'`, `0`, `1`, `2`, `3` ; les négatifs entre guillemets). Si un indice n'est pas défini, la range de l'indice 0 est affichée avec un avertissement.
