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
 *   aggro : vs. aggro       gto : stratégie de base (GTO)      fish : vs. passif
 *   nit   : vs. nit         supernit : vs. super nit
 * Un profil absent affiche la range GTO.
 *
 * Sections :
 *   open     : RANGES.open[héros][profil]                 (premier à parler)
 *   threebet : RANGES.threebet[héros][ouvreur][profil]    (un vilain a ouvert avant le héros)
 * "size" = taille de la relance du héros en BB (open ou 3bet).
 * Les actions sont appliquées dans l'ordre : une main à "AQs:0.5" en 3bet puis "AQs" en call
 * est 3bet 50 % / call 50 %.
 */

window.ACTIONS = {
  raise: { label: 'Raise', color: '#e0523f' },
  '3bet': { label: '3bet',  color: '#c2415f' },
  call:  { label: 'Call',  color: '#3fa96b' },
  limp:  { label: 'Limp',  color: '#3fa96b' },
  fold:  { label: 'Fold',  color: '#2f3a48' },
};

window.RANGES = {
  open: {
    UTG: {
      gto: {
        size: 3,
        actions: {
          raise: '77+, ' +
                 'A2s+, K8s+, QTs+, JTs, ' +
                 'ATo+, KJo+',
        },
      },
      fish: {
        size: 3,
        actions: {
          raise: '55+, ' +
                 'A2s+, K6s+, Q9s+, JTs, ' +
                 'ATo+, KTo+, QJo',
        },
      },
      nit: {
        size: 3,
        actions: {
          raise: '44+, ' +
                 'A2s+, K5s+, Q9s+, JTs, T9s, 98s, 87s, 76s, 65s,' +
                 'ATo+, KTo+, QJo',
        },
      },
      supernit: {
        size: 3,
        actions: {
          raise: '44+, ' +
                 'A2s+, K5s+, Q9s+, JTs, T9s, 98s, 87s, 76s, 65s,' +
                 'ATo+, KTo+, QJo',
        },
      },
      aggro: {
        size: 3,
        actions: {
          raise: '88+, ' +
                 'A3s+, KTs+, QTs+, JTs, ' +
                 'AQo+, KQo+',
        },
      },
    },
    HJ: {
      gto: {
        size: 3,
        actions: {
          raise: '66+, ' +
                 'A2s+, K4s+, Q9s+, J9s+, T9s, ' +
                 'ATo+, KTo+, QJo',
        },
      },
      fish: {
        size: 3,
        actions: {
          raise: '44+, ' +
                 'A2s+, K4s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, 54s,' +
                 'A9o+, KTo+, QTo+',
        },
      },
      nit: {
        size: 3,
        actions: {
          raise: '33+, ' +
                 'A2s+, K3s+, Q8s+, J9s+, T9s, 98s, 87s, 76s, 65s, 54s, ' +
                 'A8o+, KTo+, QTo+',
        },
      },
      supernit: {
        size: 3,
        actions: {
          raise: '33+, ' +
                 'A2s+, K3s+, Q8s+, J9s+, T9s, 98s, 87s, 76s, 65s, 54s, ' +
                 'A8o+, KTo+, QTo+',
        },
      },
      aggro: {
        size: 3,
        actions: {
          raise: '77+, ' +
                 'A2s+, KTs+, QTs+, JTs+, ' +
                 'AJo+, KQo+, ',
        },
      },
    },
    CO: {
      gto: {
        size: 3,
        actions: {
          raise: '55+, ' +
                 'A2s+, K3s+, Q8s+, J8s+, T8s+, 98s,' +
                 'A8o+, KTo+, QTo+, JTo',
        },
      },
      fish: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q8s+, J8s+, T8s+, 98s, 87s, 76s, 65s, 54s,' +
                 'A7o+, K9o+, QTo+, JTo',
        },
      },
      nit: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q6s+, J7s+, T7s+, 97s+, 87s, 76s, 65s, 54s, ' +
                 'A5o+, K9o+, QTo+, JTo',
        },
      },
      supernit: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q6s+, J7s+, T7s+, 97s+, 87s, 76s, 65s, 54s, ' +
                 'A5o+, K9o+, QTo+, JTo',
        },
      },
      aggro: {
        size: 3,
        actions: {
          raise: '66+, ' +
                 'A2s+, KTs+, QTs+, JTs+, ' +
                 'ATo+, KTo+, QJo',
        },
      },
    },
    BTN: {
      gto: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J5s+, T6s+, 96s+, 86s+, 75s+, 65s, 54s,' +
                 'A3o+, K8o+, Q9o+, J9o+, T9o',
        },
      },
      fish: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J2s+, T3s+, 95s+, 85s+, 74s+, 64s+, 53s+, 43s, ' +
                 'A2o+, K4o+, Q7o+, J7o+, T7o+, 97o+, 87o, 76o, ',
        },
      },
      nit: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J2s+, T3s+, 95s+, 85s+, 74s+, 64s+, 53s+, 43s, ' +
                 'A2o+, K2o+, Q6o+, J7o+, T7o+, 97o+, 87o, 76o, 65o, ',
        },
      },
      supernit: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, ' +
                 'A2o+, K2o+, Q2o+, J6o+, T6o+, 96o+, 86o+, 76o, 65o, ',
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
  // Ranges de base (GTO) : les autres profils reprennent la range GTO tant qu'ils ne sont pas définis.
  threebet: {
    HJ: {
      UTG: {
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
            '3bet': 'TT+, AQo+, KTs+, A4s+, KQo',
          },
        },
        supernit: {
          size: 10,
          actions: {
            '3bet': 'TT+, AQo+, KTs+, A4s+, KQo',
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
      UTG: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'JJ+, ATs+, AQo+, KJs+, A5s:0.5',
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
        supernit: {
          size: 10,
          actions: {
            '3bet': '99+, AQo+, KTs+, A8s+, A5s, A4s, A7s:0.5, A6s:0.5, KQo, QJs',
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'JJ+, ATs+, AQo+, KJs+, A5s:0.5',
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
            '3bet': '99+, AJo+, KTs+, A4s+, KQo, QJs',
          },
        },
        supernit: {
          size: 10,
          actions: {
            '3bet': '99+, AJo+, KTs+, A4s+, KQo, QJs',
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
      UTG: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AJs+, AQo+, KQo, A5s:0.5, A4s:0.5, JJ:0.5, TT:0.5',
            'call': 'ATs+, KTs+, QTs+, 88+, JTs'
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': '88+, A8s+, AQo+, KTs+, QTs+, A5s, A4s, KQo, JTs',
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': '88+, A3s+, AQo+, KTs+, QTs+, KQo, JTs',
          },
        },
        supernit: {
          size: 10,
          actions: {
            '3bet': '88+, A3s+, AQo+, KTs+, QTs+, KQo, JTs',
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AJs+, AQo+, KQo, A5s:0.5, A4s:0.5, JJ:0.5, TT:0.5',
            'call': 'ATs+, KTs+, QTs+, 88+, JTs'
          },
        },
      },
      HJ: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'QQ+,AQs+, AQo+, KQs:0.5, KQo, A5s:0.5, A4s:0.5, A9s:0.5, AJs:0.5, ',
            'call': 'ATs+, KTs+, QJs, 88+, '
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': '88+, A8s+, AJo+, KTs+, K9s:0.5, QTs+, A5s, A4s, KQo, JTs:0.5',
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': '88+, A3s+, AJo+, KTs+, K9s:0.5, QTs+, KQo, JTs:0.5',
          },
        },
        supernit: {
          size: 10,
          actions: {
            '3bet': '88+, A3s+, AJo+, KTs+, K9s:0.5, QTs+, KQo, JTs:0.5',
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'QQ+, AJs+, AQo+, KQs, KQo, A5s:0.5, A4s:0.5',
            'call': 'ATs+, KTs+, QJs, 88+, '
          },
        },
      },
      CO: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'TT+, AQs+, AJo+, KQo, A9s, A8s, K9s, ',
            'call': 'ATs+, KTs+, QTs+, 66+, JTs, '
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': '77+, A4s+, AJo+, ATo:0.5, KJo:0.5, KTo:0.5, QJo:0.5, K9s+, K8s:0.5, Q9s:0.5, J9s:0.5, T9s:0.5, QTs+, KQo, JTs',
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': '77+, A2s+, AJo+, ATo:0.5, KJo:0.5, KTo:0.5, QJo:0.5, K9s+, K8s:0.5, Q9s:0.5, J9s:0.5, T9s:0.5, QTs+, KQo, JTs, 76s, 65s, 54s, ',
          },
        },
        supernit: {
          size: 10,
          actions: {
            '3bet': '77+, A2s+, AJo+, ATo:0.5, KJo:0.5, KTo:0.5, QJo:0.5, K9s+, K8s:0.5, Q9s:0.5, J9s:0.5, T9s:0.5, QTs+, KQo, JTs, 76s, 65s, 54s, ',
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'TT+, AQs+, AJo+, KQo, A9s, A8s, K9s, ',
            'call': 'ATs+, KTs+, QTs+, 66+, JTs, '
          },
        },
      },
    },
    SB: {
      UTG: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo+, KQs, TT:0.5',
            'call': 'TT:0.5, 99, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, '
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo+, KQs, TT:0.5, AQo, ',
            'call': 'TT:0.5, 99, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, '
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo+, KQs, TT:0.5, AQo, A5s, ',
            'call': 'TT:0.5, 99, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, '
          },
        },
        supernit: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo+, KQs, TT:0.5, AQo, A5s, ',
            'call': 'TT:0.5, 99, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, '
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo+, KQs, TT:0.5',
            'call': 'TT:0.5, 99, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, '
          },
        },
      },
      HJ: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo+, KQs, TT:0.5',
            'call': 'TT:0.5, 99, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, '
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo+, KQs, TT:0.5, AQo, ',
            'call': 'TT:0.5, 99, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, '
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo+, KQs, TT:0.5, AQo, A5s, KQo:0.5, ',
            'call': 'TT:0.5, 99, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, '
          },
        },
        supernit: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo+, KQs, TT:0.5, AQo, A5s, KQo:0.5, ',
            'call': 'TT:0.5, 99, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, '
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'JJ+, AQs+, AKo+, KQs, TT:0.5',
            'call': 'TT:0.5, 99, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, '
          },
        },
      },
      CO: {
        gto: {
          size: 10,
          actions: {
            '3bet': '99+, AQs+, AQo+, KQs, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, ',
            'call': '88, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, QTs, JTs, '
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': '99+, AQs+, AJo+, KQs, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, KQo, ',
            'call': '88, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, QTs, JTs, '
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': '99+, AQs+, AJo+, KQs, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, KQo, A9s, A5s, ',
            'call': '88, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, QTs, JTs, '
          },
        },
        supernit: {
          size: 10,
          actions: {
            '3bet': '99+, AQs+, AJo+, KQs, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, KQo, A9s, A5s, ',
            'call': '88, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, QTs, JTs, '
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': '99+, AQs+, AQo+, KQs, AJs:0.5, ATs:0.5, KJs:0.5, KTs:0.5, QJs:0.5, ',
            'call': '88, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, QTs, JTs, '
          },
        },
      },
      BTN: {
        gto: {
          size: 10,
          actions: {
            '3bet': 'TT+, AJs+, AJo+, KJo+, KQs, ATs:0.5, A9s:0.5,KJs:0.5, KTs:0.5, QJs:0.5, QTs:0.5, JTs:0.5, A8s, A7s, A5s, A4s, 99:0.5, 88:0.5, ',
            'call': '99:0.5, 88:0.5, 77, 66, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, QTs, JTs, A9s:0.5,  '
          },
        },
        fish: {
          size: 10,
          actions: {
            '3bet': 'TT+, AJs+, AJo+, KJo+, KQs, ATs:0.5, A9s:0.5,KJs:0.5, KTs:0.5, QJs:0.5, QTs:0.5, JTs:0.5, A8s, A7s, A5s, A4s, 99:0.5, 88:0.5, 77:0.5, ATo, K9s, Q9s, J9s, T9s,  ',
            'call': '99:0.5, 88:0.5, 77:0.5, 66, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, QTs, JTs, A9s:0.5, '
          },
        },
        nit: {
          size: 10,
          actions: {
            '3bet': 'TT+, AJs+, AJo+, KJo+, KQs, ATs:0.5, A9s:0.5,KJs:0.5, KTs:0.5, QJs:0.5, QTs:0.5, JTs:0.5, A8s-A2s, 99:0.5, 88:0.5, 77:0.5, ATo, K9s, Q9s, J9s, T9s, 65s, KTo:0.5, QJo:0.5, K8s,  ',
            'call': '99:0.5, 88:0.5, 77:0.5, 66, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, QTs, JTs, A9s:0.5, '
          },
        },
        supernit: {
          size: 10,
          actions: {
            '3bet': 'TT+, AJs+, AJo+, KJo+, KQs, ATs:0.5, A9s:0.5,KJs:0.5, KTs:0.5, QJs:0.5, QTs:0.5, JTs:0.5, A8s-A2s, 99:0.5, 88:0.5, 77:0.5, ATo, K9s, Q9s, J9s, T9s, 65s, KTo:0.5, QJo:0.5, K8s,  ',
            'call': '99:0.5, 88:0.5, 77:0.5, 66, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, QTs, JTs, A9s:0.5, '
          },
        },
        aggro: {
          size: 10,
          actions: {
            '3bet': 'TT+, AJs+, AJo+, KJo+, KQs, ATs:0.5, A9s:0.5,KJs:0.5, KTs:0.5, QJs:0.5, QTs:0.5, JTs:0.5, A8s, A7s, A5s, A4s, 99:0.5, 88:0.5, ',
            'call': '99:0.5, 88:0.5, 77, 66, QJs:0.5, KJs:0.5, KTs:0.5, AJs:0.5, ATs:0.5, QTs, JTs, A9s:0.5,  '
          },
        },
      },
    },
    BB: {
      UTG: {
        gto: {
          size: 12,
          actions: {
            '3bet': 'QQ+, AK, A5s-A4s:0.5, KQs:0.3',
            call:   'JJ-22, AQs-A2s, K9s+, Q9s+, J9s+, T8s+, 97s+, 87s, 76s, 65s, 54s, AQo-ATo, KJo+, QJo',
          },
        },
      },
      HJ: {
        gto: {
          size: 12,
          actions: {
            '3bet': 'JJ+, AK, AQs, A5s-A3s:0.5, KQs:0.5',
            call:   'TT-22, AJs-A2s, K7s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, AQo-A9o, KTo+, QTo+, JTo',
          },
        },
      },
      CO: {
        gto: {
          size: 12,
          actions: {
            '3bet': 'TT+, AQ+, AJs, A5s-A2s:0.5, KQs, K9s:0.3, 76s:0.3',
            call:   '99-22, ATs-A2s, K2s+, Q6s+, J7s+, T7s+, 96s+, 85s+, 75s+, 64s+, 54s, ' +
                    'AJo-A8o, KTo+, QTo+, JTo, T9o',
          },
        },
      },
      BTN: {
        gto: {
          size: 12,
          actions: {
            '3bet': '99+, AJ+, ATs, A5s-A2s:0.5, KJs+, K9s:0.5, QJs:0.5, J9s:0.5, T8s:0.5, 65s:0.5, KQo:0.5',
            call:   '88-22, A9s-A2s, K2s+, Q2s+, J4s+, T6s+, 95s+, 85s+, 74s+, 63s+, 53s+, 43s, ' +
                    'ATo-A2o, K7o+, Q8o+, J8o+, T8o+, 98o, 87o',
          },
        },
      },
      SB: {
        gto: {
          size: 9,
          actions: {
            '3bet': '88+, AT+, A5s-A2s, KTs+, QJs, K9s:0.5, 76s:0.5, KQo',
            call:   '77-22, A9s-A6s, K2s+, Q2s+, J5s+, T6s+, 96s+, 85s+, 74s+, 64s+, 53s+, 43s, ' +
                    'A9o-A2o, K8o+, Q9o+, J9o+, T9o, 98o',
          },
        },
      },
    },
  },
};
