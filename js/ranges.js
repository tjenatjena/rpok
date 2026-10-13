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
  '4bet': { label: '4bet',  color: '#e0523f' },
  squeeze: { label: 'Squeeze', color: '#d93b3b' },
  iso:   { label: 'Iso',   color: '#e3b31b', text: '#1d232b' },
  large: { label: 'Large', color: '#f2d024', text: '#1d232b' },
  call:  { label: 'Call',  color: '#3fa96b' },
  callwhale: { label: 'Call si baleine en blindes', color: '#4f6df5' },
  limp:  { label: 'Limp',  color: '#3fa96b' },
  fold:  { label: 'Fold',  color: '#2f3a48' },
};

window.MARKS = {
  call4bet: { label: 'Call 4bet', color: '#4f6df5' },
};

// BTN face à un open LJ et un call (HJ ou CO) : chart « BTN vs Early ».
const SQUEEZE_BTN_VS_EARLY = {
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
    BTN: {
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
            '3bet': 'TT+, AQo+, KTs+, A9s+, A8s-A6s:0.5, A5s, A4s, KQo',
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
            '3bet': 'JJ+, AJs+, AQo+, KJs+, A5s:0.5',
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': '99+, A9s+, A8s:0.5, AQo+, KTs+, QJs, A5s, A4s, KQo',
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': '99+, AQo+, KTs+, A8s+, A5s, A4s, A7s:0.5, A6s:0.5, KQo, QJs',
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AJs+, AQo+, KJs+, A5s:0.5',
          },
        },
      },
      HJ: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'TT+, ATs+, AQo+, KJs+, QJs, KQo',
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
            '3bet': '99+, A9s+, A8s-A6s:0.5, A5s, A4s, AJo+, KTs+, KQo, QJs',
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'TT+, ATs+, AQo+, KJs+, QJs, KQo',
          },
        },
      },
    },
    BTN: {
      LJ: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AQs+, AQo+, KQo, QTs, JJ:0.5, TT:0.5, A5s:0.5, A4s:0.5',
            call:   'JJ-88, AJs, ATs, KQs, KJs, KTs, QJs, JTs',
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AQs+, AQo+, KQo, QTs, JJ:0.5, TT:0.5, A9s, A5s, A4s, A8s:0.5, AJs:0.5, ATs:0.5, KQs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, JTs:0.5, 99-88:0.5',
            call:   'JJ-88, AJs, ATs, KQs, KJs, KTs, QJs, JTs',
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AQs+, AQo+, KQo, QTs, JJ:0.5, TT:0.5, A9s, A8s, A5s, A4s, A7s:0.5, A6s:0.5, A3s:0.5, AJs:0.5, ATs:0.5, KQs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, JTs:0.5, 99-88:0.5',
            call:   'JJ-88, AJs, ATs, KQs, KJs, KTs, QJs, JTs',
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AQs+, AQo+, KQo, QTs, JJ:0.5, TT:0.5, A5s:0.5, A4s:0.5',
            call:   'JJ-88, AJs, ATs, KQs, KJs, KTs, QJs, JTs',
          },
        },
      },
      HJ: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AQs+, AQo+, KQo, A5s:0.5, A4s:0.5',
            call:   'JJ-88, AJs, ATs, KQs, KJs, KTs, QJs, JTs',
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AQs+, AQo+, KQo, AJo, A9s, A8s, QTs, A5s, A4s, K9s:0.5, JJ-88:0.5, AJs:0.5, ATs:0.5, KQs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, JTs:0.5',
            call:   'JJ-88, AJs, ATs, KQs, KJs, KTs, QJs, JTs',
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AQs+, AQo+, KQo, AJo, A9s, A8s, QTs, A5s, A4s, K9s:0.5, JJ-88:0.5, AJs:0.5, ATs:0.5, KQs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, JTs:0.5, A7s:0.5, A6s:0.5, A3s:0.5',
            call:   'JJ-88, AJs, ATs, KQs, KJs, KTs, QJs, JTs',
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AJs+, AQo+, KQs, KQo, A9s, A5s:0.5, A4s:0.5',
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
            '3bet': 'JJ+, AQs+, AKo, KQs, TT:0.5, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, AQo:0.5',
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
            '3bet': 'JJ+, AQs+, AKo, KQs, TT:0.5, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, AQo:0.5',
            call:   'TT, 99, AJs, ATs, KJs, KTs, QJs',
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo, KQs, TT:0.5, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, AQo, A5s, KQo:0.5',
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
            '3bet': '99+, AQs+, KQs, AQo+, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, KQo:0.5, AJo:0.5',
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
      BTN: {
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
            '3bet': 'TT+, AQs+, AJs, A8s, A7s, A5s, A4s, KQs, AJo+, KJo+, ATs:0.5, A9s:0.5, KJs:0.5, KTs:0.5, QJs:0.5, QTs:0.5, JTs:0.5, 99-88:0.5, Q9s, J9s, T9s, 77:0.5, ATo:0.5',
            call:   'ATs, A9s, KJs, KTs, QJs, QTs, JTs, 99-66',
          },
        },
        nit: {
          size: 10,
          actions: {
            '5bet': 'JJ+, AKs, AKo',
            '3bet': 'TT+, AQs+, AJs, A8s, A7s, A5s, A4s, KQs, AJo+, KJo+, ATs:0.5, A9s:0.5, KJs:0.5, KTs:0.5, QJs:0.5, QTs:0.5, JTs:0.5, 99-88:0.5, Q9s, J9s, T9s, 77:0.5, ATo:0.5, A6s, A3s, A2s, K9s, K8s, 65s, ATo, QJo:0.5, KTo:0.5',
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
      BTN: {
        // supernit : 3bet = cases à bordure jaune du chart, le reste de la range reg est payé.
        gto: {
          size: 12,
          actions: {
            '3bet': '99+, AJs+, A5s, KJs+, K2s, Q2s, JTs, J5s, T9s, T6s, 65s, 54s, AJo+, A4o-A3o, KQo',
            call:   '88-22, ATs-A6s, A4s-A2s, KTs-K3s, Q3s+, J9s-J6s, T8s-T7s, 96s+, 85s+, 75s+, 64s, 53s, 43s, ATo-A5o, KJo-K9o, QTo+, JTo',
          },
        },
        aggro: {
          size: 12,
          actions: {
            '3bet': '99+, AJs+, A5s, KJs+, K2s, Q2s, JTs, J5s, T9s, T6s, 65s, 54s, AJo+, A4o-A3o, KQo',
            call:   '88-22, ATs-A6s, A4s-A2s, KTs-K3s, Q4s+, J9s-J8s, T8s, 97s+, 86s+, 75s+, 64s, ATo-A8o, KJo-KTo, QTo+, JTo',
          },
        },
        fish: {
          size: 12,
          actions: {
            '3bet': '77+, A9s+, A5s, KTs+, K2s, QTs+, Q2s, JTs, J5s, T9s, T6s, 65s, 54s, AJo+, A4o-A3o, KQo',
            call:   '66-22, A8s-A6s, A4s-A2s, K9s-K3s, Q9s-Q3s, J9s-J6s, T8s-T7s, 96s+, 85s+, 75s+, 64s, 53s, 43s, ATo-A5o, KJo-K9o, Q9o+, J9o+, T9o',
          },
        },
        supernit: {
          size: 12,
          actions: {
            '3bet': 'JJ+, AQs+, Q3s-Q2s, J4s-J3s, AKo, A6o-A3o, K9o-K7o, QTo-Q9o',
            call:   'TT-22, AJs-A2s, K2s+, Q4s+, J5s+, T6s+, 96s+, 85s+, 75s+, 64s+, 53s+, 43s, AQo-A7o, KTo+, QJo, JTo',
          },
        },
      },
      SB: {
        gto: {
          size: 9,
          actions: {
            '3bet': '99+, AJs+, A5s-A4s, KJs+, JTs, J4s-J2s, T9s, T5s-T3s, 76s, 65s, 54s, AQo+, A5o-A3o, K9o-K7o, Q9o, J9o',
            call: '88-22, ATs-A6s, A3s-A2s, KTs-K2s, Q2s+, J9s-J5s, T8s-T6s, 95s+, 85s+, 75s-74s, 64s-63s, 53s, 43s, AJo-A6o, KTo+, QTo+, JTo, T9o',
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
            '3bet': 'TT+, AJs+, KQs, J9s, T8s+, 97s+, 87s, 76s, 65s, AQo+',
            call: '99-22, ATs-A2s, KJs-K2s, Q4s+, JTs, J8s-J5s, T7s-T6s, 86s, 75s, 64s, 54s, 43s, AJo-A8o, KTo+, QTo+, JTo',
          },
        },
        fish: {
          size: 9,
          actions: {
            '3bet': '77+, A9s+, K9s+, Q9s+, J9s+, T9s, AJo+, KJo+, QJo',
            call: '66-22, A8s-A2s, K8s-K2s, Q8s-Q2s, J8s-J2s, T8s-T3s, 95s+, 84s+, 74s+, 63s+, 52s+, 42s+, 32s, ATo-A3o, KTo-K7o, QTo-Q8o, J8o+, T8o+, 98o, 87o, 76o',
          },
        },
        nit: {
          size: 9,
          actions: {
            '3bet': 'TT+, AQs+, AKo, A4o-A2o, K8o-K5o, Q8o, J8o',
            call: '99-22, AJs-A2s, K2s+, Q2s+, J2s+, T3s+, 95s+, 85s+, 74s+, 63s+, 53s+, 43s, AQo-A5o, K9o+, Q9o+, J9o+, T9o',
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
          size: 24,
          actions: {
            '4bet': 'AA, KK, AKs, AKo, QQ, AJs:0.5, ATs, KQs, KJs, KTs:0.5, AQo:0.5',
            call:   'JJ-99, AQs, AJs',
          },
        },
        aggro: {
          size: 24,
          actions: {
            '4bet': 'AA, KK, AKs, AKo, QQ, AJs:0.5, ATs:0.5, KQs:0.5, KJs:0.5, KTs:0.5, AQo:0.5',
            call:   'JJ-99, AQs, AJs, ATs, KQs, KJs',
          },
        },
        nit: {
          size: 24,
          actions: {
            '4bet': 'AA, KK, AKs, AKo:0.5, QQ:0.5, AJs:0.5, ATs, KQs, KJs, KTs:0.5, AQo:0.5',
            call:   'AKo, QQ-99, AQs, AJs, 87s, 76s, 65s',
          },
        },
        fish: {
          size: 24,
          actions: {
            '4bet': 'AA, KK, AKs',
            call:   'AKo, QQ-88, AQs, AJs, ATs, KQs, KJs, KTs, AQo',
          },
        },
      },
      CO: {
        gto: {
          size: 24,
          actions: {
            '4bet': 'AA, KK, AKs, AKo, QQ, AJs:0.5, ATs, KQs, KJs, KTs:0.5, AQo:0.5',
            call:   'JJ-99, AQs, AJs',
          },
        },
        aggro: {
          size: 24,
          actions: {
            '4bet': 'AA, KK, AKs, AKo, QQ, AJs:0.5, ATs:0.5, KQs:0.5, KJs:0.5, KTs:0.5, AQo:0.5',
            call:   'JJ-99, AQs, AJs, ATs, KQs, KJs',
          },
        },
        nit: {
          size: 24,
          actions: {
            '4bet': 'AA, KK, AKs, AKo:0.5, QQ:0.5, AJs:0.5, ATs, KQs, KJs, KTs:0.5, AQo:0.5',
            call:   'AKo, QQ-99, AQs, AJs, 87s, 76s, 65s',
          },
        },
        fish: {
          size: 24,
          actions: {
            '4bet': 'AA, KK, AKs',
            call:   'AKo, QQ-88, AQs, AJs, ATs, KQs, KJs, KTs, AQo',
          },
        },
      },
      BTN: {
        gto: {
          size: 24,
          actions: {
            '4bet': 'AA, KK, AKs, AKo, QQ, JJ:0.5, AJs:0.5, ATs, KQs:0.5, KJs, KTs:0.5, QJs, AQo:0.5, KQo:0.5',
            call:   'JJ-99, AQs, AJs, KQs',
          },
        },
        aggro: {
          size: 24,
          actions: {
            '4bet': 'AA, KK, AKs, AKo, QQ, JJ:0.5, AJs:0.5, ATs:0.5, KQs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, AQo:0.5, KQo:0.5',
            call:   'JJ-99, AQs, AJs, ATs, KQs, KJs, QJs',
          },
        },
        nit: {
          size: 24,
          actions: {
            '4bet': 'AA, KK, AKs, AKo:0.5, QQ:0.5, JJ:0.5, AJs:0.5, ATs, KQs:0.5, KJs, KTs:0.5, QJs, AQo:0.5, KQo:0.5',
            call:   'AKo, QQ-99, AQs, AJs, KQs, 87s, 76s, 65s',
          },
        },
        fish: {
          size: 24,
          actions: {
            '4bet': 'AA, KK, AKs, AQo:0.5, KQo:0.5',
            call:   'AKo, QQ-88, AQs, AJs, ATs, KQs, KJs, KTs, QJs',
          },
        },
      },
      SB: {
        gto: {
          size: 22,
          actions: {
            '4bet': 'AA, KK, AKs, AKo:0.5, QQ:0.5, JJ:0.5, AJs, ATs, KTs:0.5, AQo:0.5',
            call:   'AKo, QQ-99, AQs, KQs',
          },
        },
        aggro: {
          size: 22,
          actions: {
            '4bet': 'AA, KK, AKs, AKo:0.5, QQ:0.5, JJ:0.5, AJs:0.5, ATs:0.5, KTs:0.5, AQo:0.5',
            call:   'AKo, QQ-99, AQs, AJs, ATs, KQs, KJs',
          },
        },
        nit: {
          size: 22,
          actions: {
            '4bet': 'AA, KK, AKs, AKo:0.5, QQ:0.5, JJ:0.5, AJs, ATs, KTs:0.5, AQo:0.5',
            call:   'AKo, QQ-99, AQs, KQs, 87s, 76s, 65s',
          },
        },
        fish: {
          size: 22,
          actions: {
            '4bet': 'AA, KK, AQo:0.5',
            call:   'AKs, AKo, QQ-88, AQs, AJs, ATs, KQs, KJs, KTs',
          },
        },
      },
      BB: {
        gto: {
          size: 22,
          actions: {
            '4bet': 'AA, KK, AKs, AKo:0.5, QQ:0.5, JJ:0.5, AJs, ATs, KTs:0.5, AQo:0.5',
            call:   'AKo, QQ-99, AQs, KQs',
          },
        },
        aggro: {
          size: 22,
          actions: {
            '4bet': 'AA, KK, AKs, AKo:0.5, QQ:0.5, JJ:0.5, AJs:0.5, ATs:0.5, KTs:0.5, AQo:0.5',
            call:   'AKo, QQ-99, AQs, AJs, ATs, KQs, KJs',
          },
        },
        nit: {
          size: 22,
          actions: {
            '4bet': 'AA, KK, AKs, AKo:0.5, QQ:0.5, JJ:0.5, AJs, ATs, KTs:0.5, AQo:0.5',
            call:   'AKo, QQ-99, AQs, KQs, 87s, 76s, 65s',
          },
        },
        fish: {
          size: 22,
          actions: {
            '4bet': 'AA, KK, AQo:0.5',
            call:   'AKs, AKo, QQ-88, AQs, AJs, ATs, KQs, KJs, KTs',
          },
        },
      },
    },
    HJ: {
      CO: {
        gto: {
          size: 24,
          actions: {
            '4bet': 'QQ+, AKs, AKo:0.7, JJ:0.3, A5s, A4s:0.5',
            call:   'JJ-77, AQs-A9s, AQo:0.7, KQs-KTs, QJs, QTs, JTs, T9s, 98s, AKo',
          },
        },
      },
      BTN: {
        gto: {
          size: 24,
          actions: {
            '4bet': 'QQ+, AKs, AKo:0.7, JJ:0.3, A5s, A4s:0.5',
            call:   'JJ-77, AQs-A9s, AQo:0.7, KQs-KTs, QJs, QTs, JTs, T9s, 98s, AKo',
          },
        },
      },
      SB: {
        gto: {
          size: 22,
          actions: {
            '4bet': 'QQ+, AKs, AKo:0.6, JJ:0.3, A5s, A4s:0.5',
            call:   'JJ-55, AQs-A8s, AQo, AJo:0.5, KQs-KTs, KQo:0.5, QJs, QTs, JTs, T9s, 98s, 87s, AKo',
          },
        },
      },
      BB: {
        gto: {
          size: 22,
          actions: {
            '4bet': 'QQ+, AKs, AKo:0.6, JJ:0.3, A5s, A4s:0.5',
            call:   'JJ-55, AQs-A8s, AQo, AJo:0.5, KQs-KTs, KQo:0.5, QJs, QTs, JTs, T9s, 98s, 87s, AKo',
          },
        },
      },
    },
    CO: {
      BTN: {
        gto: {
          size: 24,
          actions: {
            '4bet': 'JJ+, AKs, AQs:0.3, AKo, TT:0.3, A5s, A4s, KQs:0.3',
            call:   'TT-66, AQs-A8s, AQo, AJo:0.5, KQs-K9s, KQo:0.5, QJs, QTs, JTs, J9s, T9s, 98s, 87s, 76s',
          },
        },
      },
      SB: {
        gto: {
          size: 22,
          actions: {
            '4bet': 'JJ+, AKs, AQs:0.3, AKo, TT:0.3, A5s, A4s, KQs:0.3',
            call:   'TT-44, AQs-A7s, AQo, AJo, KQs-K9s, KQo, QJs, Q9s, JTs, J9s, T9s, T8s, 98s, 87s, 76s, 65s',
          },
        },
      },
      BB: {
        gto: {
          size: 22,
          actions: {
            '4bet': 'JJ+, AKs, AQs:0.3, AKo, TT:0.3, A5s, A4s, KQs:0.3',
            call:   'TT-44, AQs-A7s, AQo, AJo, KQs-K9s, KQo, QJs, Q9s, JTs, J9s, T9s, T8s, 98s, 87s, 76s, 65s',
          },
        },
      },
    },
    BTN: {
      SB: {
        gto: {
          size: 22,
          actions: {
            '4bet': 'TT+, AKs, AQs:0.5, AKo, AQo:0.3, A5s, A4s, A3s:0.5, K9s:0.3, 76s:0.3',
            call:   '99-22, AQs-A6s, AQo, AJo, ATo:0.5, KQs-K8s, KQo, KJo:0.5, QJs-Q9s, JTs, J9s, T9s, T8s, 98s, 97s, 87s, 86s, 76s, 65s, 54s',
          },
        },
      },
      BB: {
        gto: {
          size: 22,
          actions: {
            '4bet': 'TT+, AKs, AQs:0.5, AKo, AQo:0.3, A5s, A4s, A3s:0.5, K9s:0.3, 76s:0.3',
            call:   '99-22, AQs-A6s, AQo, AJo, ATo:0.5, KQs-K8s, KQo, KJo:0.5, QJs-Q9s, JTs, J9s, T9s, T8s, 98s, 97s, 87s, 86s, 76s, 65s, 54s',
          },
        },
      },
    },
    SB: {
      BB: {
        gto: {
          size: 24,
          actions: {
            '4bet': 'TT+, AKs, AQs:0.5, AKo, AQo:0.3, A5s, A4s, A3s:0.5, K9s:0.3, 65s:0.3',
            call:   '99-22, AQs-A6s, AQo, AJo, ATo:0.5, KQs-K8s, KQo, KJo:0.5, QJs-Q9s, JTs, J9s, T9s, T8s, 98s, 87s, 76s, 65s, 54s',
          },
        },
      },
    },
  },  // Squeeze : un vilain ouvre, un autre call, puis le héros relance.
  // Seuls les profils définis ici sont proposés dans le menu pour le spot.
  squeeze: {
    BTN: {
      LJ: {
        HJ: SQUEEZE_BTN_VS_EARLY,
        CO: SQUEEZE_BTN_VS_EARLY,
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
        BTN: {
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
        BTN: {
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
// Iso sur limp : un seul vilain limp avant le héros. Pour LJ/HJ/CO/BTN/SB en tant que héros, même
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
const ISO_BTN = {
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
// BB face à un limpeur "en position" (LJ/HJ/CO/BTN : ils auront la position postflop sur BB).
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
  BTN: { LJ: ISO_BTN, HJ: ISO_BTN, CO: ISO_BTN },
  SB: { LJ: ISO_SB, HJ: ISO_SB, CO: ISO_SB, BTN: ISO_SB },
  // BB vs SB (BB aura la position postflop) : range bien plus large, différente par profil de limpeur.
  BB: {
    LJ: ISO_BB_VS_IP,
    HJ: ISO_BB_VS_IP,
    CO: ISO_BB_VS_IP,
    BTN: ISO_BB_VS_IP,
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
