(function () {
  'use strict';

  const RANKS = 'AKQJT98765432'.split('');
  // Formats de table choisis par le switch 9max / 6max : positions dans l'ordre de parole préflop.
  const FORMATS = {
    '6max': ['LJ', 'HJ', 'CO', 'BU', 'SB', 'BB'],
    '9max': ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BU', 'SB', 'BB'],
  };
  let POSITIONS = FORMATS['6max'];
  const TOTAL_COMBOS = 1326;

  // Emplacements des sièges sur la table (en % du conteneur), dans le sens horaire
  // en partant du héros en bas.
  const SLOTS_BY_FORMAT = {
    '6max': [[50, 80], [8, 66], [8, 28], [50, 12], [92, 28], [92, 66]],
    '9max': [[50, 82], [20, 74], [6, 50], [12, 24], [35, 10], [65, 10], [88, 24], [94, 50], [80, 74]],
  };
  const CENTER = [50, 48];

  // Profils de joueurs à la table (voir CLAUDE.md), dans l'ordre du menu.
  const PROFILES = [
    { id: 'aggro', label: 'vs. aggro', color: '#22c7e0' },
    { id: 'gto', label: 'vs. reg', color: '#d92b2b' },
    { id: 'lin', label: 'vs. reg linéaire', color: '#f08a24' },
    { id: 'fish', label: 'vs. passif', color: '#ec6fb4' },
    { id: 'nit', label: 'vs. nit', color: '#3d5fd6' },
    { id: 'supernit', label: 'vs. super nit', color: '#2333a3' },
    { id: 'limp528', label: 'vs. 5-28', color: '#4a9d6e' },
    { id: 'limp050', label: 'vs. 0-50', color: '#8a6fd6' },
    { id: 'limp0100', label: 'vs. 0-100', color: '#a0654a' },
    { id: 'limp1660', label: 'vs. 16-60', color: '#2f9e8f' },
    { id: 'limp037', label: 'vs. 0-37', color: '#c9972e' },
  ];
  const profileOf = (id) => PROFILES.find((p) => p.id === id);

  // Profil réellement utilisé pour un spot : celui demandé, sinon gto.
  function resolveProfile(byProfile, id) {
    if (byProfile[id]) return id;
    return byProfile.gto ? 'gto' : null;
  }


  // Actions qu'on peut donner à un vilain en cliquant sur son siège.
  const VILLAIN_ACTIONS = ['raise', 'call', '3bet', 'limp'];
  const EMPTY_SPOT = { size: 0, actions: {} };

  // villain : { position: 'raise' | 'call' | '3bet' } pour les vilains dont on a donné l'action.
  // drill : null (mode normal) ou mode choisi dans le menu Drill ('all' ou une clé de DRILL_KINDS).
  // drillProfile : profil imposé par le sous-menu du drill (null = tous les profils).
  // format : '6max' | '9max' (switch en haut à droite), voir FORMATS.
  const state = { format: '6max', hero: 'LJ', profile: 'gto', hovered: null, villain: {}, drill: null, drillProfile: null, drillHero: null, drillVillain: null, drillProfileLock: null };

  const posIdx = (pos) => POSITIONS.indexOf(pos);
  const openSize = (pos) => (window.RANGES.open[pos] ? window.RANGES.open[pos].gto.size : 3);

  // Déduit le spot des actions des vilains :
  //   aucune action                       -> open
  //   un seul vilain avant le héros raise -> 3bet (héros face à un open)
  //   un seul vilain après le héros 3bet  -> vs3bet (héros a ouvert, défense face au 3bet)
  //   un seul vilain avant le héros limp  -> iso (range par position du limpeur, voir RANGES.iso)
  //   un vilain raise puis un autre call, tous deux avant le héros -> squeeze
  //   autre séquence                      -> non couverte (kind = null)
  // Puis choisit la range du profil courant. Seuls les profils définis pour le spot sont proposés
  // (vs. reg toujours) ; si le profil choisi n'existe pas ici, la range vs. reg est affichée
  // sans changer le choix (il revient dès qu'un spot le définit).
  function currentSpot() {
    const acts = Object.entries(state.villain);
    let kind = null, villain = null, callerPos = null, byProfile = null;
    if (!acts.length) {
      kind = 'open';
      byProfile = window.RANGES.open[state.hero];
    } else if (acts.length === 1 && acts[0][1] === 'raise' && posIdx(acts[0][0]) < posIdx(state.hero)) {
      kind = 'threebet';
      villain = acts[0][0];
      byProfile = (window.RANGES.threebet[state.hero] || {})[villain];
    } else if (acts.length === 1 && acts[0][1] === '3bet' && posIdx(acts[0][0]) > posIdx(state.hero)) {
      kind = 'vs3bet';
      villain = acts[0][0];
      byProfile = (window.RANGES.vs3bet[state.hero] || {})[villain];
    } else if (acts.length === 1 && acts[0][1] === 'limp' && posIdx(acts[0][0]) < posIdx(state.hero)) {
      kind = 'iso';
      villain = acts[0][0];
      byProfile = (window.RANGES.iso[state.hero] || {})[villain];
    } else if (acts.length === 2) {
      const raiser = acts.find(([, a]) => a === 'raise');
      const caller = acts.find(([, a]) => a === 'call');
      if (raiser && caller && posIdx(raiser[0]) < posIdx(caller[0]) && posIdx(caller[0]) < posIdx(state.hero)) {
        kind = 'squeeze';
        villain = raiser[0];
        callerPos = caller[0];
        byProfile = ((window.RANGES.squeeze[state.hero] || {})[villain] || {})[callerPos];
      }
    }
    if (!byProfile) return { kind, villain, caller: callerPos, spot: EMPTY_SPOT, missing: true, profile: 'gto', profiles: ['gto'] };
    // 'gto' n'apparaît que s'il est défini pour ce spot (ex. pas de vs. reg sur l'iso sur limp) ;
    // le profil choisi revient sur gto s'il est défini, sinon sur le premier profil disponible.
    const profiles = PROFILES.map((p) => p.id).filter((id) => byProfile[id]);
    const profile = resolveProfile(byProfile, state.profile) || profiles[0];
    return { kind, villain, caller: callerPos, spot: byProfile[profile] || EMPTY_SPOT, missing: false, profile, profiles };
  }

  // Notes de sizing (voir chart perso), affichées dans le panneau selon le spot courant.
  const SIZING_NOTES = {
    threebet: {
      title: 'Sizing 3bet',
      table: {
        head: ['', '2x', '2,5x', '3x'],
        rows: [
          ['IP (×3,3)', '7 bb', '8,5 bb', '10 bb'],
          ['SB (×4,3)', '9 bb', '11 bb', '13 bb'],
          ['BB liné', '9 bb', '11 bb', '13 bb'],
          ['BB pola', '10 bb', '13 bb', '15 bb'],
        ],
        // Seule la ligne de la position du héros est affichée (IP = LJ/HJ/CO/BU).
        rowFor: (hero) => (hero === 'SB' || hero === 'BB' ? hero : 'IP'),
      },
      // Tableaux propres à un couple héros / ouvreur, à la place du tableau général.
      tables: {
        'BB vs SB': {
          head: ['', '2,5x', '3x', '3,5x'],
          rows: [
            ['BB liné', '7,5 bb', '9 bb', '10,5 bb'],
            ['BB pola', '9,5 bb', '11 bb', '12,5 bb'],
          ],
        },
      },
    },
    iso: {
      title: 'Sizing iso',
      table: {
        inline: true,
        rows: [
          ['UTG à CO', '3,5x'],
          ['BU', '4x'],
          ['OOP', '5x'],
          ['BB vs SB', '4x mini (pas de max)'],
        ],
        // Seule la ligne du héros est affichée (OOP = SB, ou BB face à un limpeur LJ/HJ/CO/BU).
        rowFor: (hero, villain) => (hero === 'BB' && villain === 'SB' ? 'BB vs SB'
          : hero === 'BU' ? 'BU' : (hero === 'SB' || hero === 'BB') ? 'OOP' : 'UTG à CO'),
      },
    },
    vs3bet: { title: 'Sizing 4bet' },
    squeeze: { title: 'Sizing squeeze', pair: ['IP (×4,5)', 'OOP (×5)'] },
  };

  // Notes de stratégie 3bet (voir notes perso) : ligne de la position du héros, notes générales,
  // puis note du profil choisi (vs. reg : les trois notes de profil).
  const THREEBET_POS_NOTES = {
    LJ: ['Early : 3b linéaire'],
    HJ: ['Early : 3b linéaire'],
    CO: ['Early : 3b linéaire'],
    BU: ['BU : 3b polarisé et call la mid range'],
    SB: ['SB : 3b polarisé', 'Range de call en SB et BB : il faut que l\'OR soit tight et fish en BB'],
    BB: ['Range de call en SB et BB : il faut que l\'OR soit tight et fish en BB'],
  };
  const THREEBET_GENERAL_NOTES = [
    '+ vilain call, plus on 3b mergé',
    '+ vilain fold, plus on 3b polarisé',
    'Grossir le sizing en fonction de la profondeur',
  ];
  const THREEBET_PROFILE_NOTES = {
    nit: { title: 'vs. nit', lines: ['3b polarisé car %f élevé et 4b domine notre range mergée', 'Obtenir des fold', 'Utiliser une range polarisée (SC) vs. une range serrée'] },
    aggro: { title: 'vs. aggro', lines: ['3b mergé vs. low 4betteur', 'Développer une range de call vs. high 4betteur', 'Mauvaise réalisation d\'équité (privilégier la position)'] },
    fish: { title: 'vs. fish', lines: ['Beaucoup 3b mergé pour isoler avec une range dominante', 'Excellente réalisation d\'équité', 'Grossir les sizings'] },
  };
  const THREEBET_NOTES_BY_PROFILE = {
    gto: ['aggro', 'fish', 'nit'],
    lin: ['aggro', 'fish', 'nit'],
    nit: ['nit'],
    supernit: ['nit'],
    aggro: ['aggro'],
    fish: ['fish'],
  };
  // Notes propres à un couple héros / ouvreur (descriptions des onglets de MC26+W25.rm), par profil :
  // remplacent les notes 3bet ci-dessus (le tableau de sizing reste affiché).
  const THREEBET_SPOT_NOTES = {
    'BB vs BU': {
      gto: [
        { title: 'vs. BU reg (Open 42/44%)', lines: [
          'On utilise 2 strat en fonction du profil',
          'Polarisé : strat de base avec petit coeur de range en call pour board coverage',
          'Linéaire : vs vilain qui défendent beaucoup',
        ] },
      ],
      aggro: [
        { title: 'vs. BU aggro (gros 4betteur : open 44%+ &amp; 4b++)', lines: [
          'Polarisé',
          'Ne pas 3bet fold des équités fortes',
          'Objectif crush la range d\'open',
        ] },
        { title: 'vs. BU aggro (CS)', lines: ['Linéaire'] },
      ],
      fish: [
        { title: 'vs. BU passif :', lines: [
          'Linéaire',
          'Mergé vs vilain CS',
          'Objectif value',
          'Peu de risque de 3b/fold de l\'équité',
        ] },
      ],
      nit: [
        { title: 'vs. BU nit (Open 40%- &amp; F3b 70%+)', lines: [
          'Polarisée',
          'Top + trash',
          'Objectif faire fold vilain',
          'vs. range tight = déf de SC',
        ] },
      ],
    },
  };

  // Notes iso sur limp (voir notes perso) : identiques pour tous les spots d'iso.
  const ISO_FUNDAMENTALS = [
    'Aggressivité des joueurs derrière (%3b)',
    '%VPIP &amp; %CC des joueurs derrière',
    'Stack du limper',
  ];
  const ISO_NOTES = [
    'vs. passif : Iso énormément',
    'vs. aggro : Objectif top paire donc pas iso PP &amp; SC',
    'Donner énormément de crédit au limp reraise',
    'Big sizing d\'iso si baleine',
  ];

  // Ajoutées après une ligne vide, selon le profil du limpeur.
  const ISO_PROFILE_NOTES = {
    limp528: [
      'Iso une range LINEAIRE et PROGRESSIVE',
      '3b uniquement le top de range',
    ],
    limp050: [
      'Iso une range LINEAIRE et PROGRESSIVE',
      'En SB overlimp ssi fish passif en BB : ajouter 22, 33, 44 &amp; tous les Axs et Kxs',
    ],
    // Profil propre au BB vs SB : notes groupées sous un titre.
    limp0100: [
      { title: 'vs. Limp/fold', lines: ['Pas de gros sizing (4x only)', 'Stratégie polarisée', 'Garder un cœur de range de check'] },
      { title: 'vs. Limp/call', lines: ['Polarisé à 7x', 'Mergé à 4x'] },
    ],
  };

  const list = (lines, cls) => '<ul class="note-lines' + (cls ? ' ' + cls : '') + '">' +
    lines.map((l) => '<li>' + l + '</li>').join('') + '</ul>';

  function isoNotesHtml(cur) {
    const extra = ISO_PROFILE_NOTES[cur.profile];
    const extraHtml = !extra ? ''
      : typeof extra[0] === 'string' ? list(extra, 'gap')
      : extra.map((g, i) => '<h4' + (i === 0 ? ' class="gap"' : '') + '>' + g.title + '</h4>' + list(g.lines)).join('');
    return '<h3>Fondamentaux</h3>' + list(ISO_FUNDAMENTALS) + list(ISO_NOTES, 'gap') + extraHtml;
  }

  function threebetNotesHtml(cur) {
    const spotNotes = THREEBET_SPOT_NOTES[state.hero + ' vs ' + cur.villain];
    if (spotNotes) {
      return (spotNotes[cur.profile] || []).map((g, i) =>
        '<h4' + (i === 0 ? ' class="gap"' : '') + '>' + g.title + '</h4>' + list(g.lines)).join('');
    }
    let html = '<h3>Notes 3bet</h3>' + list((THREEBET_POS_NOTES[state.hero] || []).concat(THREEBET_GENERAL_NOTES));
    (THREEBET_NOTES_BY_PROFILE[cur.profile] || []).forEach((k) => {
      const n = THREEBET_PROFILE_NOTES[k];
      html += '<h4>' + n.title + '</h4>' + list(n.lines);
    });
    return html;
  }

  function renderSizingNote(cur) {
    const el = $('#sizing-note');
    const note = SIZING_NOTES[cur.kind];
    if (!note) { el.hidden = true; el.innerHTML = ''; return; }
    let html = '<h3>' + note.title + '</h3>';
    const table = (note.tables && note.tables[state.hero + ' vs ' + cur.villain]) || note.table;
    if (table) {
      const { rows, rowFor } = table;
      const row = rowFor && rowFor(state.hero, cur.villain);
      const shown = row ? rows.filter((r) => r[0] === row || r[0].startsWith(row + ' ')) : rows;
      // "inline" : chaque ligne en texte sur une seule ligne, sans tableau.
      html += table.inline ? shown.map((r) => '<div class="sizing-line">' + r.join(' : ') + '</div>').join('')
        : '<table>' + (table.head ? '<thead><tr>' + table.head.map((h) => '<th>' + h + '</th>').join('') + '</tr></thead>' : '') + '<tbody>' +
        shown.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') +
        '</tbody></table>';
    } else if (note.pair) {
      html += '<div class="sizing-pair">' + note.pair.map((c) => '<span>' + c + '</span>').join('') + '</div>';
    }
    if (cur.kind === 'vs3bet' && !cur.missing) html += '<div class="sizing-pair">IP: x2,2 &amp; OOP: x2,7 (max: ' + fmt(cur.spot.size) + 'bb)</div>';
    if (cur.kind === 'threebet') html += threebetNotesHtml(cur);
    if (cur.kind === 'iso') html += isoNotesHtml(cur);
    el.innerHTML = html;
    el.hidden = false;
  }

  // Action affichée pour le héros sur la table : [action, montant] ou null.
  function heroAction(cur) {
    if (cur.kind === 'vs3bet') return ['raise', openSize(state.hero)];
    if (!cur.missing) return [{ open: 'raise', squeeze: 'squeeze', iso: 'iso' }[cur.kind] || '3bet', cur.spot.size];
    const actedAfter = Object.keys(state.villain).some((p) => posIdx(p) > posIdx(state.hero));
    return actedAfter ? ['raise', openSize(state.hero)] : null;
  }

  /* ---------- Parsing des ranges ---------- */

  const rIdx = (c) => RANKS.indexOf(c);
  const span = (a, b) => {
    const out = [];
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.push(i);
    return out;
  };
  const withSuffix = (hi, lo, suf) => (suf ? [hi + lo + suf] : [hi + lo + 's', hi + lo + 'o']);

  function expandToken(tok) {
    let plus = false;
    if (tok.endsWith('+')) { plus = true; tok = tok.slice(0, -1); }

    if (tok.includes('-')) {
      const [a, b] = tok.split('-');
      if (a[0] === a[1]) return span(rIdx(a[0]), rIdx(b[0])).map((k) => RANKS[k] + RANKS[k]);
      return span(rIdx(a[1]), rIdx(b[1])).flatMap((k) => withSuffix(a[0], RANKS[k], a[2] || ''));
    }

    if (tok[0] === tok[1]) {
      return plus ? span(0, rIdx(tok[0])).map((k) => RANKS[k] + RANKS[k]) : [tok];
    }

    const suf = tok[2] || '';
    if (plus) return span(rIdx(tok[0]) + 1, rIdx(tok[1])).flatMap((k) => withSuffix(tok[0], RANKS[k], suf));
    return withSuffix(tok[0], tok[1], suf);
  }

  // Formats acceptés : "AA", "22+", "99-66", "AK", "AKs", "A2s+", "K9s-K6s", avec ":0.5" optionnel.
  const TOKEN_RE = /^(?:[AKQJT2-9]{2}[so]?\+?|[AKQJT2-9]{2}[so]?-[AKQJT2-9]{2}[so]?)(?::(?:0|1|0?\.\d+|1\.0*))?$/;
  let parseErrors = [];

  function parseRange(str) {
    const out = {};
    (str || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((raw) => {
      if (!TOKEN_RE.test(raw)) { parseErrors.push(raw); return; }
      const [tok, f] = raw.split(':');
      const freq = f === undefined ? 1 : parseFloat(f);
      expandToken(tok).forEach((h) => { out[h] = (out[h] || 0) + freq; });
    });
    return out;
  }

  // Retourne { main: { action: fréquence, ..., fold: reste } } pour une position.
  function buildStrategy(spot) {
    parseErrors = [];
    const parsed = Object.entries(spot.actions).map(([a, str]) => [a, parseRange(str)]);
    const strat = {};
    allHands().forEach((h) => {
      const s = {};
      let sum = 0;
      parsed.forEach(([a, map]) => {
        const f = Math.min(map[h] || 0, 1 - sum);
        s[a] = f;
        sum += f;
      });
      s.fold = Math.max(0, 1 - sum);
      strat[h] = s;
    });
    return strat;
  }

  // Stratégie d'open du héros pour le profil donné (celui du spot vs3bet affiché, le héros n'ouvre
  // pas la même range vs. un reg, un nit ou un fish), utilisée en défense vs 3bet pour distinguer
  // les mains réellement ouvertes puis foldées au 3bet des mains jamais open-raise. Repli sur gto
  // si ce profil n'a pas de range d'open définie. N'affecte pas parseErrors (qui doit rester celui
  // du spot affiché).
  function heroOpenStrategy(profile, hero = state.hero) {
    const byProfile = window.RANGES.open[hero] || {};
    const openSpot = byProfile[resolveProfile(byProfile, profile)];
    if (!openSpot) return null;
    const savedErrors = parseErrors;
    const strat = buildStrategy(openSpot);
    parseErrors = savedErrors;
    return strat;
  }

  /* ---------- Mains ---------- */

  function handAt(r, c) {
    if (r === c) return RANKS[r] + RANKS[c];
    return r < c ? RANKS[r] + RANKS[c] + 's' : RANKS[c] + RANKS[r] + 'o';
  }

  function allHands() {
    const out = [];
    for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) out.push(handAt(r, c));
    return out;
  }

  const combos = (h) => (h.length === 2 ? 6 : h[2] === 's' ? 4 : 12);

  /* ---------- Table ---------- */

  const $ = (sel) => document.querySelector(sel);
  const tableEl = $('#table');
  const seatEls = {};
  const betEls = {};

  // Petit cadenas affiché en haut à droite du siège héros quand sa position est verrouillée (drill).
  const LOCK_SVG = '<svg viewBox="0 0 16 16" width="11" height="11"><rect x="3" y="7" width="10" height="8" rx="1.5" fill="currentColor"/>' +
    '<path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

  // (Re)construit les sièges du format courant (appelé à chaque changement de format).
  function buildTable() {
    Object.keys(seatEls).forEach((pos) => {
      seatEls[pos].remove();
      betEls[pos].remove();
      delete seatEls[pos];
      delete betEls[pos];
    });
    tableEl.classList.toggle('nine', POSITIONS.length > 6);
    POSITIONS.forEach((pos) => {
      const seat = document.createElement('button');
      seat.className = 'seat';
      seat.type = 'button';
      seat.innerHTML =
        '<div class="plate"><span class="pos">' + pos + '</span><span class="stack"></span>' +
        '<span class="lock" aria-hidden="true">' + LOCK_SVG + '</span></div>' +
        '<div class="tag"></div>';
      seat.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.drill) {
          if (pos === state.hero) toggleDrillLock();
          else if (drillQuestionVillains().includes(pos)) toggleDrillVillainLock();
          return;
        }
        toggleMenu(pos);
      });
      tableEl.appendChild(seat);
      seatEls[pos] = seat;

      const bet = document.createElement('div');
      bet.className = 'bet';
      bet.innerHTML = '<span class="chip"></span><span class="amt"></span>';
      tableEl.appendChild(bet);
      betEls[pos] = bet;
    });
  }

  const lerp = (a, b, t) => a + (b - a) * t;
  const fmt = (n) => (Math.round(n * 10) / 10).toString().replace('.', ',');
  const seatXY = (pos) => {
    const n = POSITIONS.length;
    return SLOTS_BY_FORMAT[state.format][(posIdx(pos) - posIdx(state.hero) + n) % n];
  };

  // Assombrit une couleur hex (pct de 0 à 1) pour le dégradé du tapis.
  const shade = (hex, pct) => {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * pct));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  };

  // Couleur du tapis = couleur du profil de vilain courant (voir PROFILES).
  function renderFelt() {
    const color = profileOf(currentSpot().profile).color;
    tableEl.style.setProperty('--felt', color);
    tableEl.style.setProperty('--felt-dark', shade(color, 0.55));
  }

  function renderTable() {
    renderFelt();
    const heroIdx = posIdx(state.hero);
    const heroAct = heroAction(currentSpot());
    let pot = 0;
    let level = 1; // mise la plus haute en cours (BB)

    // Parcours dans l'ordre de parole pour calculer les montants (call = suit, relance = x3).
    POSITIONS.forEach((pos, i) => {
      const [x, y] = seatXY(pos);
      const seat = seatEls[pos];
      const isHero = pos === state.hero;
      // Drill : l'action du héros est la question, donc ni jetons ni montant, juste « ? ».
      const hiddenHero = isHero && state.drill;

      let act = null, amt = 0;
      // Drill en défense vs 3bet : l'open du héros reste caché mais compte pour le montant du
      // 3bet et pour le pot.
      const hiddenOpen = hiddenHero && heroAct && Object.values(state.villain).includes('3bet') ? heroAct[1] : 0;
      if (hiddenOpen) level = Math.max(level, hiddenOpen);
      if (isHero) {
        if (heroAct && !hiddenHero) [act, amt] = heroAct;
      } else if (state.villain[pos]) {
        act = state.villain[pos];
        amt = act === 'call' ? level : act === 'limp' ? 1 : level <= 1 ? openSize(pos) : level * 3;
      }
      if (act) level = Math.max(level, amt);
      const folded = !act && i < heroIdx;

      let bet = act ? amt : 0;
      if (hiddenHero) bet = 0;
      else if (!act && pos === 'SB') bet = 0.5;
      else if (!act && pos === 'BB') bet = 1;
      pot += bet + hiddenOpen;

      seat.style.left = x + '%';
      seat.style.top = y + '%';
      seat.classList.toggle('hero', isHero);
      // Drill : le siège du héros et ceux des vilains de la question se verrouillent au clic.
      const isQVillain = !isHero && !!state.drill && drillQuestionVillains().includes(pos);
      const heroLocked = isHero && !!state.drill && state.drillHero === pos;
      const villainLocked = isQVillain && state.drillVillain === drillQuestion.villain;
      seat.classList.toggle('locked', heroLocked || villainLocked);
      seat.classList.toggle('lockable', (isHero && !!state.drill) || isQVillain);
      seat.title = isHero && state.drill
        ? (state.drillHero ? 'Déverrouiller la position du héros' : 'Verrouiller le drill sur cette position du héros')
        : isQVillain ? (state.drillVillain ? 'Déverrouiller la position du vilain' : 'Verrouiller le drill sur ce vilain') : '';
      seat.classList.toggle('folded', folded);
      seat.querySelector('.stack').textContent = fmt(100 - bet - hiddenOpen) + ' BB';

      const tag = seat.querySelector('.tag');
      tag.className = 'tag';
      tag.style.background = '';
      tag.style.color = '';
      if (hiddenHero) {
        tag.textContent = '?';
        tag.style.background = window.ACTIONS.raise.color;
        tag.style.color = window.ACTIONS.raise.text;
        tag.classList.add('show');
      } else if (folded) {
        tag.textContent = 'Fold';
        tag.classList.add('show', 'fold');
      } else if (act) {
        tag.textContent = window.ACTIONS[act].label + (act === 'call' || act === 'limp' ? '' : ' ' + fmt(amt));
        tag.style.background = window.ACTIONS[act].color;
        tag.style.color = window.ACTIONS[act].text || '';
        tag.classList.add('show');
      } else tag.textContent = '';

      const b = betEls[pos];
      b.style.left = lerp(x, CENTER[0], 0.42) + '%';
      b.style.top = lerp(y, CENTER[1], 0.42) + '%';
      b.classList.toggle('show', bet > 0);
      b.querySelector('.chip').style.background = act ? window.ACTIONS[act].color : '';
      b.querySelector('.amt').textContent = fmt(bet);
    });

    const [bx, by] = seatXY('BU');
    const btn = $('#dealer');
    btn.style.left = lerp(bx, CENTER[0], 0.3) + (bx < 50 ? 4 : bx > 50 ? -4 : 7) + '%';
    btn.style.top = lerp(by, CENTER[1], 0.3) + (by > 50 ? -3 : 3) + '%';

    $('#pot').innerHTML = 'Pot <strong>' + fmt(pot) + ' BB</strong>';
    tableLevel = level;
  }

  // Mise la plus haute face au héros (montant d'un call, animation du drill).
  let tableLevel = 1;

  /* ---------- Grille de range ---------- */

  const gridEl = $('#grid');
  const cellEls = {};
  let strategy = {};

  function buildGrid() {
    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 13; c++) {
        const h = handAt(r, c);
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.textContent = h;
        cell.addEventListener('mouseenter', () => hover(h));
        cell.addEventListener('mouseleave', () => hover(null));
        cell.addEventListener('touchstart', () => hover(h), { passive: true });
        gridEl.appendChild(cell);
        cellEls[h] = cell;
      }
    }
  }

  function actionOrder() {
    return Object.keys(currentSpot().spot.actions).concat('fold');
  }

  // openWeight (optionnel, défense vs 3bet) = fréquence d'open du héros pour cette main : sépare
  // visuellement le fold au 3bet (gris clair) du fold faute d'avoir même été open-raise (gris foncé).
  function background(s, openWeight) {
    const stops = [];
    let acc = 0;
    const push = (color, f) => {
      if (f <= 0) return;
      stops.push(color + ' ' + acc * 100 + '%', color + ' ' + (acc + f) * 100 + '%');
      acc += f;
    };
    actionOrder().forEach((a) => {
      const f = s[a] || 0;
      if (f <= 0) return;
      if (a === 'fold' && openWeight != null) {
        const foldTo3bet = Math.max(0, Math.min(f, openWeight - (1 - f)));
        push(window.ACTIONS.fold3bet.color, foldTo3bet);
        push(window.ACTIONS.fold.color, f - foldTo3bet);
        return;
      }
      push(window.ACTIONS[a].color, f);
    });
    return 'linear-gradient(to right, ' + stops.join(', ') + ')';
  }

  // Marques du spot (voir MARKS dans ranges.js) : { clé: { main: true } }.
  let marks = {};

  function buildMarks(spot) {
    const out = {};
    Object.keys(window.MARKS).filter((k) => spot[k]).forEach((k) => { out[k] = parseRange(spot[k]); });
    return out;
  }

  const markOf = (h) => Object.keys(marks).find((k) => marks[k][h]);

  function renderGrid() {
    const cur = currentSpot();
    const { spot } = cur;
    strategy = buildStrategy(spot);
    marks = buildMarks(spot);
    let openWeights = null;
    if (cur.kind === 'vs3bet' && !cur.missing) {
      const openStrategy = heroOpenStrategy(cur.profile);
      if (openStrategy) {
        openWeights = {};
        Object.entries(openStrategy).forEach(([h, s]) => { openWeights[h] = 1 - s.fold; });
      }
    }
    // Main interrogée dans le drill : entourée une fois la range révélée, pour la repérer.
    const highlight = (state.drill && drillAnswered && drillQuestion) ? drillQuestion.hand : null;
    Object.entries(cellEls).forEach(([h, cell]) => {
      cell.classList.toggle('drill-hit', h === highlight);
      if (state.drill && !drillAnswered) {
        cell.style.background = 'var(--surface-2)';
        cell.style.boxShadow = '';
        cell.classList.remove('out', 'fold3bet');
        return;
      }
      const s = strategy[h];
      const m = markOf(h);
      cell.style.background = background(s, openWeights ? openWeights[h] : null);
      let shadow = m ? 'inset 0 0 0 3px ' + window.MARKS[m].color : '';
      if (h === highlight) {
        const ring = '0 0 0 2px rgba(0,0,0,.65), 0 0 0 4px #ff2d2d';
        shadow = shadow ? shadow + ', ' + ring : ring;
      }
      cell.style.boxShadow = shadow;
      cell.classList.toggle('out', s.fold >= 0.999);
      // Texte blanc plutôt que gris terne quand le fold de la case est surtout un fold au 3bet
      // (main réellement ouverte) et non faute d'avoir même été open-raise.
      const ow = openWeights ? (openWeights[h] || 0) : 0;
      cell.classList.toggle('fold3bet', s.fold >= 0.999 && ow > 0.5);
    });
  }

  function spotTitle(cur) {
    if (cur.kind === 'open') return state.hero + ' – Open';
    if (cur.kind === 'threebet') return state.hero + ' vs ' + cur.villain + ' – 3bet';
    if (cur.kind === 'vs3bet') return state.hero + ' vs ' + cur.villain + ' – Def vs 3bet';
    if (cur.kind === 'iso') return state.hero + ' vs ' + cur.villain + ' – Iso sur limp';
    if (cur.kind === 'squeeze') return state.hero + ' vs ' + cur.villain + ' + ' + cur.caller + ' – Squeeze';
    return state.hero + ' – Spot non couvert';
  }

  function spotSub(cur) {
    if (cur.missing) {
      if (cur.kind === 'open') return "Pas de range d'open depuis la " + state.hero + " : clique sur un siège pour donner l'action d'un vilain.";
      if (cur.kind === 'threebet') return 'Pas de range définie pour ' + state.hero + ' face à un open ' + cur.villain + '.';
      if (cur.kind === 'vs3bet') return 'Pas de range définie pour ' + state.hero + ' face à un 3bet ' + cur.villain + '.';
      if (cur.kind === 'iso') return "Pas de range d'iso définie pour " + state.hero + ' face à un limp ' + cur.villain + '.';
      if (cur.kind === 'squeeze') return 'Pas de range de squeeze pour ' + state.hero + ' face à un open ' + cur.villain + ' et un call ' + cur.caller + '.';
      return "Pas de range pour cette séquence : seuls l'open, le 3bet face à un open, la défense face à un 3bet, l'iso sur limp et le squeeze sont couverts.";
    }
    if (cur.kind === 'open') return '';
    if (cur.kind === 'vs3bet') return '';
    if (cur.kind === 'squeeze') {
      return cur.villain + ' ouvre à ' + fmt(openSize(cur.villain)) + ' BB · ' + cur.caller + ' call · squeeze à ' +
        fmt(cur.spot.size) + ' BB';
    }
    return '';
  }

  function renderPanel() {
    const cur = currentSpot();
    const { spot } = cur;
    $('#spot-title').innerHTML = spotTitle(cur) + ' <span class="profile-badge" style="--pc:' + profileOf(cur.profile).color + '">' + profileOf(cur.profile).label + '</span>';

    if (state.drill) {
      $('#spot-sub').hidden = true;
      $('#sizing-note').hidden = true;
      $('#parse-errors').hidden = true;
      $('#legend').hidden = true;
      $('#hover').hidden = true;
      $('#drill-panel').hidden = false;
      renderDrillCards();
      renderDrillScore();
      return;
    }
    $('#drill-panel').hidden = true;
    $('#legend').hidden = false;
    $('#hover').hidden = false;

    const totals = {};
    actionOrder().forEach((a) => { totals[a] = 0; });
    Object.entries(strategy).forEach(([h, s]) => {
      actionOrder().forEach((a) => { totals[a] += (s[a] || 0) * combos(h); });
    });
    // Défense vs 3bet : le héros n'ouvre pas 100 % des mains, donc le fold affiché ne doit
    // représenter que la part de sa range d'open qui ne défend pas (pas tout le 169-grid).
    if (cur.kind === 'vs3bet' && !cur.missing) {
      const openStrategy = heroOpenStrategy(cur.profile);
      if (openStrategy) {
        const openCombos = Object.entries(openStrategy)
          .reduce((acc, [h, s]) => acc + (1 - s.fold) * combos(h), 0);
        const defended = actionOrder().filter((a) => a !== 'fold')
          .reduce((acc, a) => acc + totals[a], 0);
        totals.fold = Math.max(0, openCombos - defended);
      }
    }
    const sub = $('#spot-sub');
    sub.classList.toggle('warn', cur.missing);
    sub.textContent = spotSub(cur);
    sub.hidden = !sub.textContent;
    renderSizingNote(cur);

    $('#legend').innerHTML = actionOrder().map((a) => {
      const act = window.ACTIONS[a];
      // "sizes" : sizing propre à une action du spot (ex. 3b linéaire 9bb / polarisé 11bb).
      const label = ['raise', 'squeeze', 'iso'].includes(a) ? act.label + ' ' + fmt(spot.size) + (a === 'iso' ? 'bb' : '')
        : (spot.sizes && spot.sizes[a]) ? (act.sizedLabel || act.label) + ' ' + fmt(spot.sizes[a]) + 'bb' : act.label;
      // En défense vs 3bet, le total 'fold' ne compte que les mains ouvertes puis foldées :
      // la pastille reprend donc le gris clair (fold3bet), pas le gris foncé du fold générique.
      const swatch = (a === 'fold' && cur.kind === 'vs3bet') ? window.ACTIONS.fold3bet.color : window.ACTIONS[a].color;
      return '<li><span class="sw" style="background:' + swatch + '"></span>' +
        '<span class="lbl">' + label + '</span>' +
        '<span class="val">' + fmt((totals[a] / TOTAL_COMBOS) * 100) + ' %</span>' +
        '<span class="cmb">' + fmt(totals[a]) + ' c.</span></li>';
    }).join('') + Object.keys(marks).map((k) => {
      const n = Object.keys(marks[k]).reduce((acc, h) => acc + combos(h), 0);
      return '<li><span class="sw mark" style="--c:' + window.MARKS[k].color + '"></span>' +
        '<span class="lbl">' + window.MARKS[k].label + '</span>' +
        '<span class="val">' + fmt((n / TOTAL_COMBOS) * 100) + ' %</span>' +
        '<span class="cmb">' + fmt(n) + ' c.</span></li>';
    }).join('');

    const err = $('#parse-errors');
    err.hidden = !parseErrors.length;
    err.textContent = 'Main(s) non reconnue(s), vérifie les virgules dans ranges.js : ' + parseErrors.join(' · ');

    renderHover();
  }

  function renderHover() {
    const el = $('#hover');
    const h = state.hovered;
    if (!h) {
      el.innerHTML = '';
      return;
    }
    const s = strategy[h];
    const rows = actionOrder().filter((a) => s[a] > 0).map((a) =>
      '<div class="hrow"><span class="sw" style="background:' + window.ACTIONS[a].color + '"></span>' +
      window.ACTIONS[a].label + '<span class="val">' + Math.round(s[a] * 100) + ' %</span></div>'
    ).join('');
    const m = markOf(h);
    const markRow = m ? '<div class="hrow"><span class="sw mark" style="--c:' + window.MARKS[m].color + '"></span>' +
      window.MARKS[m].label + '</div>' : '';
    el.innerHTML = '<div class="hhand">' + h + ' <span class="muted">· ' + combos(h) + ' combos</span></div>' + rows + markRow;
  }

  /* ---------- Drill (entraînement sur tous les spots) ---------- */

  // Modes du menu Drill ; 'all' mélange au hasard les questions des autres modes.
  const DRILL_MODES = [
    { id: 'all', label: 'ALL' },
    { id: 'open', label: 'Open' },
    { id: 'threebet', label: '3b' },
    { id: 'bbdef', label: 'Def BB' },
    { id: 'vs3bet', label: 'Def vs 3b' },
    { id: 'squeeze', label: 'Squeeze' },
    { id: 'iso', label: 'Iso' },
  ];
  // Types de question : spot de RANGES interrogé, réponses proposées (dans l'ordre des boutons)
  // et actions de la range regroupées sous chaque réponse (le reste = fold). « hero » restreint
  // les positions du héros : le 3b exclut BB, dont la défense face à un open a son propre mode.
  //   3bet / 5bet all-in et variantes BB (value / linéaire / polarisé) -> 3bet
  //   4bet all-in -> 4bet ; « call si 3b petit » -> fold (3bet de taille standard)
  //   « call si baleine en blindes » -> fold (pas de baleine par défaut)
  //   iso « large » (mains jouées en plus / iso à une autre taille) -> iso
  const THREEBET_ACTIONS = ['5bet', '3bet', '3bvalue', '3blin', '3bpol'];
  const DRILL_KINDS = {
    open: { spot: 'open', answers: ['fold', 'raise'], groups: { raise: ['raise'] } },
    threebet: { spot: 'threebet', answers: ['fold', 'call', '3bet'], groups: { '3bet': THREEBET_ACTIONS, call: ['call'] }, hero: (h) => h !== 'BB' },
    bbdef: { spot: 'threebet', answers: ['fold', 'call', '3bet'], groups: { '3bet': THREEBET_ACTIONS, call: ['call'] }, hero: (h) => h === 'BB' },
    vs3bet: { spot: 'vs3bet', answers: ['fold', 'call', '4bet'], groups: { '4bet': ['4bet', 'jam'], call: ['call'] } },
    squeeze: { spot: 'squeeze', answers: ['fold', 'call', 'squeeze'], groups: { squeeze: ['squeeze'], call: ['call'] } },
    iso: { spot: 'iso', answers: ['fold', 'iso'], groups: { iso: ['iso', 'large'] } },
  };
  // Def BB : quand le 3bet de la range n'est fait que de 3b liné et/ou 3b pola (ex. BB vs BU),
  // chaque variante présente a son propre bouton au lieu d'un « 3bet » unique.
  const BB_SPLIT_3BET = ['3blin', '3bpol'];
  function drillAnswerSet(kind, spot) {
    const cfg = DRILL_KINDS[kind];
    if (kind === 'bbdef') {
      const threebets = THREEBET_ACTIONS.filter((a) => spot.actions[a]);
      if (threebets.length && threebets.every((a) => BB_SPLIT_3BET.includes(a))) {
        return {
          answers: ['fold', 'call'].concat(threebets),
          groups: Object.assign({ call: ['call'] }, ...threebets.map((a) => ({ [a]: [a] }))),
        };
      }
    }
    return { answers: cfg.answers, groups: cfg.groups };
  }
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Libellé d'une réponse : BB face à un limp ne folde pas, il checke ; libellés courts pour les
  // variantes de 3bet de la BB.
  const DRILL_ANSWER_LABELS = { '3blin': '3b liné', '3bpol': '3b pola' };
  const answerLabel = (a, q) => (a === 'fold' && q.kind === 'iso' && q.hero === 'BB' ? 'Check'
    : DRILL_ANSWER_LABELS[a] || window.ACTIONS[a].label);

  // Libellé avec le sizing de la relance (ex. « Raise 2,5 ») : taille propre à l'action (champ
  // « sizes » du spot) sinon « size », pour chaque action de la range regroupée sous la réponse ;
  // deux tailles sont listées (ex. iso BB vs SB « 4 / 7 »), trois ou plus en fourchette (« 11–13 »),
  // le 4bet all-in ajoute « AI ».
  function answerSizing(a, q) {
    const acts = (q.groups[a] || []).filter((x) => q.spot.actions[x]);
    if (a === 'call' || !acts.length) return '';
    let sizes = [...new Set(acts.filter((x) => x !== 'jam')
      .map((x) => (q.spot.sizes && q.spot.sizes[x]) || q.spot.size))].sort((x, y) => x - y);
    sizes = sizes.length > 2 ? [fmt(sizes[0]) + '–' + fmt(sizes[sizes.length - 1])] : sizes.map(fmt);
    if (acts.includes('jam')) sizes.push('AI');
    return sizes.join(' / ');
  }

  const answerText = (a, q) => (answerLabel(a, q) + ' ' + answerSizing(a, q)).trim();

  // Actions des vilains d'une question. villain = position du vilain, ou « ouvreur+caller » pour
  // le squeeze.
  function drillVillains(kind, villain) {
    if (!villain) return {};
    if (kind === 'squeeze') {
      const [opener, caller] = villain.split('+');
      return { [opener]: 'raise', [caller]: 'call' };
    }
    return { [villain]: { vs3bet: '3bet', iso: 'limp' }[kind] || 'raise' };
  }

  // Situations interrogeables : { hero, villain, byProfile } pour chaque range définie du type de
  // question, limitées aux positions du format (BB ne peut pas ouvrir, UTG à UTG2 seulement en 9max).
  function drillSituations(kind) {
    const cfg = DRILL_KINDS[kind];
    const data = window.RANGES[cfg.spot];
    let out;
    if (cfg.spot === 'open') {
      out = Object.keys(data).map((hero) => ({ hero, villain: null, byProfile: data[hero] }));
    } else if (cfg.spot === 'squeeze') {
      out = Object.entries(data).flatMap(([hero, byOpener]) => Object.entries(byOpener).flatMap(([opener, byCaller]) =>
        Object.entries(byCaller).map(([caller, byProfile]) => ({ hero, villain: opener + '+' + caller, byProfile }))));
    } else {
      out = Object.entries(data).flatMap(([hero, byVillain]) =>
        Object.entries(byVillain).map(([villain, byProfile]) => ({ hero, villain, byProfile })));
    }
    return out.filter((s) => POSITIONS.includes(s.hero) && (!cfg.hero || cfg.hero(s.hero)) &&
      (!s.villain || s.villain.split('+').every((v) => POSITIONS.includes(v))));
  }

  // Un drill dure DRILL_LENGTH mains ; à la fin, une fenêtre donne le score et les erreurs.
  const DRILL_LENGTH = 100;
  let drillStats = { correct: 0, total: 0 };
  // Réponses de la série en cours : { q, action, verdict } (verdict de drillVerdict).
  let drillSession = [];
  // Résultat de la dernière série terminée (réaffichable depuis le menu Drill).
  let lastDrillResult = null;
  let drillQuestion = null;
  // true une fois la question courante répondue : affiche alors toute la range de l'exercice.
  let drillAnswered = false;

  // Part des questions tirées parmi les mains « border » (le reste : n'importe quelle main).
  const DRILL_BORDER_SHARE = 0.85;

  // Tire une main au hasard parmi hands, pondérée par son nombre de combos (une main offsuit
  // sort plus souvent qu'une paire, comme à la table).
  function pickWeightedHand(hands) {
    const weights = hands.map(combos);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < hands.length; i++) {
      r -= weights[i];
      if (r <= 0) return hands[i];
    }
    return hands[hands.length - 1];
  }

  // Mains « border » d'une range (freqs : main -> { action: fréquence } sans le fold) : mains à
  // fréquence mixte, ou dont une case voisine dans la grille (les 8 autour, diagonales comprises) n'a pas
  // la même action majoritaire. Ce sont les décisions où l'on se trompe, loin des mains évidentes.
  // pool (optionnel) : seules mains possibles dans le spot (défense vs 3bet : mains ouvertes) ; les
  // cases hors pool ne sont ni retenues ni comparées.
  function borderHands(freqs, pool = null) {
    const withFold = (h) => {
      const f = freqs(h);
      return Object.assign({ fold: Math.max(0, 1 - Object.values(f).reduce((a, b) => a + b, 0)) }, f);
    };
    const main = (h) => {
      const f = withFold(h);
      return Object.keys(f).reduce((a, b) => (f[b] > f[a] ? b : a));
    };
    const mixed = (h) => Object.values(withFold(h)).some((v) => v > 0.001 && v < 0.999);
    const out = [];
    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 13; c++) {
        const h = handAt(r, c);
        if (pool && !pool.has(h)) continue;
        const m = main(h);
        const edge = [-1, 0, 1].flatMap((di) => [-1, 0, 1].map((dj) => [r + di, c + dj]))
          .some(([i, j]) => i >= 0 && i < 13 && j >= 0 && j < 13 &&
            (!pool || pool.has(handAt(i, j))) && main(handAt(i, j)) !== m);
        if (edge || mixed(h)) out.push(h);
      }
    }
    return out;
  }

  // Situations d'un type de question restreintes au profil choisi dans le sous-menu (null = tous
  // les profils), à la position du héros verrouillée en cliquant sur son siège (state.drillHero,
  // null = toutes) et au vilain verrouillé en cliquant sur le sien (state.drillVillain, même format
  // que la question : position, ou « ouvreur+caller » pour le squeeze ; null = tous).
  // profileIds : profils acceptés (null = tous), voir drillProfileIds.
  function drillSituationsFor(kind, profileIds, hero = state.drillHero, villain = state.drillVillain) {
    return drillSituations(kind).filter((s) =>
      (!profileIds || profileIds.some((id) => s.byProfile[id])) && (!hero || s.hero === hero) &&
      (!villain || s.villain === villain));
  }

  // Profils couverts par le choix du sous-menu (null = tous les profils).
  const drillProfileIds = (profile) => (profile ? [profile] : null);

  // Clic sur le siège du héros pendant le drill : verrouille / déverrouille sa position.
  // La question en cours ne change pas ; le verrou s'applique aux suivantes.
  function toggleDrillLock() {
    state.drillHero = state.drillHero ? null : state.hero;
    renderTable();
  }

  // Positions des vilains de la question en cours (ouvreur et caller pour le squeeze).
  const drillQuestionVillains = () => (drillQuestion && drillQuestion.villain ? drillQuestion.villain.split('+') : []);

  // Clic sur le siège d'un vilain de la question pendant le drill : verrouille / déverrouille le
  // vilain (les deux sièges ensemble pour le squeeze). Combinable avec le verrou du héros, ex.
  // BB vs BU ; le verrou s'applique aux questions suivantes (l'open n'a pas de vilain, il en sort).
  function toggleDrillVillainLock() {
    state.drillVillain = state.drillVillain ? null : drillQuestion.villain;
    renderTable();
  }

  // Clic sur le profil actif pendant le drill : verrouille / déverrouille le profil (sans effet si
  // le sous-menu du drill impose déjà un profil, alors affiché verrouillé).
  function toggleDrillProfileLock() {
    if (state.drillProfile) return;
    state.drillProfileLock = state.drillProfileLock ? null : drillQuestion.profile;
    renderProfiles();
  }

  // Types de question d'un mode du menu ('all' = tous).
  const drillKinds = (mode) => (mode === 'all' ? Object.keys(DRILL_KINDS) : [mode]);

  // Profils proposés dans le sous-menu d'un mode : ceux qui ont au moins une range interrogeable.
  function drillProfiles(mode) {
    return PROFILES.filter((p) => drillKinds(mode).some((k) => drillSituationsFor(k, drillProfileIds(p.id), null, null).length));
  }

  function newDrillQuestion() {
    let ids = drillProfileIds(state.drillProfile || state.drillProfileLock);
    let kinds = drillKinds(state.drill).filter((k) => drillSituationsFor(k, ids).length);
    // Verrous devenus impossibles à satisfaire (ex. changement de format) : on les libère.
    if (!kinds.length) {
      state.drillHero = state.drillVillain = state.drillProfileLock = null;
      ids = drillProfileIds(state.drillProfile);
      kinds = drillKinds(state.drill).filter((k) => drillSituationsFor(k, ids).length);
    }
    const kind = pick(kinds);
    const { hero, villain, byProfile } = pick(drillSituationsFor(kind, ids));
    const profile = pick(PROFILES.map((p) => p.id).filter((id) => byProfile[id] && (!ids || ids.includes(id))));
    const strat = buildStrategy(byProfile[profile]);
    // Fréquences par réponse proposée (actions de la range regroupées, voir DRILL_KINDS).
    const { answers, groups } = drillAnswerSet(kind, byProfile[profile]);
    const freqsOf = (h) => {
      const out = {};
      Object.entries(groups).forEach(([answer, acts]) => { out[answer] = acts.reduce((t, a) => t + (strat[h][a] || 0), 0); });
      return out;
    };
    // Défense vs 3bet : seules les mains de la range d'open du héros arrivent dans ce spot.
    let pool = null;
    if (kind === 'vs3bet') {
      const openStrat = heroOpenStrategy(profile, hero);
      if (openStrat) pool = new Set(allHands().filter((h) => openStrat[h].fold < 0.999));
    }
    const candidates = pool ? [...pool] : allHands();
    const border = borderHands(freqsOf, pool);
    const hand = pickWeightedHand(border.length && Math.random() < DRILL_BORDER_SHARE ? border : candidates);
    // Réponse de référence = la plus fréquente (sert au journal des confusions) ; toute réponse
    // jouée à une fréquence > 0 compte comme juste (voir drillVerdict).
    const freqs = freqsOf(hand);
    const all = withFoldFreq(freqs);
    const correct = Object.keys(all).reduce((a, b) => (all[b] > all[a] ? b : a));
    state.hero = hero;
    state.profile = profile;
    state.villain = drillVillains(kind, villain);
    drillQuestion = { kind, villain, hero, profile, hand, correct, answers, groups, freqs: withFoldFreq(freqs), spot: byProfile[profile], mix: strat[hand] };
    drillAnswered = false;
    renderDrillButtons();
  }

  // Ajoute la fréquence du fold (le reste) aux fréquences des réponses proposées.
  function withFoldFreq(freqs) {
    const sum = Object.values(freqs).reduce((a, b) => a + b, 0);
    return Object.assign({ fold: Math.max(0, 1 - sum) }, freqs);
  }

  function renderDrillButtons() {
    $('#drill-next').hidden = true;
    $('#drill-feedback').textContent = '';
    $('#drill-feedback').className = 'drill-feedback';
    clearDrillFx();
    const cls = { '3bet': 'threebet', '4bet': 'fourbet', '3blin': 'threebet-lin', '3bpol': 'threebet-pol' };
    $('#drill-actions').innerHTML = drillQuestion.answers.map((a) =>
      '<button class="drill-btn ' + (cls[a] || a) + '" type="button" data-answer="' + a + '">' +
      answerLabel(a, drillQuestion).toUpperCase() +
      (answerSizing(a, drillQuestion) ? ' <span class="sz">' + answerSizing(a, drillQuestion) + '</span>' : '') +
      '</button>').join('');
  }

  const SUITS = [{ s: '♠', color: 'black' }, { s: '♥', color: 'red' }, { s: '♦', color: 'blue' }, { s: '♣', color: 'green' }];

  function randomSuits(n) {
    const idx = [0, 1, 2, 3];
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx.slice(0, n).map((i) => SUITS[i]);
  }

  // Cartes à afficher pour une main donnée (couleurs tirées au hasard à chaque question).
  function drillCards(hand) {
    const r1 = hand[0], r2 = hand[1];
    if (r1 === r2) {
      const [a, b] = randomSuits(2);
      return [{ r: r1, suit: a }, { r: r2, suit: b }];
    }
    if (hand[2] === 's') {
      const [a] = randomSuits(1);
      return [{ r: r1, suit: a }, { r: r2, suit: a }];
    }
    const [a, b] = randomSuits(2);
    return [{ r: r1, suit: a }, { r: r2, suit: b }];
  }

  function renderDrillCards() {
    if (!drillQuestion) return;
    drillCards(drillQuestion.hand).forEach((c, i) => {
      const el = $('#drill-card-' + (i + 1));
      el.textContent = c.r + c.suit.s;
      ['red', 'blue', 'green'].forEach((k) => el.classList.toggle(k, c.suit.color === k));
    });
  }

  function renderDrillScore() {
    $('#drill-score').textContent = 'Main ' + Math.min(drillStats.total + (drillAnswered ? 0 : 1), DRILL_LENGTH) +
      ' / ' + DRILL_LENGTH + ' · ' + drillStats.correct + ' bonne' + (drillStats.correct > 1 ? 's' : '') + ' réponse' +
      (drillStats.correct > 1 ? 's' : '');
  }

  // Verdict d'une réponse selon la fréquence de la main pour cette réponse : 100 % = juste (vert),
  // fréquence mixte (ex. combo à 50 %) = juste aussi mais en jaune, 0 % = erreur (rouge).
  const MIX_EPS = 0.001;
  const drillVerdict = (q, action) => {
    const f = q.freqs[action] || 0;
    return f >= 1 - MIX_EPS ? 'ok' : f > MIX_EPS ? 'mix' : 'ko';
  };

  function answerDrill(action) {
    if (!drillQuestion) return;
    const q = drillQuestion;
    const verdict = drillVerdict(q, action);
    const ok = verdict !== 'ko';
    recordDrillAnswer(q, action, ok);
    drillStats.total++;
    if (ok) drillStats.correct++;
    drillSession.push({ q, action, verdict });
    drillAnswered = true;

    // Réponses jouées par la stratégie, de la plus fréquente à la moins fréquente.
    const played = q.answers.filter((a) => (q.freqs[a] || 0) > MIX_EPS)
      .sort((a, b) => q.freqs[b] - q.freqs[a]);
    const mixText = played.map((a) => answerText(a, q).toLowerCase() + ' ' + Math.round(q.freqs[a] * 100) + ' %').join(' / ');
    const feedback = $('#drill-feedback');
    feedback.textContent = verdict === 'ok' ? 'Correct !'
      : verdict === 'mix' ? 'Main mixte : ' + mixText
      : played.length > 1 ? 'Perdu — main mixte : ' + mixText
      : 'Perdu — la bonne réponse était ' + answerText(played[0], q).toLowerCase() + '.';
    feedback.className = 'drill-feedback ' + { ok: 'correct', mix: 'mixed', ko: 'wrong' }[verdict];
    document.querySelectorAll('.drill-btn').forEach((b) => {
      b.disabled = true;
      b.classList.toggle('given', b.dataset.answer === action);
      b.classList.toggle('expected', played.includes(b.dataset.answer));
    });
    animateHeroAnswer(action, q);
    $('.panel').classList.add('drill-' + verdict);
    renderGrid();
    renderDrillScore();
    // L'utilisateur passe lui-même à la question suivante (bouton Suivant, Entrée ou Espace) ;
    // après la dernière main de la série, le bouton ouvre les résultats.
    const next = $('#drill-next');
    next.textContent = drillStats.total >= DRILL_LENGTH ? 'Résultats' : 'Suivant';
    next.hidden = false;
    next.focus();
  }

  /* Animations de la réponse : jeton du héros vers la table (relance ou call, avec le montant),
     cartes jetées vers le centre (fold ; rien sur un check). Le jeton reste posé jusqu'à la
     question suivante. */

  function clearDrillFx() {
    tableEl.querySelectorAll('.fx-bet, .fx-card').forEach((el) => el.remove());
    $('.panel').classList.remove('drill-ok', 'drill-mix', 'drill-ko');
  }

  // Montant misé par la réponse : call = mise à suivre ; relance = taille de la variante que la
  // main joue le plus (ex. 3b polarisé 13 plutôt que linéaire 11), « AI » pour le 4bet all-in.
  function answerAmount(a, q) {
    if (a === 'call') return fmt(tableLevel);
    const acts = (q.groups[a] || []).filter((x) => q.spot.actions[x]);
    if (!acts.length) return fmt(q.spot.size);
    const best = acts.reduce((x, y) => ((q.mix[y] || 0) > (q.mix[x] || 0) ? y : x));
    if (best === 'jam') return 'AI';
    return fmt((q.spot.sizes && q.spot.sizes[best]) || q.spot.size);
  }

  function animateHeroAnswer(a, q) {
    clearDrillFx();
    const [x, y] = seatXY(q.hero);
    const place = (el, px, py) => { el.style.left = px + '%'; el.style.top = py + '%'; };
    if (a === 'fold') {
      if (answerLabel(a, q) !== 'Fold') return; // check de la BB : pas de carte jetée
      [-1, 1].forEach((side) => {
        const card = document.createElement('div');
        card.className = 'fx-card';
        card.style.setProperty('--rot', side * 8 + 'deg');
        place(card, x + side * 1.2, y - 9);
        tableEl.appendChild(card);
        card.getBoundingClientRect(); // fixe la position de départ avant la transition
        card.classList.add('go');
        card.style.setProperty('--rot', side * 160 + 'deg');
        place(card, lerp(x, CENTER[0], 0.75) + side * 3, lerp(y, CENTER[1], 0.75));
        setTimeout(() => card.remove(), 800);
      });
      return;
    }
    const bet = document.createElement('div');
    bet.className = 'bet fx-bet';
    bet.innerHTML = '<span class="chip"></span><span class="amt"></span>';
    bet.querySelector('.chip').style.background = window.ACTIONS[a].color;
    bet.querySelector('.amt').textContent = answerAmount(a, q);
    place(bet, x, y - 4);
    tableEl.appendChild(bet);
    bet.getBoundingClientRect();
    bet.classList.add('show');
    place(bet, lerp(x, CENTER[0], 0.42), lerp(y, CENTER[1], 0.42));
  }

  function nextDrillQuestion() {
    if (!state.drill || !drillAnswered) return;
    if (drillStats.total >= DRILL_LENGTH) { finishDrill(); return; }
    newDrillQuestion();
    render();
  }

  /* ---------- Fin de série : score et erreurs ---------- */

  // Fin des DRILL_LENGTH mains : mémorise le résultat, arrête le drill et ouvre la fenêtre.
  function finishDrill() {
    lastDrillResult = { mode: state.drill, profile: state.drillProfile, answers: drillSession };
    $('#drill-menu .drill-last').hidden = false;
    setDrill(null);
    openResults();
  }

  function openResults() {
    if (!lastDrillResult) return;
    $('#drill-menu').hidden = true;
    closeDrillSubmenus();
    renderResults();
    $('#results-modal').hidden = false;
  }

  function closeResults() {
    $('#results-modal').hidden = true;
  }

  function renderResults() {
    const { mode, profile, answers } = lastDrillResult;
    const n = answers.length;
    const count = (v) => answers.filter((a) => a.verdict === v).length;
    const ok = count('ok'), mix = count('mix'), ko = count('ko');
    $('#results-title').textContent = 'Résultat · ' + DRILL_MODES.find((m) => m.id === mode).label +
      (profile ? ' · ' + profileOf(profile).label : '');

    // Score par thème (seulement si la série mélange plusieurs types de question).
    const byKind = {};
    answers.forEach(({ q, verdict }) => {
      const k = byKind[q.kind] || (byKind[q.kind] = { n: 0, ok: 0 });
      k.n++;
      if (verdict !== 'ko') k.ok++;
    });
    const kindRows = Object.keys(byKind).length > 1
      ? DRILL_MODES.filter((m) => byKind[m.id]).map((m) => '<tr><td>' + m.label + '</td>' +
        '<td class="num">' + byKind[m.id].ok + ' / ' + byKind[m.id].n + '</td>' +
        '<td class="num">' + pct(byKind[m.id].ok, byKind[m.id].n) + '</td></tr>').join('')
      : '';

    // Erreurs dans l'ordre de la série, avec la stratégie de la main.
    const errorRows = answers.map((a, i) => Object.assign({ i }, a)).filter((a) => a.verdict === 'ko')
      .map(({ i, q, action }) => {
        const strat = q.answers.filter((x) => (q.freqs[x] || 0) > MIX_EPS)
          .sort((x, y) => q.freqs[y] - q.freqs[x])
          .map((x) => answerLabel(x, q) + (q.freqs[x] < 1 - MIX_EPS ? ' ' + Math.round(q.freqs[x] * 100) + ' %' : ''))
          .join(' / ');
        const key = [q.kind, q.hero, q.villain || '', q.profile, q.hand].join('|');
        return '<tr class="errors-hand" data-key="' + key + '"><td class="num muted">' + (i + 1) + '</td>' +
          '<td class="hand">' + q.hand + '</td><td>' + drillSpotLabel(q) + ' ' + profileBadge(q.profile) + '</td>' +
          '<td>' + answerLabel(action, q) + '</td><td>' + strat + '</td></tr>';
      }).join('');

    const score = n ? Math.round(((ok + mix) / n) * 100) : 0;
    $('#results-body').innerHTML =
      '<div class="results-score ' + (score >= 90 ? 'good' : score >= 75 ? 'fair' : 'bad') + '">' + score + ' %</div>' +
      '<p class="results-summary"><b>' + (ok + mix) + '</b> bonnes réponses sur <b>' + n + '</b>' +
      (mix ? ' <span class="muted">(dont ' + mix + ' sur une main mixte)</span>' : '') +
      ' · <b>' + ko + '</b> erreur' + (ko > 1 ? 's' : '') + '</p>' +
      (kindRows ? '<h3>Score par thème</h3><table class="errors-table"><thead><tr><th>Thème</th>' +
        '<th class="num">Justes</th><th class="num">Score</th></tr></thead><tbody>' + kindRows + '</tbody></table>' : '') +
      (errorRows
        ? '<h3>Erreurs <span class="muted">(clic : voir la range)</span></h3><table class="errors-table"><thead><tr>' +
          '<th class="num">#</th><th>Main</th><th>Spot</th><th>Ta réponse</th><th>Stratégie</th></tr></thead><tbody>' +
          errorRows + '</tbody></table>'
        : '<p class="muted">Aucune erreur, bravo !</p>');
  }

  function bindResults() {
    $('#results-close').addEventListener('click', closeResults);
    $('#results-modal').addEventListener('click', (e) => { if (e.target.id === 'results-modal') closeResults(); });
    $('#results-body').addEventListener('click', (e) => {
      const row = e.target.closest('.errors-hand');
      if (!row) return;
      closeResults();
      showErrorHand(row.dataset.key);
    });
    $('#results-again').addEventListener('click', () => {
      closeResults();
      setDrill(lastDrillResult.mode, lastDrillResult.profile);
    });
  }

  // Bouton Drill : ouvre le menu des modes, ou arrête le drill en cours.
  function toggleDrill(e) {
    e.stopPropagation();
    hideMenu();
    if (state.drill) { setDrill(null); return; }
    $('#drill-menu').hidden = !$('#drill-menu').hidden;
    closeDrillSubmenus();
  }

  function setDrill(mode, profile = null) {
    state.drill = mode;
    state.drillProfile = mode ? profile : null;
    state.drillHero = null;
    state.drillVillain = null;
    state.drillProfileLock = null;
    $('#drill-menu').hidden = true;
    closeDrillSubmenus();
    clearDrillFx();
    const btn = $('#drill-toggle');
    btn.classList.toggle('active', !!mode);
    btn.textContent = mode
      ? 'Drill · ' + DRILL_MODES.find((m) => m.id === mode).label + (profile ? ' · ' + profileOf(profile).label : '')
      : 'Drill';
    $('#drill-feedback').textContent = '';
    $('#drill-feedback').className = 'drill-feedback';
    if (mode) {
      drillStats = { correct: 0, total: 0 };
      drillSession = [];
      newDrillQuestion();
    } else {
      drillQuestion = null;
    }
    render();
  }

  function closeDrillSubmenus() {
    document.querySelectorAll('.drill-item.open').forEach((el) => el.classList.remove('open'));
  }

  // Menu Drill : chaque mode ouvre (survol ou clic) un sous-menu « Tous profils » + les profils
  // qui ont une range pour ce mode ; choisir une entrée lance le drill.
  function buildDrillMenu() {
    const menu = $('#drill-menu');
    const button = (text, onClick) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
      return b;
    };
    DRILL_MODES.forEach(({ id, label }) => {
      const item = document.createElement('div');
      item.className = 'drill-item';
      const head = button(label, () => {
        const wasOpen = item.classList.contains('open');
        closeDrillSubmenus();
        item.classList.toggle('open', !wasOpen);
      });
      head.className = 'drill-mode';
      const sub = document.createElement('div');
      sub.className = 'drill-sub';
      sub.appendChild(button('Tous profils', () => setDrill(id)));
      drillProfiles(id).forEach((p) => {
        const b = button(p.label, () => setDrill(id, p.id));
        b.style.setProperty('--pc', p.color);
        b.classList.add('drill-profile');
        sub.appendChild(b);
      });
      item.append(head, sub);
      menu.appendChild(item);
    });
    const last = button('Dernier résultat', openResults);
    last.className = 'drill-errors drill-last';
    last.hidden = true;
    menu.appendChild(last);
    const errors = button('Erreurs', openErrors);
    errors.className = 'drill-errors';
    menu.appendChild(errors);
  }

  /* ---------- Journal des erreurs du drill ---------- */

  // Chaque réponse du drill est cumulée dans localStorage (propre à ce navigateur), par question :
  // clé « type|héros|ouvreur|profil|main » -> { n: réponses, w: erreurs, mix: erreurs où la réponse
  // donnée avait quand même une fréquence > 0 (main mixte, souvent juste le tirage),
  // m: { 'donnée>attendue': nombre } }.
  const DRILL_LOG_KEY = 'rpok.drillLog.v1';

  function loadDrillLog() {
    try { return JSON.parse(localStorage.getItem(DRILL_LOG_KEY)) || {}; } catch (e) { return {}; }
  }

  function saveDrillLog(log) {
    try { localStorage.setItem(DRILL_LOG_KEY, JSON.stringify(log)); } catch (e) { /* stockage indisponible */ }
  }

  // ok = réponse jouée à une fréquence > 0 (voir drillVerdict) : seules les autres sont des
  // erreurs. « mix » ne compte plus que les erreurs enregistrées avant cette règle.
  function recordDrillAnswer(q, action, ok) {
    const log = loadDrillLog();
    const key = [q.kind, q.hero, q.villain || '', q.profile, q.hand].join('|');
    const e = log[key] || (log[key] = { n: 0, w: 0, mix: 0, m: {} });
    e.n++;
    if (!ok) {
      e.w++;
      const k = action + '>' + q.correct;
      e.m[k] = (e.m[k] || 0) + 1;
    }
    saveDrillLog(log);
  }

  // Entrées du journal, filtrées par type de question ('all' ou une clé de DRILL_KINDS) et par
  // profil. Les réponses 3b de BB enregistrées avant le mode « Def BB » y sont rangées.
  function drillLogEntries(mode, profile) {
    return Object.entries(loadDrillLog()).map(([key, e]) => {
      const [k, hero, villain, prof, hand] = key.split('|');
      const kind = k === 'threebet' && hero === 'BB' ? 'bbdef' : k;
      return Object.assign({ key, kind, hero, villain: villain || null, profile: prof, hand }, e);
    }).filter((e) => profileOf(e.profile) && DRILL_KINDS[e.kind] && (mode === 'all' || e.kind === mode) &&
      (!profile || e.profile === profile));
  }

  const DRILL_SPOT_NAMES = { threebet: '3bet', bbdef: 'Def BB', vs3bet: 'Def vs 3bet', squeeze: 'Squeeze', iso: 'Iso sur limp' };
  const drillSpotLabel = (e) => (e.kind === 'open' ? e.hero + ' – Open'
    : e.hero + ' vs ' + e.villain.replace('+', ' + ') + ' – ' + DRILL_SPOT_NAMES[e.kind]);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0) + ' %';
  const profileBadge = (id) =>
    '<span class="profile-badge" style="--pc:' + profileOf(id).color + '">' + profileOf(id).label + '</span>';

  // Confusion la plus fréquente d'une main, ex. « Fold au lieu de Raise ».
  function mainMistake(e) {
    const top = Object.entries(e.m).sort((a, b) => b[1] - a[1])[0];
    if (!top) return '';
    const [given, correct] = top[0].split('>');
    return answerLabel(given, e) + ' au lieu de ' + answerLabel(correct, e);
  }

  // Filtres de la fenêtre des erreurs (thème du drill + profil).
  const errorsView = { mode: 'all', profile: null };

  function renderErrors() {
    document.querySelectorAll('#errors-modes button').forEach((b) =>
      b.classList.toggle('active', b.dataset.mode === errorsView.mode));
    const entries = drillLogEntries(errorsView.mode, errorsView.profile);
    const total = entries.reduce((t, e) => t + e.n, 0);
    const wrong = entries.reduce((t, e) => t + e.w, 0);
    const mix = entries.reduce((t, e) => t + e.mix, 0);
    const body = $('#errors-body');
    if (!total) {
      body.innerHTML = '<p class="muted">Aucune réponse enregistrée pour ce filtre : lance un drill pour remplir le journal.</p>';
      return;
    }

    // Cumul par spot (type + héros + ouvreur + profil).
    const spots = {};
    entries.forEach((e) => {
      const k = [e.kind, e.hero, e.villain, e.profile].join('|');
      const s = spots[k] || (spots[k] = { kind: e.kind, hero: e.hero, villain: e.villain, profile: e.profile, n: 0, w: 0 });
      s.n += e.n;
      s.w += e.w;
    });
    const spotRows = Object.values(spots).filter((s) => s.w)
      .sort((a, b) => b.w - a.w || b.w / b.n - a.w / a.n)
      .map((s) => '<tr><td>' + drillSpotLabel(s) + '</td><td>' + profileBadge(s.profile) + '</td>' +
        '<td class="num">' + s.w + ' / ' + s.n + '</td><td class="num">' + pct(s.w, s.n) + '</td></tr>').join('');

    // Mains les plus ratées : d'abord les vraies erreurs (hors main mixte), puis le total.
    const handRows = entries.filter((e) => e.w)
      .sort((a, b) => (b.w - b.mix) - (a.w - a.mix) || b.w - a.w || b.w / b.n - a.w / a.n)
      .slice(0, 40)
      .map((e) => '<tr class="errors-hand" data-key="' + e.key + '">' +
        '<td class="hand">' + e.hand + '</td><td>' + drillSpotLabel(e) + ' ' + profileBadge(e.profile) + '</td>' +
        '<td>' + mainMistake(e) + '</td>' +
        '<td class="num">' + e.w + ' / ' + e.n +
        (e.mix ? ' <span class="muted" title="Erreurs où la réponse donnée fait aussi partie de la stratégie (main mixte)">(' +
          e.mix + ' mixte' + (e.mix > 1 ? 's' : '') + ')</span>' : '') + '</td></tr>').join('');

    body.innerHTML =
      '<p class="errors-summary"><b>' + wrong + '</b> erreurs sur <b>' + total + '</b> réponses (' + pct(wrong, total) + ')' +
      (mix ? ' <span class="muted">· dont ' + mix + ' sur une main mixte (réponse jouée à une fréquence &gt; 0)</span>' : '') + '</p>' +
      (spotRows
        ? '<h3>Spots les plus ratés</h3><table class="errors-table"><thead><tr><th>Spot</th><th>Profil</th>' +
          '<th class="num">Erreurs</th><th class="num">Taux</th></tr></thead><tbody>' + spotRows + '</tbody></table>' +
          '<h3>Mains les plus ratées <span class="muted">(clic : voir la range)</span></h3><table class="errors-table">' +
          '<thead><tr><th>Main</th><th>Spot</th><th>Erreur type</th><th class="num">Erreurs</th></tr></thead><tbody>' +
          handRows + '</tbody></table>'
        : '<p class="muted">Aucune erreur pour ce filtre.</p>');
  }

  function openErrors() {
    $('#drill-menu').hidden = true;
    closeDrillSubmenus();
    const sel = $('#errors-profile');
    const used = new Set(drillLogEntries('all', null).map((e) => e.profile));
    if (errorsView.profile && !used.has(errorsView.profile)) errorsView.profile = null;
    sel.innerHTML = '<option value="">Tous profils</option>' + PROFILES.filter((p) => used.has(p.id))
      .map((p) => '<option value="' + p.id + '">' + p.label + '</option>').join('');
    sel.value = errorsView.profile || '';
    $('#errors-modal').hidden = false;
    renderErrors();
  }

  function closeErrors() {
    $('#errors-modal').hidden = true;
  }

  // Clic sur une main ratée : affiche la range de son spot (hors drill) avec le détail de la main.
  function showErrorHand(key) {
    const [kind, hero, villain, profile, hand] = key.split('|');
    closeErrors();
    if (state.drill) setDrill(null);
    if (!POSITIONS.includes(hero)) setFormat('9max');
    state.hero = hero;
    state.villain = drillVillains(kind, villain);
    state.profile = profile;
    state.hovered = hand;
    hideMenu();
    render();
  }

  function bindErrors() {
    $('#errors-close').addEventListener('click', closeErrors);
    $('#errors-modal').addEventListener('click', (e) => { if (e.target.id === 'errors-modal') closeErrors(); });
    $('#errors-modes').innerHTML = DRILL_MODES.map((m) =>
      '<button type="button" data-mode="' + m.id + '">' + m.label + '</button>').join('');
    $('#errors-modes').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-mode]');
      if (!b) return;
      errorsView.mode = b.dataset.mode;
      renderErrors();
    });
    $('#errors-profile').addEventListener('change', (e) => {
      errorsView.profile = e.target.value || null;
      renderErrors();
    });
    $('#errors-body').addEventListener('click', (e) => {
      const row = e.target.closest('.errors-hand');
      if (row) showErrorHand(row.dataset.key);
    });
    $('#errors-reset').addEventListener('click', () => {
      if (!confirm('Effacer tout le journal des erreurs du drill ?')) return;
      saveDrillLog({});
      openErrors();
    });
  }

  /* ---------- Interactions ---------- */

  function hover(h) {
    state.hovered = h;
    renderHover();
  }

  function selectHero(pos) {
    state.hero = pos;
    state.villain = {};
    hideMenu();
    render();
  }

  function selectProfile(id) {
    state.profile = id;
    render();
  }

  function renderPositionsNav() {
    document.querySelectorAll('.positions button[data-pos]').forEach((b) => {
      b.classList.toggle('active', b.dataset.pos === state.hero);
      b.disabled = state.drill;
    });
  }

  // Décale le bouton Drill (reste dans le nav des positions, jamais déplacé) pour que son bord
  // gauche coïncide avec celui de la grille de range, quelle que soit sa largeur réelle ; le bouton
  // switch de format s'aligne de même sur le bord droit du panneau.
  function positionDrillToggle() {
    const btn = $('#drill-toggle');
    if (getComputedStyle(btn).position !== 'absolute') return;
    const navRect = $('#positions').getBoundingClientRect();
    const gridRect = gridEl.getBoundingClientRect();
    btn.style.left = (gridRect.left - navRect.left) + 'px';
    $('#drill-menu').style.left = btn.style.left;
    const sw = $('#format-switch');
    const panelRect = $('.panel').getBoundingClientRect();
    sw.style.left = (panelRect.right - navRect.left - sw.offsetWidth) + 'px';
  }

  function render() {
    renderPositionsNav();
    renderTable();
    renderProfiles();
    renderGrid();
    renderPanel();
    positionDrillToggle();
  }

  // (Re)construit les boutons de position du format courant.
  function buildPositions(nav) {
    nav.querySelectorAll('button[data-pos]').forEach((b) => b.remove());
    nav.classList.toggle('nine', POSITIONS.length > 6);
    POSITIONS.forEach((pos) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.pos = pos;
      b.textContent = pos;
      b.addEventListener('click', () => selectHero(pos));
      nav.appendChild(b);
    });
  }

  /* ---------- Action des vilains (menu sur les sièges) ---------- */

  const menuEl = document.createElement('div');
  menuEl.className = 'seat-menu';
  menuEl.hidden = true;
  tableEl.appendChild(menuEl);
  let menuPos = null;

  function hideMenu() {
    menuEl.hidden = true;
    menuPos = null;
  }

  function toggleMenu(pos) {
    if (state.drill) return;
    if (pos === state.hero || pos === menuPos) { hideMenu(); return; }
    menuPos = pos;
    const current = state.villain[pos] || null;
    // 'raise' = ce vilain open : impossible si le héros a déjà parlé avant lui (héros = ouvreur
    // implicite) ou si un autre vilain avant lui a déjà raise (déjà un ouvreur).
    const raiseBefore = Object.entries(state.villain).some(([p, a]) => a === 'raise' && posIdx(p) < posIdx(pos));
    const alreadyOpened = posIdx(pos) > posIdx(state.hero) || raiseBefore;
    // '3bet' = le vilain 3bet l'open du héros : n'a de sens que si ce vilain parle après le héros.
    // 'limp' = personne n'a encore ouvert avant ce vilain (sinon il callerait/relancerait, pas limp).
    // 'call' = il y a déjà un open avant ce vilain (sinon rien à caller : limp est la bonne action).
    const actions = VILLAIN_ACTIONS.filter((a) =>
      (a !== '3bet' || posIdx(pos) > posIdx(state.hero)) &&
      (a !== 'raise' || !alreadyOpened) &&
      (a !== 'limp' || !alreadyOpened) &&
      (a !== 'call' || raiseBefore));
    menuEl.innerHTML = '';
    [null].concat(actions).forEach((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = a ? window.ACTIONS[a].label : 'Aucune';
      b.classList.toggle('active', a === current);
      if (a) {
        b.style.setProperty('--c', window.ACTIONS[a].color);
        if (window.ACTIONS[a].text) b.style.setProperty('--t', window.ACTIONS[a].text);
      }
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        setVillain(pos, a);
      });
      menuEl.appendChild(b);
    });

    const [x, y] = seatXY(pos);
    menuEl.style.left = x + '%';
    menuEl.style.top = y + '%';
    menuEl.dataset.v = y > 50 ? 'up' : 'down';
    menuEl.dataset.h = x < 30 ? 'right' : x > 70 ? 'left' : 'center';
    menuEl.hidden = false;
  }

  function setVillain(pos, act) {
    if (act) state.villain[pos] = act;
    else delete state.villain[pos];
    hideMenu();
    render();
  }

  document.addEventListener('click', (e) => {
    if (!menuEl.contains(e.target)) hideMenu();
    $('#drill-menu').hidden = true;
  });

  /* ---------- Profil de la table ---------- */

  const profileEls = {};

  function buildProfiles() {
    const list = $('#profile-list');
    PROFILES.forEach(({ id, label, color }) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.style.setProperty('--pc', color);
      b.textContent = label;
      b.addEventListener('click', () => (state.drill ? toggleDrillProfileLock() : selectProfile(id)));
      const lock = document.createElement('span');
      lock.className = 'lock';
      lock.setAttribute('aria-hidden', 'true');
      lock.innerHTML = LOCK_SVG;
      li.append(b, lock);
      list.appendChild(li);
      profileEls[id] = b;
    });
  }

  function renderProfiles() {
    const { profile, profiles } = currentSpot();
    PROFILES.forEach(({ id }) => {
      const b = profileEls[id];
      const active = id === profile;
      b.classList.toggle('active', active);
      b.parentElement.hidden = !profiles.includes(id);
      // Drill : seul le profil actif est cliquable, pour le verrouiller (cadenas à droite).
      const lockable = !!state.drill && active && !state.drillProfile;
      b.disabled = !!state.drill && !lockable;
      b.classList.toggle('lockable', lockable);
      b.parentElement.classList.toggle('locked', !!state.drill && active && !!(state.drillProfile || state.drillProfileLock));
      b.title = !state.drill ? '' : state.drillProfile && active ? 'Profil imposé par le menu du drill'
        : lockable ? (state.drillProfileLock ? 'Déverrouiller le profil' : 'Verrouiller le drill sur ce profil') : '';
    });
  }

  function bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { $('#drill-menu').hidden = true; closeErrors(); closeResults(); }
      if (state.drill) {
        if (e.key === 'Escape') hideMenu();
        if ((e.key === 'Enter' || e.key === ' ') && drillAnswered && $('#errors-modal').hidden) {
          e.preventDefault();
          nextDrillQuestion();
        }
        // Raccourcis de réponse : F = fold (check de la BB sur l'iso), C = call, R = relance (raise / 3bet / 4bet / squeeze / iso ;
        // la première proposée, donc le 3b liné quand la BB a deux variantes), L = 3b liné, P = 3b pola.
        const key = e.key.toLowerCase();
        if (['f', 'c', 'r', 'l', 'p'].includes(key) && !drillAnswered && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey
          && $('#errors-modal').hidden) {
          const btn = [...document.querySelectorAll('#drill-actions .drill-btn')].find((b) => {
            const a = b.dataset.answer;
            return key === 'f' ? a === 'fold' : key === 'c' ? a === 'call' : key === 'l' ? a === '3blin'
              : key === 'p' ? a === '3bpol' : a !== 'fold' && a !== 'call';
          });
          if (btn && !btn.disabled) { e.preventDefault(); answerDrill(btn.dataset.answer); }
        }
        return;
      }
      if (e.key === 'Escape') {
        hideMenu();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const n = POSITIONS.length;
        const i = posIdx(state.hero) + (e.key === 'ArrowRight' ? 1 : -1);
        selectHero(POSITIONS[(i + n) % n]);
      } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const { profile, profiles } = currentSpot();
        const next = profiles[profiles.indexOf(profile) + (e.key === 'ArrowDown' ? 1 : -1)];
        if (next) selectProfile(next);
      }
    });
  }

  /* ---------- Switch de format (9max / 6max) ---------- */

  const FORMAT_KEY = 'rpok.format';

  // Change le format de table : positions, sièges et boutons de position. Le héros garde sa
  // position si elle existe dans le nouveau format, sinon il passe sur la première.
  function setFormat(format) {
    state.format = format;
    POSITIONS = FORMATS[format];
    state.villain = {};
    if (!POSITIONS.includes(state.hero)) state.hero = POSITIONS[0];
    if (state.drillHero && !POSITIONS.includes(state.drillHero)) state.drillHero = null;
    if (state.drillVillain && !state.drillVillain.split('+').every((v) => POSITIONS.includes(v))) state.drillVillain = null;
    hideMenu();
    buildPositions($('#positions'));
    buildTable();
    document.querySelectorAll('#format-switch button').forEach((b) =>
      b.classList.toggle('active', b.dataset.format === format));
  }

  // Clic sur le switch : mémorise le format et réaffiche ; un drill en cours repart sur une
  // question du nouveau format (même mode et même profil).
  function switchFormat(format) {
    if (format === state.format) return;
    try { localStorage.setItem(FORMAT_KEY, format); } catch (e) { /* stockage indisponible */ }
    setFormat(format);
    if (state.drill) newDrillQuestion();
    render();
  }

  function bindFormatSwitch() {
    $('#format-switch').addEventListener('click', (e) => {
      e.stopPropagation();
      const b = e.target.closest('button[data-format]');
      if (b) switchFormat(b.dataset.format);
    });
  }

  $('#drill-toggle').addEventListener('click', toggleDrill);
  $('#drill-actions').addEventListener('click', (e) => {
    const b = e.target.closest('.drill-btn');
    if (b && !b.disabled) answerDrill(b.dataset.answer);
  });
  $('#drill-next').addEventListener('click', nextDrillQuestion);
  window.addEventListener('resize', positionDrillToggle);

  let savedFormat = null;
  try { savedFormat = localStorage.getItem(FORMAT_KEY); } catch (e) { /* stockage indisponible */ }
  setFormat(FORMATS[savedFormat] ? savedFormat : '6max');
  state.hero = POSITIONS[0];
  buildProfiles();
  buildDrillMenu();
  bindErrors();
  bindResults();
  bindFormatSwitch();
  buildGrid();
  bindKeys();
  selectHero(state.hero);

  // Debug (console) : rpokSkip(99) joue n mains au hasard dans le drill en cours (sans les
  // enregistrer dans le journal des erreurs) pour arriver directement près de la fin de série.
  window.rpokSkip = (n = DRILL_LENGTH - 1) => {
    if (!state.drill) return 'Lance d\'abord un drill.';
    n = Math.min(n, DRILL_LENGTH - 1 - drillStats.total);
    for (let i = 0; i < n; i++) {
      if (i || drillAnswered) newDrillQuestion();
      const q = drillQuestion;
      const action = pick(q.answers);
      const verdict = drillVerdict(q, action);
      drillStats.total++;
      if (verdict !== 'ko') drillStats.correct++;
      drillSession.push({ q, action, verdict });
    }
    newDrillQuestion();
    render();
    return drillStats.total + ' mains jouées.';
  };
})();
