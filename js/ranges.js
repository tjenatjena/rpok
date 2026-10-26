/*
 * Ranges de poker — Texas Hold'em 6-max, 100 BB effectifs.
 *
 * Pour modifier une range, éditer les chaînes ci-dessous.
 *
 * Notation (séparée par des virgules) :
 *   "AA"          une paire
 *   "22+"         toutes les paires de 22 à AA
 *   "99-66"       les paires de 99 à 66
 *   "AKs" / "AKo" main suited / offsuit ("AK" = les deux)
 *   "A2s+"        A2s, A3s, ... AKs (le kicker monte jusqu'à la carte haute - 1)
 *   "T8s+"        T8s, T9s
 *   "K9s-K6s"     K9s, K8s, K7s, K6s
 *   ":0.5"        fréquence optionnelle (0 à 1), ex. "A5o:0.5"
 *
 * Toute main absente d'une action est jouée "fold" pour la fréquence restante.
 *
 * Chaque position a une entrée par profil de joueurs à la table (voir CLAUDE.md) :
 *   aggro : vs. aggro       gto : vs. reg (stratégie de base)    lin : vs. reg linéaire
 *   fish  : vs. passif
 *   nit   : vs. nit         supernit : vs. super nit
 * Un profil absent n'est pas proposé dans le menu pour ce spot (la range gto est affichée à la place).
 *
 * Sections :
 *   open     : RANGES.open[héros][profil]                 (premier à parler)
 *   threebet : RANGES.threebet[héros][ouvreur][profil]    (un vilain a ouvert avant le héros)
 *   vs3bet   : RANGES.vs3bet[héros][3betteur][profil]     (le héros a ouvert, un vilain après lui 3bet)
 *   iso      : RANGES.iso[héros][profil]                   (un vilain limp avant le héros ; même range
 *                                                            quel que soit le limpeur, action 'iso')
 *   squeeze  : RANGES.squeeze[héros][ouvreur][caller][profil] (un vilain ouvre, un autre call, avant le héros)
 * "size" = taille de la relance du héros en BB (open, 3bet, 4bet ou squeeze).
 * '5bet' (dans threebet) = main 3bet puis 5bet all-in face à un 4bet ; à placer avant '3bet'.
 * Les actions sont appliquées dans l'ordre : une main à "AQs:0.5" en 3bet puis "AQs" en call
 * est 3bet 50 % / call 50 %.
 *
 * Marques (bordure sur la case, en plus des actions) : un spot peut avoir une clé de MARKS,
 * ex. call4bet: 'AA, AQs' = mains à call face à un 4bet (les fréquences sont ignorées).
 */

window.ACTIONS = {
  // "text" = couleur du texte sur l'étiquette du siège (blanc par défaut).
  raise: { label: 'Raise', color: '#e3b31b', text: '#1d232b' },
  '3bet': { label: '3bet',  color: '#e3b31b', text: '#1d232b' },
  '5bet': { label: '3bet / 5bet all-in', color: '#d32f2f' },
  // Variantes de 3bet (BB) : comptent comme un 3bet dans le drill. Le sizing affiché dans la
  // légende vient du champ "sizes" du spot.
  '3bvalue': { label: '3b value', color: '#d32f2f' },
  '3blin':   { label: '3b linéaire', color: '#e3b31b', text: '#1d232b' },
  '3bpol':   { label: '3b polarisé', color: '#c39bd3', text: '#1d232b' },
  '4bet': { label: '4bet',  color: '#e0523f' },
  squeeze: { label: 'Squeeze', color: '#d93b3b' },
  iso:   { label: 'Iso',   color: '#e3b31b', text: '#1d232b' },
  large: { label: 'Large', color: '#f2d024', text: '#1d232b' },
  call:  { label: 'Call',  color: '#3fa96b' },
  callwhale: { label: 'Call si baleine en blindes', color: '#4f6df5' },
  callsmall: { label: 'Call si 3b petit', color: '#f2d024', text: '#1d232b' },
  jam: { label: '4bet All-in', color: '#8e44ad' },
  limp:  { label: 'Limp',  color: '#3fa96b' },
  fold:  { label: 'Fold',  color: '#2f3a48' },
  // Défense vs 3bet uniquement : portion du fold qui correspond à une main réellement ouverte
  // puis foldée au 3bet (par opposition aux mains jamais open-raise, en gris foncé ci-dessus).
  fold3bet: { label: 'Fold au 3bet', color: '#3c4759' },
};

window.MARKS = {
  call4bet: { label: 'Call 4bet', color: '#4f6df5' },
};

// BU face à un open LJ et un call (HJ ou CO) : chart « BU vs Early ».
const SQUEEZE_BU_VS_EARLY = {
  gto: {
    size: 13,
    actions: {
      squeeze:   'QQ+, AKs, AKo, AQo, A5s, A4s, JJ:0.5, AQs:0.5, AJs:0.5, ATs:0.5, KQs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, ' +
                 'KQo:0.5, 76s:0.5, 65s:0.5',
      callwhale: 'JJ-66, AQs, AJs, ATs, KQs, KJs, KTs, QJs, QTs, JTs',
    },
  },
};

window.RANGES = {
  open: {
    LJ: {
      gto: {
        size: 2,
        actions: {
          raise: '77+, ' +
                 'A2s+, K8s+, QTs+, JTs, ' +
                 'ATo+, KQo',
        },
      },
      fish: {
        size: 2,
        actions: {
          raise: '55+, ' +
                 'A2s+, K6s+, Q9s+, JTs, ' +
                 'ATo+, KTo+, QJo',
        },
      },
      nit: {
        size: 2,
        actions: {
          raise: '44+, ' +
                 'A2s+, K5s+, Q9s+, JTs, T9s, 98s, 87s, 76s, 65s,' +
                 'ATo+, KTo+, QJo',
        },
      },
      aggro: {
        size: 2,
        actions: {
          raise: '88+, ' +
                 'A3s+, KTs+, QTs+, JTs, ' +
                 'AQo+, KQo+',
        },
      },
    },
    HJ: {
      gto: {
        size: 2,
        actions: {
          raise: '66+, ' +
                 'A2s+, K4s+, Q9s+, J9s+, T9s, ' +
                 'ATo+, KTo+, QJo',
        },
      },
      fish: {
        size: 2,
        actions: {
          raise: '44+, ' +
                 'A2s+, K4s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, ' +
                 'A9o+, KTo+, QTo+',
        },
      },
      nit: {
        size: 2,
        actions: {
          raise: '33+, ' +
                 'A2s+, K3s+, Q8s+, J9s+, T9s, 98s, 87s, 76s, 65s, 54s, ' +
                 'A8o+, KTo+, QTo+',
        },
      },
      aggro: {
        size: 2,
        actions: {
          raise: '77+, ' +
                 'A2s+, KTs+, QTs+, JTs+, ' +
                 'AJo+, KQo+, ',
        },
      },
    },
    CO: {
      gto: {
        size: 2.3,
        actions: {
          raise: '55+, ' +
                 'A2s+, K3s+, Q8s+, J8s+, T8s+, 98s,' +
                 'A8o+, KTo+, QTo+, JTo',
        },
      },
      fish: {
        size: 2.3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q8s+, J8s+, T8s+, 98s, 87s, 76s, 65s, 54s,' +
                 'A7o+, K9o+, QTo+, JTo',
        },
      },
      nit: {
        size: 2.3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q6s+, J7s+, T7s+, 97s+, 87s, 76s, 65s, 54s, ' +
                 'A5o+, K9o+, QTo+, JTo',
        },
      },
      aggro: {
        size: 2.3,
        actions: {
          raise: '66+, ' +
                 'A2s+, KTs+, QTs+, JTs+, ' +
                 'ATo+, KTo+, QJo',
        },
      },
    },
    BU: {
      gto: {
        size: 2.5,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J5s+, T6s+, 96s+, 86s+, 75s+, 65s, 54s,' +
                 'A3o+, K8o+, Q9o+, J9o+, T9o',
        },
      },
      fish: {
        size: 2.5,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J2s+, T3s+, 95s+, 85s+, 74s+, 64s+, 53s+, 43s, ' +
                 'A2o+, K4o+, Q7o+, J7o+, T7o+, 97o+, 87o, 76o, ',
        },
      },
      nit: {
        size: 2.5,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J2s+, T3s+, 95s+, 85s+, 74s+, 64s+, 53s+, 43s, ' +
                 'A2o+, K2o+, Q6o+, J7o+, T7o+, 97o+, 87o, 76o, 65o, ',
        },
      },
      supernit: {
        size: 2.5,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, ' +
                 'A2o+, K2o+, Q2o+, J6o+, T6o+, 96o+, 86o+, 76o, 65o, ',
        },
      },
      aggro: {
        size: 2.5,
        actions: {
          raise: '22+, ' +
                 'A2s+, K8s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, ' +
                 'A9o+, KTo+, QTo+, JTo',
        },
      },
    },
    SB: {
      gto: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J5s+, T6s+, 96s+, 86s+, 75s+, 64s+, 54s,' +
                 'A3o+, K8o+, Q9o+, J9o+, T9o',
        },
      },
      fish: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J2s+, T3s+, 94s+, 84s+, 74s+, 64s+, 54s, ' +
                 'A2o+, K4o+, Q7o+, J7o+, T7o+, 97o+, 87o, 76o, ',
        },
      },
      nit: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J2s+, T2s+, 94s+, 84s+, 74s+, 64s+, 53s+, 43s, ' +
                 'A2o+, K2o+, Q6o+, J7o+, T7o+, 97o+, 86o+, 75o+, 65o, 54o, ',
        },
      },
      supernit: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, ' +
                 'A2o+, K2o+, Q2o+, J2o+, T6o+, 96o+, 86o+, 75o+, 65o, 54o,  ',
        },
      },
      aggro: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K8s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, ' +
                 'A9o+, KTo+, QTo+, JTo',
        },
      },
    },
  },
  // Seuls les profils définis ici sont proposés dans le menu pour le spot.
  threebet: {
    HJ: {
      LJ: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AJs+, AQo+, KJs+,',
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': 'TT+, A9s+, AQo+, KTs+, A5s, A4s, KQo',
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQo+, KJs+, AJs+, A8s-A6s',
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AJs+, AQo+, KJs+,',
          },
        },
      },
    },
    CO: {
      LJ: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AJs+, AQo+, KJs+, A5s',
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': '99+, A8s+, AQo+, KTs+, QJs, A5s, A4s, KQo',
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQo+, KJs+, AJs+, A8s-A5s',
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AJs+, AQo+, KJs+, A5s',
          },
        },
      },
      HJ: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'TT+, ATs+, AQo+, KJs+, QJs, KQo, A5s',
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': '99+, A9s+, AJo+, KTs+, QJs, A5s, A4s, KQo',
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': 'TT+, ATs+, AQo+, KJs+, KQo, QJs, A8s-A5s',
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'TT+, ATs+, AQo+, KJs+, QJs, KQo, A5s',
          },
        },
      },
    },
    BU: {
      LJ: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AQs+, AQo+, KQo, JJ:0.5, TT:0.5, A5s, A4s',
            call:   'JJ-88, AJs, ATs, KQs, KJs, KTs, QJs, JTs',
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': '88+, A9s+, A8s, A5s, A4s, AQo+, KQo, KTs+, QJs, JTs',
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AQs+, AQo+, KQo, A8s-A3s',
            call:   'JJ-88, AJs, ATs, KQs, KJs, KTs, QJs, JTs',
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AQs+, AQo+, KQo, JJ:0.5, TT:0.5, A5s, A4s',
            call:   'JJ-88, AJs, ATs, KQs, KJs, KTs, QJs, JTs',
          },
        },
      },
      HJ: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AQs+, AQo+, KQo, A5s, A4s, JJ, TT:0.5',
            call:   'JJ-88, AJs, ATs, KQs, KJs, KTs, QJs, JTs',
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AQs+, AQo+, KQo, AJo, A9s, A8s, QTs, A5s, A4s, K9s, JJ-88, AJs, ATs, KQs, KJs, KTs, QJs, JTs',
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AQs+, AQo+, KQo, A8s-A3s',
            call:   'JJ-88, AJs, ATs, KQs, KJs, KTs, QJs, JTs',
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AJs+, AQo+, KQs, KQo, A9s, A5s, A4s, JJ, TT:0.5',
            call:   'JJ-88, AJs, ATs, KQs, KJs, KTs, QJs, JTs',
          },
        },
      },
      CO: {
        gto: {
          size: 10,
          actions: {
            '5bet': 'QQ+, AKs, AKo, JJ:0.5',
            '3bet': 'TT+, AQs+, A9s, A8s, K9s, AJo+, KQo',
            call:   'AJs, ATs, KQs, KJs, KTs, QJs, QTs, JTs, 99-66',
          },
        },
        fish: {
          size: 10,
          actions: {
            '5bet': 'QQ+, AKs, AKo, JJ',
            '3bet': 'TT+, AQs+, A9s, A8s, K9s, AJo+, KQo, AJs, ATs, KQs, KJs, KTs, QJs, QTs, JTs, 99-77, K8s, Q9s, J9s, T9s, KJo, QJo, ATo, KTo, A7s-A4s',
          },
        },
        nit: {
          size: 10,
          actions: {
            '5bet': 'QQ+, AKs, AKo',
            '3bet': 'JJ+, AKs, AJo+, KQo, A7s-A2s, 76s, 65s, 54s',
            call:   'AQs, AJs, ATs, KQs, KJs, KTs, QJs, QTs, JTs, TT-66',
          },
        },
        aggro: {
          size: 10,
          call4bet: 'AA, AQs, AJs, KQs, JJ-99',
          actions: {
            '5bet': 'QQ+, AKs, AKo, JJ:0.5',
            '3bet': '99+, AQs+, A9s, A8s, K9s, AJo+, KQo, KQs, AJs',
            call:   'ATs, KJs, KTs, QJs, QTs, JTs, 88-66',
          },
        },
      },
    },
    SB: {
      LJ: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo, KQs, TT:0.5, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5',
            call:   'TT, 99, AJs, ATs, KJs, KTs, QJs',
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AQo+, KQs, TT:0.5, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5',
            call:   'TT, 99, AJs, ATs, KJs, KTs, QJs',
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo, KQs, TT:0.5, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, AQo, A5s',
            call:   'TT, 99, AJs, ATs, KJs, KTs, QJs',
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo, KQs, TT:0.5, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5',
            call:   'TT, 99, AJs, ATs, KJs, KTs, QJs',
          },
        },
      },
      HJ: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo, KQs, TT:0.5, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5',
            call:   'TT, 99, AJs, ATs, KJs, KTs, QJs',
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AQo+, KQs, TT:0.5, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5',
            call:   'TT, 99, AJs, ATs, KJs, KTs, QJs',
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo, KQs, TT:0.5, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, AQo, A5s, KQo',
            call:   'TT, 99, AJs, ATs, KJs, KTs, QJs',
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo, KQs, TT:0.5, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5',
            call:   'TT, 99, AJs, ATs, KJs, KTs, QJs',
          },
        },
      },
      CO: {
        gto: {
          size: 10,
          actions: {
            '3bet': '99+, AQs+, KQs, AQo+, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5',
            call:   'AJs, ATs, KJs, KTs, QJs, QTs, JTs, 88',
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': '99+, AQs+, KQs, AQo+, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, KQo, AJo',
            call:   'AJs, ATs, KJs, KTs, QJs, QTs, JTs, 88',
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': '99+, AQs+, KQs, AQo+, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, KQo, AJo, A9s, A5s',
            call:   'AJs, ATs, KJs, KTs, QJs, QTs, JTs, 88',
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': '99+, AQs+, KQs, AQo+, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5',
            call:   'AJs, ATs, KJs, KTs, QJs, QTs, JTs, 88',
          },
        },
      },
      BU: {
        gto: {
          size: 10,
          actions: {
            '5bet': 'JJ+, AKs, AKo',
            '3bet': 'TT+, AQs+, AJs, A8s, A7s, A5s, A4s, KQs, AJo+, KJo+, ATs:0.5, A9s:0.5, KJs:0.5, KTs:0.5, QJs:0.5, QTs:0.5, JTs:0.5, 99-88:0.5',
            call:   'ATs, A9s, KJs, KTs, QJs, QTs, JTs, 99-66',
          },
        },
        fish: {
          size: 10,
          actions: {
            '5bet': 'JJ+, AKs, AKo',
            '3bet': 'TT+, AQs+, AJs, A8s, A7s, A5s, A4s, KQs, AJo+, KJo+, ATs, A9s, KJs, KTs, QJs, QTs, JTs, 99-66, Q9s, J9s, T9s, ATo, K9s',
          },
        },
        nit: {
          size: 10,
          actions: {
            '5bet': 'JJ+, AKs, AKo',
            '3bet': 'TT+, AQs+, AJs, A8s, A7s, A5s, A4s, KQs, AJo+, KJo+, ATs:0.5, A9s:0.5, KJs:0.5, KTs:0.5, QJs:0.5, QTs:0.5, JTs:0.5, 99-88:0.5, A6s, A3s, A2s, K9s, K8s, 65s, ATo, QJo, KTo',
            call:   'ATs, A9s, KJs, KTs, QJs, QTs, JTs, 99-66',
          },
        },
        aggro: {
          size: 10,
          call4bet: 'AA, AQs, AJs, KQs, TT-99',
          actions: {
            '5bet': 'JJ+, AKs, AKo',
            '3bet': 'TT+, AQs+, AJs, A8s, A7s, A5s, A4s, KQs, AJo+, KJo+, ATs:0.5, A9s:0.5, KJs:0.5, KTs:0.5, QJs:0.5, QTs:0.5, JTs:0.5, 99-88:0.5, K9s, ATo',
            call:   'ATs, A9s, KJs, KTs, QJs, QTs, JTs, 99-66',
          },
        },
      },
    },
    BB: {
      LJ: {
        gto: {
          size: 12,
          actions: {
            '3bet': 'KK+, AKs, A4s-A2s, K7s-K6s, Q9s, 65s, QQ:0.5, AQs:0.5, AKo:0.5',
            call:   'QQ-22, AQs-A5s, K8s+, QTs+, J9s+, T8s+, 97s+, 86s+, 75s+, 64s, 54s, AJo+, KQo',
          },
        },
        aggro: {
          size: 12,
          actions: {
            '3bet': 'QQ+, AKs, A4s-A2s, K7s-K6s, Q9s, 65s, AKo, AQs:0.5',
            call:   'JJ-22, AQs-A5s, K9s+, QTs+, J9s+, T9s, 98s, 87s, 76s, 54s, AQo-AJo, KQo',
          },
        },
        fish: {
          size: 12,
          actions: {
            '3bet': 'KK+, AKs, A4s-A2s, K7s-K6s, Q9s, 65s, QQ-JJ:0.5, AQs:0.5, AQo+:0.5',
            call:   'QQ-22, AQs-A5s, K8s+, K5s-K4s, QTs+, Q8s, J8s+, T8s+, 97s+, 86s+, 75s+, 64s, 53s+, 43s, ATo+, KJo+',
          },
        },
      },
      HJ: {
        gto: {
          size: 12,
          actions: {
            '3bet': 'QQ+, AKs, A4s-A2s, K6s-K5s, Q8s, 65s, AKo, JJ:0.5, AQs:0.5, KQo:0.5',
            call:   'JJ-22, AQs-A5s, K7s+, Q9s+, J8s+, T8s+, 97s+, 86s+, 75s+, 64s, 54s, AQo-ATo, KJo+',
          },
        },
        aggro: {
          size: 12,
          actions: {
            '3bet': 'QQ+, AKs, A4s-A2s, K6s-K5s, Q8s, 65s, AKo, JJ:0.5, AQs:0.5, KQo:0.5',
            call:   'JJ-22, AQs-A5s, K9s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 54s, AQo-AJo, KQo',
          },
        },
        fish: {
          size: 12,
          actions: {
            '3bet': 'QQ+, AKs, A4s-A2s, K6s-K5s, Q8s, 65s, AKo, JJ:0.5, AQs:0.5, AQo:0.5, KQo:0.5',
            call:   'JJ-22, AQs-A5s, K7s+, K4s-K3s, Q9s+, J8s+, T7s+, 96s+, 86s+, 75s+, 64s, 53s+, 43s, AQo-ATo, KTo+, QJo',
          },
        },
      },
      CO: {
        gto: {
          size: 12,
          actions: {
            '3bet': 'JJ+, AQs+, A3s-A2s, K3s-K2s, Q4s, J7s, AKo, TT:0.5, AJo:0.5, KQo:0.5',
            call:   'TT-22, AJs-A4s, K4s+, Q5s+, J8s+, T8s+, 97s+, 86s+, 75s+, 64s+, 54s, 43s, AQo-ATo, KTo+, QJo',
          },
        },
        aggro: {
          size: 12,
          actions: {
            '3bet': 'JJ+, AQs+, A3s-A2s, K3s-K2s, Q4s, J7s, AKo, TT:0.5, AJo:0.5, KQo:0.5',
            call:   'TT-22, AJs-A4s, K4s+, Q8s+, J8s+, T8s+, 98s, 87s, 76s, 65s, 54s, AQo-ATo, KJo+',
          },
        },
        fish: {
          size: 12,
          actions: {
            '3bet': 'JJ+, AQs+, A3s-A2s, K3s-K2s, Q4s, J7s, AKo, TT:0.5, AQo-AJo:0.5, KQo:0.5',
            call:   'TT-22, AJs-A4s, K4s+, Q5s+, J8s+, T7s+, 96s+, 85s+, 75s+, 64s+, 53s+, 43s, AQo-A9o, KTo+, QTo+, JTo',
          },
        },
      },
      BU: {
        gto: {
          size: 12,
          sizes: { '3blin': 11, '3bpol': 13 },
          actions: {
            '3bvalue': '99+, AJs+, KJs+, JTs, T9s, AJo+, KQo',
            '3blin':   '88, ATs, KTs, QJs, 98s, 87s, KJo',
            '3bpol':   'A5s, K2s, Q2s, J5s, T6s, 65s, 54s, A4o-A3o',
            call:      '77-22, A9s-A6s, A4s-A2s, K9s-K3s, QTs-Q3s, J9s-J6s, T8s-T7s, 97s-96s, 86s, 76s-75s, 64s, 53s, 43s, ATo-A5o, KTo-K9o, QJo-QTo, JTo',
          },
        },
        aggro: {
          size: 12,
          actions: {
            '3bet': '99+, AQs+, A5s-A4s, T9s, 98s, 87s, 76s, 65s, 54s, AQo+',
            call:   '88-22, AJs-A6s, A3s-A2s, K2s+, Q2s+, J6s+, T8s-T7s, 97s, 86s, 75s, 64s, 53s, 43s, AJo-A3o, K9o+, QTo+, JTo',
          },
        },
        fish: {
          size: 12,
          actions: {
            '3bet': '77+, A9s+, KTs+, QTs+, JTs, T9s, AJo+, KJo+, K9s:0.5, J9s:0.5, T8s:0.5, 98s:0.5, 87s:0.5',
            call:   '66-22, A8s-A2s, K9s:0.5, K8s-K2s, Q9s-Q2s, J9s:0.5, J8s-J5s, T8s:0.5, T7s-T6s, 98s:0.5, 97s-96s, 87s:0.5, 86s, 76s-75s, 65s-64s, 54s-53s, 43s, ATo-A3o, KTo-K9o, QJo-QTo, JTo',
          },
        },
        nit: {
          size: 12,
          actions: {
            '3bet': 'JJ+, AQs+, KQs, Q3s-Q2s, J4s-J3s, AKo, A6o-A3o, K9o-K7o, QTo-Q9o',
            call:   'TT-22, AJs-A2s, KJs-K2s, Q4s+, J5s+, T6s+, 96s+, 86s+, 75s+, 64s+, 53s+, 43s, AQo-A7o, KTo+, QJo, JTo',
          },
        },
      },
      SB: {
        gto: {
          size: 9,
          sizes: { '3blin': 9, '3bpol': 11 },
          actions: {
            '3bvalue': '99+, AJs+, KJs+, JTs, T9s, 76s, 65s, AQo+',
            '3blin':   'ATs, KTs, QTs+, J9s, T8s, 98s, 87s, AJo, KJo+',
            '3bpol':   'A5s-A4s, J4s-J2s, T5s-T3s, 54s, A5o-A3o, K9o-K7o, Q9o, J9o',
            call:      '88-22, A9s-A6s, A3s-A2s, K9s-K2s, Q9s-Q2s, J8s-J5s, T7s-T6s, 97s-95s, 86s-85s, 75s-74s, 64s-63s, 53s, 43s, ATo-A6o, KTo, QJo-QTo, JTo, T9o',
          },
        },
        lin: {
          size: 9,
          actions: {
            '3bet': '88+, ATs+, A5s, KTs+, QJs, J9s+, T8s+, 98s, 87s, 76s, 65s, AJo+, KJo+',
            call: '77-22, A9s-A6s, A4s-A2s, K9s-K2s, QTs-Q2s, J8s-J2s, T7s-T3s, 97s-95s, 86s-85s, 75s-74s, 64s-63s, 53s+, 43s, ATo-A3o, KTo-K9o, Q9o+, J9o+, T9o',
          },
        },
        aggro: {
          size: 9,
          actions: {
            '3bet': 'TT+, AJs+, KQs, T9s, 98s, 87s, 76s, 65s, AQo+, J9s:0.5, T8s:0.5, 97s:0.5',
            call: '99-22, ATs-A2s, KJs-K2s, Q4s+, JTs, J9s:0.5, J8s-J5s, T8s:0.5, T7s-T6s, 97s:0.5, 86s, 75s, 64s, 54s, 43s, AJo-A8o, KTo+, QTo+, JTo',
          },
        },
        fish: {
          size: 9,
          actions: {
            '3bet': '77+, A9s+, K9s+, Q9s+, J9s+, T9s, AJo+, KJo+, QJo',
            call: '66-22, A8s-A2s, K8s-K2s, Q8s-Q2s, J8s-J2s, T8s-T3s, 95s+, 85s+, 74s+, 63s+, 53s+, 43s, ATo-A3o, KTo-K9o, QTo-Q9o, J9o+, T9o',
          },
        },
        nit: {
          size: 9,
          actions: {
            '3bet': 'TT+, AQs+, AKo, A5o-A2o, K8o-K5o, Q8o, J8o',
            call: '99-22, AJs-A2s, K2s+, Q2s+, J2s+, T3s+, 95s+, 85s+, 74s+, 63s+, 53s+, 43s, AQo-A6o, K9o+, Q9o+, J9o+, T9o',
          },
        },
      },
    },
  },
  // Défense face à un 3bet : le héros a ouvert, un vilain placé après lui 3bet.
  // Seuls les profils définis ici sont proposés dans le menu pour le spot.
  vs3bet: {
    LJ: {
      HJ: {
        gto: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs, AJs:0.5, ATs, KQs, KJs, KTs:0.5, AKo, AQo:0.5',
            call:   'JJ-99, AQs, AJs:0.5',
          },
        },
        aggro: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs, AKo, AQo:0.5',
            call:   'JJ-99, AQs, AJs, ATs, KQs, KJs',
          },
        },
        nit: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs',
            call:   'QQ-99, AQs, AJs, KQs, AKo, 87s, 76s, 65s',
          },
        },
        fish: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs',
            call:   'AKo, QQ-88, AQs, AJs, ATs, KQs, KJs, KTs',
          },
        },
      },
      CO: {
        gto: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs, AJs:0.5, ATs, KQs, KJs, KTs:0.5, AKo, AQo:0.5',
            call:   'JJ-99, AQs, AJs:0.5',
          },
        },
        aggro: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs, AKo, AQo:0.5',
            call:   'JJ-99, AQs, AJs, ATs, KQs, KJs',
          },
        },
        nit: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs',
            call:   'QQ-99, AQs, AJs, KQs, AKo, 87s, 76s, 65s',
          },
        },
        fish: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs',
            call:   'AKo, QQ-88, AQs, AJs, ATs, KQs, KJs, KTs',
          },
        },
      },
      BU: {
        gto: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ:0.5, AKs, AJs:0.5, ATs, KQs:0.5, KJs, KTs:0.5, QJs, AKo, AQo:0.5, KQo:0.5',
            call:   'JJ:0.5, TT-99, AQs, AJs:0.5, KQs:0.5',
          },
        },
        aggro: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ:0.5, AKs, AKo, AQo:0.5, KQo:0.5',
            call:   'JJ:0.5, TT-99, AQs, AJs, ATs, KQs, KJs, QJs',
          },
        },
        nit: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs',
            call:   'QQ-99, AQs, AJs, KQs, AKo, 87s, 76s, 65s',
          },
        },
        fish: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs',
            call:   'AKo, QQ-88, AQs, AJs, ATs, KQs, KJs, KTs, QJs',
          },
        },
      },
      SB: {
        gto: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ:0.5, JJ:0.5, AKs, AJs, ATs, KTs:0.5, AKo:0.5, AQo:0.5',
            call:   'QQ:0.5, JJ:0.5, TT-99, AQs, KQs, KJs, AKo:0.5',
          },
        },
        aggro: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ:0.5, AKs, AKo, AQo:0.5',
            call:   'JJ:0.5, TT-99, AQs, AJs, ATs, KQs, KJs',
          },
        },
        nit: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs',
            call:   'QQ-99, AQs, AJs, KQs, AKo, 87s, 76s, 65s',
          },
        },
        fish: {
          size: 27,
          actions: {
            '4bet': 'AA, KK',
            call:   'AKs, AKo, QQ-88, AQs, AJs, ATs, KQs, KJs, KTs',
          },
        },
      },
      BB: {
        gto: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ:0.5, JJ:0.5, AKs, AJs, ATs, KTs:0.5, AKo:0.5, AQo:0.5',
            call:   'QQ:0.5, JJ:0.5, TT-99, AQs, KQs, KJs, AKo:0.5',
          },
        },
        aggro: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ:0.5, AKs, AKo, AQo:0.5',
            call:   'JJ:0.5, TT-99, AQs, AJs, ATs, KQs, KJs',
          },
        },
        nit: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs',
            call:   'QQ-99, AQs, AJs, KQs, AKo, 87s, 76s, 65s',
          },
        },
        fish: {
          size: 27,
          actions: {
            '4bet': 'AA, KK',
            call:   'AKs, AKo, QQ-88, AQs, AJs, ATs, KQs, KJs, KTs',
          },
        },
      },
    },
    HJ: {
      CO: {
        gto: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ, AKs, AJs:0.5, ATs, KQs, KJs, KTs:0.5, AKo, AQo',
            call:   'TT-88, AQs, AJs:0.5',
          },
        },
        aggro: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ, AKs, AKo, AQo',
            call:   'TT-88, AQs, AJs, ATs, KQs, KJs',
          },
        },
        nit: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs',
            call:   'QQ-88, AQs, AJs, KQs, AKo, 87s, 76s, 65s, 54s',
          },
        },
        fish: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs, AKo',
            call:   'QQ-77, AQs, AJs, ATs, KQs, KJs',
          },
        },
      },
      BU: {
        gto: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ, AKs, AJs:0.5, ATs:0.5, KQs:0.5, KJs, KTs, QJs, QTs, AKo, AQo, AJo:0.5, KQo',
            call:   'TT-88, AQs, AJs:0.5, ATs:0.5, KQs:0.5',
          },
        },
        fish: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs',
            call:   'QQ-77, AQs, AJs, ATs, KQs, KJs, KTs, QJs, QTs, AKo',
          },
        },
        nit: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs',
            call:   'QQ-88, AQs, AJs, KQs, AKo, 87s, 76s, 65s, 54s',
          },
        },
        aggro: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ, AKs, AJs:0.5, ATs:0.5, KQs:0.5, AKo, AQo, AJo:0.5, KQo',
            call:   'TT-88, AQs, AJs:0.5, ATs:0.5, KQs:0.5, KJs, KTs, QJs, QTs',
          },
        },
      },
      SB: {
        gto: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ, AKs, AJs:0.5, ATs, KJs, KTs:0.5, AKo:0.5, AQo:0.5',
            call:   'TT-88, AQs, AJs:0.5, KQs, AKo:0.5',
          },
        },
        fish: {
          size: 27,
          actions: {
            '4bet': 'AA, KK',
            call:   'QQ-77, AKs, AQs, AJs, ATs, KQs, KJs, AKo',
          },
        },
        nit: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs, AKo',
            call:   'QQ-88, AQs, AJs, KQs, 87s, 76s, 65s, 54s',
          },
        },
        aggro: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ, AKs, AJs:0.5, KTs:0.5, AKo, AQo:0.5',
            call:   'TT-88, AQs, AJs:0.5, ATs, KQs, KJs',
          },
        },
      },
      BB: {
        gto: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ, AKs, AJs:0.5, ATs, KJs, KTs:0.5, AKo:0.5, AQo:0.5',
            call:   'TT-88, AQs, AJs:0.5, KQs, AKo:0.5',
          },
        },
        fish: {
          size: 27,
          actions: {
            '4bet': 'AA, KK',
            call:   'QQ-77, AKs, AQs, AJs, ATs, KQs, KJs, AKo',
          },
        },
        nit: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs, AKo',
            call:   'QQ-88, AQs, AJs, KQs, 87s, 76s, 65s, 54s',
          },
        },
        aggro: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ, AKs, AJs:0.5, KTs:0.5, AKo, AQo:0.5',
            call:   'TT-88, AQs, AJs:0.5, ATs, KQs, KJs',
          },
        },
      },
    },
    CO: {
      BU: {
        gto: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ, TT, AKs, AJs:0.5, A9s:0.5, KQs:0.5, KJs:0.5, KTs:0.5, A5s:0.5, QJs:0.5, QTs:0.5, JTs:0.5, AKo, AQo, AJo, KQo',
            call:   '99, 88, AQs, AJs:0.5, ATs, KQs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, QTs:0.5, JTs:0.5',
          },
        },
        fish: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs, AKo',
            call:   'JJ-77, AQs, AJs, ATs, KQs, KJs, KTs, QJs, QTs, JTs',
          },
        },
        nit: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs, A9s, A5s, AKo, AQo',
            call:   'JJ-88, AQs, AJs, ATs, KQs, 87s, 76s, 65s, 54s',
          },
        },
        aggro: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ, TT, AKs, A9s:0.5, A5s:0.5, AKo, AQo, AJo, KQo',
            call:   '99, 88, AQs, AJs, ATs, KQs, KJs, KTs, QJs',
          },
        },
      },
      SB: {
        gto: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs, ATs, KJs:0.5, KTs, AKo, AQo, AJo:0.5, KQo:0.5',
            call:   'JJ-88, AQs, AJs, KQs, KJs:0.5',
          },
        },
        fish: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs',
            call:   'QQ-77, AQs, AJs, ATs, KQs, KJs, KTs, AKo',
          },
        },
        nit: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs',
            call:   'JJ-88, AQs, AJs, KQs, AKo, 87s, 76s, 65s, 54s',
          },
        },
        aggro: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs, KTs, AKo, AJo:0.5, KQo:0.5',
            call:   'JJ-88, AQs, AJs, ATs, KQs, KJs, AQo',
          },
        },
      },
      BB: {
        gto: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs, ATs, KJs:0.5, KTs, AKo, AQo, AJo:0.5, KQo:0.5',
            call:   'JJ-88, AQs, AJs, KQs, KJs:0.5',
          },
        },
        fish: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs',
            call:   'QQ-77, AQs, AJs, ATs, KQs, KJs, KTs, AKo',
          },
        },
        nit: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs',
            call:   'JJ-88, AQs, AJs, KQs, AKo, 87s, 76s, 65s, 54s',
          },
        },
        aggro: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs, KTs, AKo, AJo:0.5, KQo:0.5',
            call:   'JJ-88, AQs, AJs, ATs, KQs, KJs, AQo',
          },
        },
      },
    },
    BU: {
      SB: {
        gto: {
          size: 27,
          actions: {
            '4bet':     'AA, KK, QQ, JJ:0.5, AKs, A9s, A8s:0.5, QTs:0.5, AKo, AQo:0.5, AJo:0.5',
            call:       'JJ:0.4987, TT, 99, AQs, AJs, 88, ATs, KQs, KJs, KTs, AQo:0.5',
            callsmall:  '77, QJs, 66, QTs:0.5, JTs, T9s',
          },
        },
        nit: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ:0.4987, AKs, A9s, A8s:0.4960, AKo, AQo:0.5',
            call:   'JJ:0.4987, TT, 99, AQs, AJs, 88, ATs, KQs, 77, KJs:0.5, AQo:0.5, 76s, 65s, 54s',
          },
        },
        fish: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs, AKo',
            call:   'QQ, JJ, TT, 99, AQs, AJs, 88, ATs, KQs, 77, 66, KJs, KTs, QJs, QTs, JTs, AQo, T9s',
          },
        },
        aggro: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs, A9s, A8s:0.5, QTs:0.5, AQo:0.5, AJo:0.5',
            jam:    'JJ, TT, AKo',
            call:   '99, AQs, AJs, 88, ATs, KQs, KJs, KTs, QJs, QTs:0.5, JTs, AQo:0.5',
          },
        },
      },
      BB: {
        gto: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ, AKs, A8s, A5s, K9s, QTs:0.5, JTs:0.5, AKo, AQo:0.5, AJo:0.5, KQo',
            call:   'TT-66, AQs, AJs, ATs, A9s, KQs, KJs, KTs, QJs, QTs:0.5, JTs:0.5, AQo:0.5',
          },
        },
        fish: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs, AKo',
            call:   'TT-55, AQs, AJs, ATs, A9s, KQs, KJs, KTs, QJs, QTs, JTs, AQo',
          },
        },
        nit: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs, A8s, A5s, K9s, AKo, AQo:0.5',
            call:   'JJ-77, AQs, AJs, ATs, A9s, KQs, KJs, KTs, QJs, AQo:0.5, 87s, 76s, 65s, 54s',
          },
        },
        aggro: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs, A8s, K9s, AQo:0.5, AJo:0.5, KQo',
            jam:    'JJ, TT, AKo',
            call:   '99-66, AQs, AJs, ATs, A9s, A5s, KQs, KJs, KTs, QJs, QTs, JTs, AQo:0.5',
          },
        },
      },
    },
    SB: {
      BB: {
        gto: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, JJ, TT, AKs, AQs, A6s, A4s, Q9s:0.5, AKo, K5s, AQo, AJo, ATo:0.5, KQo, KJo:0.5',
            call:   '99, AJs, 88, ATs, A9s, A8s, KQs, 77, A7s, KJs, KTs, A5s, K9s, QJs, 66, QTs, Q9s:0.5, JTs, 55, J9s:0.5, T9s',
          },
        },
        aggro: {
          size: 27,
          actions: {
            jam:    'AKo, TT, 99',
            '4bet': 'AA, KK, QQ, JJ, AKs, AQs, A6s, A4s, Q9s:0.5, K5s, AQo, AJo, ATo:0.5, KQo, KJo:0.5',
            call:   'AJs, 88, ATs, A9s, A8s, KQs, 77, A7s, KJs, KTs, A5s, K9s, QJs, 66, QTs, Q9s:0.5, JTs, 55, J9s:0.5, T9s',
          },
        },
        nit: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, QQ, AKs, AQs, A6s, A5s, A4s, AKo, K5s, AQo, AJo, KQo',
            call:   'JJ, TT, 99, AJs, 88, ATs, KQs, 77, KJs, 76s, 65s',
          },
        },
        fish: {
          size: 27,
          actions: {
            '4bet': 'AA, KK, AKs, AKo',
            call:   'QQ, JJ, TT, 99, AQs, AJs, 88, ATs, KQs, 77, 66, 55, KJs, AQo',
          },
        },
      },
    },
  },  // Squeeze : un vilain ouvre, un autre call, puis le héros relance.
  // Seuls les profils définis ici sont proposés dans le menu pour le spot.
  squeeze: {
    BU: {
      LJ: {
        HJ: SQUEEZE_BU_VS_EARLY,
        CO: SQUEEZE_BU_VS_EARLY,
      },
      HJ: {
        CO: {
          gto: {
            size: 13,
            actions: {
              squeeze:   'JJ+, AKs, AQs, A9s, A5s, A4s, K9s, AKo, AQo, KQo, ' +
                         'AJs:0.5, ATs:0.5, KQs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, AJo:0.5, 76s:0.5, 65s:0.5',
              callwhale: 'TT-66, AJs, ATs, KQs, KJs, KTs, QJs, QTs, JTs',
            },
          },
        },
      },
    },
    SB: {
      CO: {
        BU: {
          gto: {
            size: 15,
            actions: {
              squeeze:   '99+, ATs+, A5s, A4s, KTs+, QTs+, JTs, T9s, AQo+, KQo, AJo:0.5',
              callwhale: 'K8s-K2s, Q8s, J8s, ATo, KTo, QTo, JTo, KJo, QJo',
            },
          },
        },
      },
    },
    BB: {
      CO: {
        BU: {
          gto: {
            size: 15,
            actions: {
              squeeze:   'TT+, AKs, AQs, KQs, AKo, AQo, ' +
                         'AJs:0.5, ATs:0.5, A4s:0.5, KJs:0.5, KTs:0.5, QJs:0.5, QTs:0.5, JTs:0.5, T9s:0.5, KQo:0.5, AJo:0.5',
              call:      '99-22, A9s-A2s, AJs, ATs, K9s, KJs, KTs, Q9s, QJs, QTs, J9s, JTs, T9s, T8s, 98s, 97s, ' +
                         '87s, 86s, 76s, 75s, 65s, 64s, 54s, 53s, 43s, KQo, AJo',
              callwhale: 'K8s-K2s, Q8s, J8s, ATo, KTo, QTo, JTo, KJo, QJo',
            },
          },
        },
      },
    },
  },
};
// Iso sur limp : un seul vilain limp avant le héros. Pour LJ/HJ/CO/BU/SB en tant que héros, même
// range quel que soit le limpeur (toujours en position postflop sur lui) : objet partagé ci-dessous,
// référencé pour chaque position de limpeur possible (voir CLAUDE.md).
const ISO_HJ = {
  limp528: {
    size: 3.5,
    actions: {
      iso: '55+, A2s+, K8s+, Q9s+, JTs, ATo+, KTo+, QJo',
    },
  },
  limp050: {
    size: 3.5,
    actions: {
      iso:   '66+, A4s+, K9s+, QTs+, JTs, AJo+, KQo',
      large: '55, A3s, ATo',
    },
  },
};
const ISO_CO = {
  limp528: {
    size: 3.5,
    actions: {
      iso: '55+, A2s+, K8s+, Q9s+, J9s+, T9s, A8o+, KTo+, QTo+',
    },
  },
  limp050: {
    size: 3.5,
    actions: {
      iso:   '66+, A3s+, K9s+, Q9s+, JTs, T9s, ATo+, KJo+',
      large: '55, A2s, K8s, QJo',
    },
  },
};
const ISO_BU = {
  limp528: {
    size: 4,
    actions: {
      iso: '55+, A2s+, K2s+, Q5s+, J8s+, T8s+, 98s, 87s, 76s, 65s, 54s, A4o+, KTo+, QTo+, JTo',
    },
  },
  limp050: {
    size: 4,
    actions: {
      iso:   '44+, A2s+, K8s+, Q9s+, J9s+, T9s, A8o+, KJo+, QJo',
      large: 'K7s, KTo, QTo, 98s',
    },
  },
};
const ISO_SB = {
  limp528: {
    size: 5,
    actions: {
      iso: '66+, A4s+, K5s+, QTs+, JTs, T9s, ATo+, KJo+',
    },
  },
  limp050: {
    size: 5,
    actions: {
      iso:   '66+, A4s, A5s, A7s+, K9s+, Q9s+, J9s+, T9s, AJo+, KQo',
      large: '55, A6s, ATo',
    },
  },
};
// BB face à un limpeur "en position" (LJ/HJ/CO/BU : ils auront la position postflop sur BB).
const ISO_BB_VS_IP = {
  limp528: {
    size: 5,
    actions: {
      iso:   '22+, A7s+, KTs+, QTs+, JTs, T9s, AKo',
      large: 'A2s-A6s, K9s, Q9s, J9s',
    },
  },
  limp050: {
    size: 5,
    actions: {
      iso:   '88+, A8s+, K9s+, QTs+, JTs, AQo+',
      large: '77-66, T9s',
    },
  },
};

window.RANGES.iso = {
  HJ: { LJ: ISO_HJ },
  CO: { LJ: ISO_CO, HJ: ISO_CO },
  BU: { LJ: ISO_BU, HJ: ISO_BU, CO: ISO_BU },
  SB: { LJ: ISO_SB, HJ: ISO_SB, CO: ISO_SB, BU: ISO_SB },
  // BB vs SB (BB aura la position postflop) : range bien plus large, différente par profil de limpeur.
  BB: {
    LJ: ISO_BB_VS_IP,
    HJ: ISO_BB_VS_IP,
    CO: ISO_BB_VS_IP,
    BU: ISO_BB_VS_IP,
    SB: {
      limp0100: {
        size: 7,
        actions: {
          iso:   'KK+, AKs, AKo, K7o, K6o, A3o, A2o',
          large: 'A8s-AQs, K9s+, QQ, Q9s+, AQo, KQo, JJ, J9s+, AJo, TT, T9s, ATo, 99-77',
        },
      },
      limp1660: {
        size: 7,
        actions: {
          iso:   'AA, KK, QQ, JJ, TT, 66, 44, 33, AJs+, QJs, T2s, 93s, 92s, 83s, 82s, 73s, 72s, 65s, 62s, ' +
                 'ATo+, KTo+, K2o-K5o, QTo+, JTo, J6o, T6o',
          large: '99-77, 55, 22, A2s-ATs, K6s-KQs, Q7s-QTs, J7s-JTs, T7s-T9s, 97s+, 76s, 54s, ' +
                 'A7o-A9o, K9o, K6o, Q9o, Q6o',
        },
      },
      limp037: {
        size: 7,
        actions: {
          iso:   '33+, A8s+, KQs, 54s, ATo+, KQo',
          large: '22, A7s-A2s, K4s-KJs, Q4s-QJs, J5s-JTs, T6s-T9s, 96s-98s, 86s+, 75s+, 65s, ' +
                 'A5o-A9o, K9o-KJo, Q9o-QJo, J9o+, T9o',
        },
      },
    },
  },
};
