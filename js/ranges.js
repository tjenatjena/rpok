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
 * Chaque position a une entrée par indice de déviation (voir CLAUDE.md) :
 *   '-1' : 1 joueur fort    0 : stratégie de base
 *    1   : 1 fish            2 : 2 fish            3 : 3 fish
 * (on ne compte que les joueurs qui restent à parler : indice = fish - regs forts)
 * Un indice absent affiche la range de l'indice 0.
 */

window.ACTIONS = {
  raise: { label: 'Raise', color: '#e0523f' },
  limp:  { label: 'Limp',  color: '#3fa96b' },
  fold:  { label: 'Fold',  color: '#2f3a48' },
};

window.RANGES = {
  open: {
    UTG: {
      0: {
        size: 3,
        actions: {
          raise: '77+, ' +
                 'A2s+, K8s+, QTs+, JTs, ' +
                 'ATo+, KJo+',
        },
      },
      1: {
        size: 3,
        actions: {
          raise: '55+, ' +
                 'A2s+, K6s+, Q9s+, JTs, ' +
                 'ATo+, KTo+, QJo',
        },
      },
      2: {
        size: 3,
        actions: {
          raise: '44+, ' +
                 'A2s+, K5s+, Q9s+, JTs, T9s, 98s, 87s, 76s, 65s,' +
                 'ATo+, KTo+, QJo',
        },
      },
      3: {
        size: 3,
        actions: {
          raise: '44+, ' +
                 'A2s+, K5s+, Q9s+, JTs, T9s, 98s, 87s, 76s, 65s,' +
                 'ATo+, KTo+, QJo',
        },
      },
      '-1': {
        size: 3,
        actions: {
          raise: '88+, ' +
                 'A3s+, KTs+, QTs+, JTs, ' +
                 'AQo+, KQo+',
        },
      },
    },
    HJ: {
      0: {
        size: 3,
        actions: {
          raise: '66+, ' +
                 'A2s+, K4s+, Q9s+, J9s+, T9s, ' +
                 'ATo+, KTo+, QJo',
        },
      },
      1: {
        size: 3,
        actions: {
          raise: '44+, ' +
                 'A2s+, K4s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, 54s,' +
                 'A9o+, KTo+, QTo+',
        },
      },
      2: {
        size: 3,
        actions: {
          raise: '33+, ' +
                 'A2s+, K3s+, Q8s+, J9s+, T9s, 98s, 87s, 76s, 65s, 54s, ' +
                 'A8o+, KTo+, QTo+',
        },
      },
      3: {
        size: 3,
        actions: {
          raise: '33+, ' +
                 'A2s+, K3s+, Q8s+, J9s+, T9s, 98s, 87s, 76s, 65s, 54s, ' +
                 'A8o+, KTo+, QTo+',
        },
      },
      '-1': {
        size: 3,
        actions: {
          raise: '77+, ' +
                 'A2s+, KTs+, QTs+, JTs+, ' +
                 'AJo+, KQo+, ',
        },
      },
    },
    CO: {
      0: {
        size: 3,
        actions: {
          raise: '55+, ' +
                 'A2s+, K3s+, Q8s+, J8s+, T8s+, 98s,' +
                 'A8o+, KTo+, QTo+, JTo',
        },
      },
      1: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q8s+, J8s+, T8s+, 98s, 87s, 76s, 65s, 54s,' +
                 'A7o+, K9o+, QTo+, JTo',
        },
      },
      2: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q6s+, J7s+, T7s+, 97s+, 87s, 76s, 65s, 54s, ' +
                 'A5o+, K9o+, QTo+, JTo',
        },
      },
      3: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q6s+, J7s+, T7s+, 97s+, 87s, 76s, 65s, 54s, ' +
                 'A5o+, K9o+, QTo+, JTo',
        },
      },
      '-1': {
        size: 3,
        actions: {
          raise: '66+, ' +
                 'A2s+, KTs+, QTs+, JTs+, ' +
                 'ATo+, KTo+, QJo',
        },
      },
    },
    BTN: {
      0: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J5s+, T6s+, 96s+, 86s+, 75s+, 65s, 54s,' +
                 'A3o+, K8o+, Q9o+, J9o+, T9o',
        },
      },
      1: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J2s+, T3s+, 95s+, 85s+, 74s+, 64s+, 53s+, 43s, ' +
                 'A2o+, K4o+, Q7o+, J7o+, T7o+, 97o+, 87o, 76o, ',
        },
      },
      2: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J2s+, T3s+, 95s+, 85s+, 74s+, 64s+, 53s+, 43s, ' +
                 'A2o+, K2o+, Q6o+, J7o+, T7o+, 97o+, 87o, 76o, 65o, ',
        },
      },
      3: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, ' +
                 'A2o+, K2o+, Q2o+, J6o+, T6o+, 96o+, 86o+, 76o, 65o, ',
        },
      },
      '-1': {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K8s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, ' +
                 'A9o+, KTo+, QTo+, JTo',
        },
      },
    },
    SB: {
      0: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J5s+, T6s+, 96s+, 86s+, 75s+, 64s+, 54s,' +
                 'A3o+, K8o+, Q9o+, J9o+, T9o',
        },
      },
      1: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J2s+, T3s+, 94s+, 84s+, 74s+, 64s+, 54s, ' +
                 'A2o+, K4o+, Q7o+, J7o+, T7o+, 97o+, 87o, 76o, ',
        },
      },
      2: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J2s+, T2s+, 94s+, 84s+, 74s+, 64s+, 53s+, 43s, ' +
                 'A2o+, K2o+, Q6o+, J7o+, T7o+, 97o+, 86o+, 75o+, 65o, 54o, ',
        },
      },
      3: {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, ' +
                 'A2o+, K2o+, Q2o+, J2o+, T6o+, 96o+, 86o+, 75o+, 65o, 54o,  ',
        },
      },
      '-1': {
        size: 3,
        actions: {
          raise: '22+, ' +
                 'A2s+, K8s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, ' +
                 'A9o+, KTo+, QTo+, JTo',
        },
      },
    },
  },
};
