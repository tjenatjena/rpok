# RPok — Ranges de poker 6-max et 9-max

Site statique (HTML/CSS/JS vanilla, sans build) qui affiche des ranges Texas Hold'em 6-max et 9-max 100 BB.
S'ouvre directement via `index.html`. Les ranges sont en lecture seule dans l'interface : on ne les modifie que dans le code (`js/ranges.js`).

- `js/ranges.js` : données (ranges par spot, position et profil de table) + couleurs des actions
- `js/app.js` : parsing de la notation, table 6-max / 9-max, grille 13×13, panneau de stats, switch de format ; expose le cœur dans `window.RPok` (`POSITIONS` et `tableLevel` via des getters) et démarre au `DOMContentLoaded`
- `js/drill.js` (chargé après `app.js`, pas de modules ES car le site s'ouvre en `file://`) : tout le drill (questions, verdicts, animations, fin de série, journal des erreurs, raccourcis clavier du drill, `rpokSkip(n)` en console pour sauter n mains) ; remplit `RPok.drill`, que `app.js` interroge (`question()`, `answered()`, verrous, `renderPanel()`, `onFormatChange()`)
- `css/style.css` : style ; l'écran doit tenir sur un portable sans scroll (pas de barre de titre, pas de cartes sur la table) ; sur petit écran (téléphone, `max-width: 860px` ou `max-height: 480px`) la page défile en colonne, sans menu de profil, avec le menu Drill en panneau pleine largeur sous le bouton (modes en accordéon, profils du mode en boutons sur deux colonnes)

## Parcours utilisateur

0. Pas d'écran d'intro : le site s'ouvre sur la consultation. Un switch **9max / 6max** à droite du sélecteur de positions (aligné sur le bord droit du panneau) change le format, mémorisé dans `localStorage` (clé `rpok.format`, 6max par défaut). Le héros garde sa position si elle existe dans l'autre format (sinon la première : UTG en 9max, LJ en 6max) ; un drill en cours repart sur une question du nouveau format.
   Formats (`FORMATS` dans `js/app.js`) : 6max = LJ, HJ, CO, BU, SB, BB ; 9max = UTG, UTG1, UTG2 puis les mêmes. Les sièges de chaque format sont placés par `SLOTS_BY_FORMAT`.
1. Sélecteur de position du héros en haut (positions du format choisi). C'est le seul moyen de changer de héros.
2. Table 6-max ou 9-max (héros toujours en bas) avec, à côté, le menu du profil de joueurs à la table.
   Cliquer sur le siège d'un vilain ouvre un menu pour donner son action (Aucune / Raise / Call / 3bet / Limp ; pendant le drill, ce clic verrouille le vilain, voir Drill). Le siège du héros n'est pas cliquable (hors drill).
3. Grille de range en dessous (façon Suited / GTO Wizard) avec fréquences mixtes.
4. Panneau à droite de la grille : titre du spot, encart de notes (sizings — sur le 3bet, seule la ligne de la position du héros est affichée (IP / SB / BB liné + pola), et `SIZING_NOTES.threebet.tables` peut remplacer le tableau pour un couple héros / ouvreur, ex. « BB vs SB » ; sur le 3bet, notes de stratégie par position du héros + notes générales + note du profil : vs. reg affiche vs. aggro, vs. fish, vs. nit dans cet ordre ; `THREEBET_SPOT_NOTES` remplace ces notes pour un couple héros / ouvreur, ex. « BB vs BU » : seules les notes de l'onglet du profil dans `MC26+W25.rm` sous le tableau de sizing), légende et détail de la main survolée. Pas de sous-titre ni de sizing dans la légende pour le 3bet, ni pour la défense vs 3bet (titre abrégé « Def vs 3bet » ; sizing uniquement dans l'encart de notes, sur une ligne : « IP: x2,2 & OOP: x2,7 (max: Xbb) », `max` = `size` du spot).

## Drill

Le bouton Drill ouvre un menu de modes : **ALL** (questions de tous les modes mélangées au hasard), **Open**, **3b** (héros LJ à SB face à un open), **Def BB** (BB face à un open), **Def vs 3b**, **Squeeze**, **Iso** ; chaque mode ouvre un sous-menu (survol ou clic) « Tous profils » + les profils qui ont au moins une range pour ce mode, pour s'entraîner sur un seul profil (ex. Open → vs. reg ; le libellé du bouton devient « Drill · Open · vs. reg ») ; un nouveau clic arrête le drill.
Le drill ne tire que des positions du format choisi (les opens UTG, UTG1, UTG2 seulement en 9max).
Chaque question tire au hasard une situation (héros + vilain(s) selon le spot), un profil défini pour ce spot et une main. Les types de question sont dans `DRILL_KINDS` (`js/drill.js`) : spot de `RANGES` interrogé, réponses proposées et actions de la range regroupées sous chaque réponse (le reste = fold) :
   - Open : Fold / Raise
   - 3b et Def BB (`RANGES.threebet`, BB à part) : Fold / Call / 3bet ; 3bet/5bet all-in et 3b value / linéaire / polarisé comptent comme 3bet ; exception en Def BB : quand le 3bet de la range n'est fait que de 3b liné et/ou 3b pola (BB vs BU, `drillAnswerSet`), chaque variante présente a son bouton (« 3b liné 11 », « 3b pola 13 ») à la place de 3bet
   - Def vs 3b (`RANGES.vs3bet`) : Fold / Call / 4bet ; le 4bet all-in compte comme 4bet, « call si 3b petit » compte comme fold (3bet de taille standard) ; la main n'est tirée que dans la range d'open du héros (même profil, repli sur `gto`) ; l'open du héros reste caché mais compte dans le montant du 3bet et le pot
   - Squeeze (`RANGES.squeeze`) : Fold / Call / Squeeze ; « call si baleine en blindes » compte comme fold
   - Iso (`RANGES.iso`) : Fold / Iso (Check / Iso pour BB) ; « large » compte comme iso
   Raccourcis clavier pour répondre : **F** = fold (check de la BB sur l'iso), **C** = call, **R** = relance (raise / 3bet / 4bet / squeeze / iso ; la première proposée, donc le 3b liné s'il y a deux variantes), **L** = 3b liné, **P** = 3b pola ; sans effet si la réponse n'est pas proposée.
   Verdict selon la fréquence de la main pour la réponse donnée (`drillVerdict`) : 100 % = juste, panneau vert ; fréquence mixte (ex. combo à 50 %) = juste aussi (compte comme bonne réponse) mais panneau jaune, avec les fréquences de la main dans le message ; 0 % = erreur, panneau rouge. Toutes les réponses jouées à une fréquence > 0 gardent le liseré blanc. La réponse de référence (`correct`, pour le journal des confusions) est la plus fréquente.
   Les boutons de relance affichent leur sizing (`answerSizing`) : `sizes` de l'action sinon `size` du spot, pour chaque action regroupée ; deux tailles listées (« Iso 4 / 7 »), trois ou plus en fourchette (« 3bet 11–13 »), « AI » ajouté si le 4bet all-in en fait partie. Fold et Call restent sans montant.
Le tirage vise les mains « border » (`DRILL_BORDER_SHARE` = 85 % des questions) : fréquence mixte, ou une des 8 cases voisines de la grille (diagonales comprises) a une autre action majoritaire ; le reste est tiré parmi toutes les mains possibles, toujours pondéré par les combos.
Pendant le drill, cliquer sur le siège du héros verrouille sa position (`state.drillHero`, cadenas en haut à droite du siège) : les questions suivantes ne portent que sur cette position, dans le mode et le profil choisis ; un nouveau clic la déverrouille, et changer ou arrêter le drill la libère. De même, cliquer sur le siège d'un vilain de la question verrouille le vilain (`state.drillVillain`, les deux sièges ensemble pour le squeeze) : combinable avec le verrou du héros pour travailler un spot précis (ex. BB vs BU) ; l'open, sans vilain, sort du tirage tant qu'un vilain est verrouillé. Cliquer sur le profil actif du menu de droite verrouille aussi le profil (`state.drillProfileLock`, cadenas sur le bouton ; les autres profils ne sont pas cliquables pendant le drill) ; si le sous-menu du drill impose déjà un profil, il est affiché verrouillé et le clic est sans effet. Les verrous devenus impossibles (ex. changement de format) sont libérés.
Pendant le drill, le siège du héros n'a ni jetons ni montant, juste un « ? » dans l'encadré jaune ; la grille est révélée après la réponse (sur petit écran — téléphone, `max-width: 860px` — elle est masquée pendant le drill et le bouton « Voir la range », affiché après la réponse, la montre sous le panneau ; le choix vaut pour les questions suivantes). La question suivante ne vient que quand l'utilisateur clique sur **Suivant** (ou Entrée / Espace) ; en attendant, la réponse donnée et les bonnes réponses (liseré blanc) restent nettes, les autres boutons s'estompent, et tout le panneau passe au vert, au jaune (main mixte) ou au rouge (erreur). À la réponse, un jeton part du siège du héros vers la table avec le montant (relance : taille de la variante que la main joue le plus, « AI » pour le 4bet all-in ; call : mise à suivre) et y reste jusqu'à Suivant ; sur un fold, deux cartes sont jetées vers le centre (rien sur le check de la BB).
Un drill dure 100 mains (`DRILL_LENGTH`) : le compteur affiche « Main n / 100 · x bonnes réponses » ; après la 100e réponse, le bouton Suivant devient **Résultats** et ouvre une fenêtre de fin de série (le drill s'arrête) : score en % (réponses justes, mixtes comprises, sur 100), score par thème si la série mélange plusieurs modes, puis la liste des erreurs de la série (n° de la main, main, spot, profil, réponse donnée, stratégie de la main) ; cliquer une erreur affiche sa range, **Rejouer 100 mains** relance le même mode et profil, et l'entrée **Dernier résultat** du menu Drill rouvre la fenêtre.
Chaque réponse est enregistrée dans `localStorage` (clé `rpok.drillLog.v1`, cumul par type|héros|vilain|profil|main, vilain = « ouvreur+caller » pour le squeeze ; les anciennes entrées `threebet` de BB sont rangées en Def BB à l'affichage : réponses, erreurs (réponse jouée à 0 % uniquement), `mix` = anciennes erreurs sur main mixte enregistrées avant la règle du jaune, et confusions « donnée>attendue »). L'entrée **Erreurs** du menu Drill ouvre une fenêtre filtrable par thème (les modes du drill) et par profil : spots les plus ratés, puis mains les plus ratées (vraies erreurs d'abord) avec l'erreur type ; cliquer une main affiche la range de son spot avec son détail. Bouton Réinitialiser pour vider le journal.

## Spots

Le spot est déduit des actions des vilains (`currentSpot()` dans `js/app.js`) :

- aucune action → **open** : `RANGES.open[héros][profil]` (repris de `MC26+W25.rm`, fusion de `MC26.rm` et `NL25RP.rm` : un onglet Range Manager par profil, vs. reg → `gto`, vs. passif → `fish` ; un combo présent dans une seule des deux sources est à 50 % ; UTG/UTG1/UTG2 n'existent qu'en 9max ; open à 2,5, SB à 3)
- un seul vilain avant le héros fait Raise → **3bet** face à un open : `RANGES.threebet[héros][ouvreur][profil]` (actions `'3bet'` et `call` ; certains spots BB découpent le 3bet en `3bvalue` rouge / `3blin` jaune / `3bpol` violet clair (BB vs BU repris de la catégorie BB de `MC26+W25.rm` : 3b pola 13bb / liné 11bb, une main à 50 % dans les deux est jouée moitié-moitié), avec le sizing de chaque variante dans le champ `sizes` du spot, affiché dans la légende ; dans le drill elles comptent comme 3bet)
- un seul vilain après le héros fait 3bet → **défense vs 3bet** (le héros a ouvert) : `RANGES.vs3bet[héros][3betteur][profil]` (actions `'4bet'` et `call` toujours, plus selon le profil `callsmall` = call si le 3bet est petit et/ou `jam` = 4bet all-in). `size` = sizing du 4bet affiché dans l'encart de notes (toujours 27bb). Dans la grille, le fold est affiché en deux teintes de gris pour ce spot : clair pour les mains réellement dans la range d'open du héros (`RANGES.open[héros][profil]`, le profil d'open suit celui du spot vs3bet, repli sur `gto`) mais qui foldent au 3bet, foncé pour celles jamais open-raise ; la légende « Fold » ne compte que les premières (combos d'open − combos défendus), pas les 169 mains de la grille
- un seul vilain avant le héros fait Limp → **iso sur limp** : `RANGES.iso[héros][limpeur][profil]` (actions `'iso'` et `large` = mains jouées en plus, à la même taille ou à une taille différente selon le spot, quand la table est passive ou en polarisation) ; pour LJ/HJ/CO/BU/SB en tant que héros, le héros a toujours la position postflop sur le limpeur donc la même range est référencée pour chaque limpeur possible (objet JS partagé, voir `ISO_HJ`/`ISO_CO`/etc. dans `js/ranges.js`) ; pour BB, le limpeur change tout (SB laisse BB en position postflop, d'où une range bien plus large que face à un limpeur LJ/HJ/CO/BU)
- un vilain fait Raise puis un autre Call, tous deux avant le héros → **squeeze** : `RANGES.squeeze[héros][ouvreur][caller][profil]` (actions `squeeze`, `call` et `callwhale` = call si baleine en blindes)
- toute autre séquence → « spot non couvert » (grille vide)

En 9max, les spots autres que l'open réutilisent les ranges 6-max des positions LJ à BB (même place par rapport au bouton) ; un spot impliquant UTG, UTG1 ou UTG2 comme vilain n'est pas couvert.

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
