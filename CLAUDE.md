# RPok — Ranges de poker 6-max

Site statique (HTML/CSS/JS vanilla, sans build) qui affiche des ranges Texas Hold'em 6-max 100 BB.
S'ouvre directement via `index.html`. Les ranges sont en lecture seule dans l'interface : on ne les modifie que dans le code (`js/ranges.js`).

- `js/ranges.js` : données (ranges par spot, position et profil de table) + couleurs des actions
- `js/app.js` : parsing de la notation, table 6-max, grille 13×13, panneau de stats
- `css/style.css` : style ; l'écran doit tenir sur un portable sans scroll (pas de barre de titre, pas de cartes sur la table)

## Parcours utilisateur

1. Sélecteur de position du héros en haut (pas d'écran d'accueil : LJ affiché par défaut). C'est le seul moyen de changer de héros.
2. Table 6-max (héros toujours en bas) avec, à côté, le menu du profil de joueurs à la table.
   Cliquer sur le siège d'un vilain ouvre un menu pour donner son action (Aucune / Raise / Call / 3bet / Limp). Le siège du héros n'est pas cliquable.
3. Grille de range en dessous (façon Suited / GTO Wizard) avec fréquences mixtes.

## Spots

Le spot est déduit des actions des vilains (`currentSpot()` dans `js/app.js`) :

- aucune action → **open** : `RANGES.open[héros][profil]`
- un seul vilain avant le héros fait Raise → **3bet** face à un open : `RANGES.threebet[héros][ouvreur][profil]` (actions `'3bet'` et `call`)
- un seul vilain après le héros fait 3bet → **défense vs 3bet** (le héros a ouvert) : `RANGES.vs3bet[héros][3betteur][profil]` (actions `'4bet'` et `call`)
- un seul vilain avant le héros fait Limp → **iso sur limp** : `RANGES.iso[héros][limpeur][profil]` (actions `'iso'` et `large` = mains jouées en plus, à la même taille ou à une taille différente selon le spot, quand la table est passive ou en polarisation) ; pour LJ/HJ/CO/BTN/SB en tant que héros, le héros a toujours la position postflop sur le limpeur donc la même range est référencée pour chaque limpeur possible (objet JS partagé, voir `ISO_HJ`/`ISO_CO`/etc. dans `js/ranges.js`) ; pour BB, le limpeur change tout (SB laisse BB en position postflop, d'où une range bien plus large que face à un limpeur LJ/HJ/CO/BTN)
- un vilain fait Raise puis un autre Call, tous deux avant le héros → **squeeze** : `RANGES.squeeze[héros][ouvreur][caller][profil]` (actions `squeeze`, `call` et `callwhale` = call si baleine en blindes)
- toute autre séquence → « spot non couvert » (grille vide)

## Profil de la table

Le menu à côté de la table choisit le profil des joueurs à la table, qui fait varier les ranges.
Le menu ne montre que les profils qui ont une range pour le spot affiché (vs. reg toujours, sauf sur l'iso sur limp où il n'est pas défini).

| Clé (`js/ranges.js`) | Libellé | Ancien indice |
|---|---|---|
| `aggro` | vs. aggro | -1 |
| `gto` | vs. reg (stratégie de base, par défaut) | 0 |
| `lin` | vs. reg linéaire | — |
| `fish` | vs. passif | +1 |
| `nit` | vs. nit | +2 |
| `supernit` | vs. super nit | +3 |
| `limp528` | vs. 5-28 (joueur à 5 % PR / 28 % limp) | — |
| `limp050` | vs. 0-50 (joueur à 0 % PR / 50 % limp) | — |
| `limp0100` | vs. 0-100 (profil de limpeur SB, iso BB) | — |
| `limp1660` | vs. 16-60 (profil de limpeur SB, iso BB) | — |
| `limp037` | vs. 0-37 (profil de limpeur SB, iso BB) | — |

Dans `js/ranges.js`, chaque spot a une entrée par profil. Un profil absent n'apparaît pas dans le menu pour ce spot ; si c'était le profil choisi, la range `gto` est affichée si elle est définie pour ce spot, sinon la première range disponible (le choix revient sur les spots qui le définissent). Ne pas dupliquer une range identique à un autre profil : ne mettre que les profils qui diffèrent.
