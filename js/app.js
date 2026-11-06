(function () {
  'use strict';

  const RANKS = 'AKQJT98765432'.split('');
  const POSITIONS = ['LJ', 'HJ', 'CO', 'BU', 'SB', 'BB'];
  const TOTAL_COMBOS = 1326;

  // Emplacements des sièges sur la table (en % du conteneur), dans le sens horaire
  // en partant du héros en bas.
  const SLOTS = [[50, 80], [8, 66], [8, 28], [50, 12], [92, 28], [92, 66]];
  const CENTER = [50, 48];

  // Profils de joueurs à la table (voir CLAUDE.md), dans l'ordre du menu.
  const PROFILES = [
    { id: 'aggro', label: 'vs. aggro', color: '#22c7e0' },
    { id: 'gto', label: 'vs. reg', color: '#d92b2b' },
    { id: 'lin', label: 'vs. reg linéaire', color: '#f08a24' },
    { id: 'soft', label: 'vs. soft', color: '#7cc43a' },
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

  // Profils voisins : vs. soft (open LJ/HJ/CO) regroupe vs. passif et vs. nit, donc un choix
  // passif / nit retombe sur soft là où seul soft est défini.
  const PROFILE_ALIASES = { fish: 'soft', nit: 'soft' };

  // Profil réellement utilisé pour un spot : celui demandé, sinon son alias, sinon gto.
  function resolveProfile(byProfile, id) {
    if (byProfile[id]) return id;
    if (byProfile[PROFILE_ALIASES[id]]) return PROFILE_ALIASES[id];
    return byProfile.gto ? 'gto' : null;
  }


  // Actions qu'on peut donner à un vilain en cliquant sur son siège.
  const VILLAIN_ACTIONS = ['raise', 'call', '3bet', 'limp'];
  const EMPTY_SPOT = { size: 0, actions: {} };

  // villain : { position: 'raise' | 'call' | '3bet' } pour les vilains dont on a donné l'action.
  // drill : null (mode normal) ou mode choisi dans le menu Drill ('all' | 'open' | 'threebet').
  // drillProfile : profil imposé par le sous-menu du drill (null = tous les profils).
  const state = { hero: 'LJ', profile: 'gto', hovered: null, villain: {}, drill: null, drillProfile: null, drillHero: null };

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
  function heroOpenStrategy(profile) {
    const byProfile = window.RANGES.open[state.hero] || {};
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

  function buildTable() {
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
        if (state.drill) { if (pos === state.hero) toggleDrillLock(); return; }
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
  const seatXY = (pos) => SLOTS[(posIdx(pos) - posIdx(state.hero) + 6) % 6];

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
      pot += bet;

      seat.style.left = x + '%';
      seat.style.top = y + '%';
      seat.classList.toggle('hero', isHero);
      seat.classList.toggle('locked', isHero && !!state.drill && state.drillHero === pos);
      seat.classList.toggle('lockable', isHero && !!state.drill);
      seat.title = isHero && state.drill
        ? (state.drillHero ? 'Déverrouiller la position' : 'Verrouiller le drill sur cette position') : '';
      seat.classList.toggle('folded', folded);
      seat.querySelector('.stack').textContent = fmt(100 - bet) + ' BB';

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
  }

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

  /* ---------- Drill (entraînement à l'open et au 3bet) ---------- */

  // Modes du menu Drill ; 'all' mélange au hasard les questions des autres modes.
  const DRILL_MODES = [
    { id: 'all', label: 'ALL' },
    { id: 'open', label: 'Open' },
    { id: 'threebet', label: '3b' },
  ];
  // Réponses proposées selon le type de question (dans l'ordre des boutons).
  const DRILL_ANSWERS = { open: ['fold', 'raise'], threebet: ['fold', 'call', '3bet'] };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Situations interrogeables : { hero, villain, byProfile } pour chaque range définie
  // (open : BB ne peut pas ouvrir ; 3bet : chaque couple héros / ouvreur de RANGES.threebet).
  function drillSituations(kind) {
    if (kind === 'open') {
      return POSITIONS.filter((p) => window.RANGES.open[p])
        .map((hero) => ({ hero, villain: null, byProfile: window.RANGES.open[hero] }));
    }
    return Object.entries(window.RANGES.threebet).flatMap(([hero, byOpener]) =>
      Object.entries(byOpener).map(([villain, byProfile]) => ({ hero, villain, byProfile })));
  }

  let drillStats = { correct: 0, total: 0 };
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
  function borderHands(freqs) {
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
        const m = main(h);
        const edge = [-1, 0, 1].flatMap((di) => [-1, 0, 1].map((dj) => [r + di, c + dj]))
          .some(([i, j]) => i >= 0 && i < 13 && j >= 0 && j < 13 && main(handAt(i, j)) !== m);
        if (edge || mixed(h)) out.push(h);
      }
    }
    return out;
  }

  // Situations d'un type de question restreintes au profil choisi dans le sous-menu (null = tous
  // les profils) et à la position du héros verrouillée en cliquant sur son siège (state.drillHero,
  // null = toutes).
  // profileIds : profils acceptés (null = tous), voir drillProfileIds.
  function drillSituationsFor(kind, profileIds, hero = state.drillHero) {
    return drillSituations(kind).filter((s) =>
      (!profileIds || profileIds.some((id) => s.byProfile[id])) && (!hero || s.hero === hero));
  }

  // Drill Open : le sous-menu ne propose que vs. aggro, vs. reg et vs. soft, et « vs. soft »
  // regroupe tous les profils exploitants (soft, passif, nit, super nit). Les autres modes gardent
  // un choix par profil.
  const DRILL_MENU_PROFILES = { open: ['aggro', 'gto', 'soft'] };
  const DRILL_PROFILE_GROUPS = { open: { soft: ['soft', 'fish', 'nit', 'supernit'] } };

  // Profils couverts par le choix du sous-menu pour un mode (null = tous les profils).
  function drillProfileIds(mode, profile) {
    if (!profile) return null;
    return (DRILL_PROFILE_GROUPS[mode] || {})[profile] || [profile];
  }

  // Clic sur le siège du héros pendant le drill : verrouille / déverrouille sa position.
  // La question en cours ne change pas ; le verrou s'applique aux suivantes.
  function toggleDrillLock() {
    state.drillHero = state.drillHero ? null : state.hero;
    renderTable();
  }

  // Types de question d'un mode du menu ('all' = open + 3b).
  const drillKinds = (mode) => (mode === 'all' ? ['open', 'threebet'] : [mode]);

  // Profils proposés dans le sous-menu d'un mode : ceux qui ont au moins une range interrogeable.
  function drillProfiles(mode) {
    const menu = DRILL_MENU_PROFILES[mode];
    return PROFILES.filter((p) => (!menu || menu.includes(p.id)) &&
      drillKinds(mode).some((k) => drillSituationsFor(k, drillProfileIds(mode, p.id), null).length));
  }

  function newDrillQuestion() {
    const ids = drillProfileIds(state.drill, state.drillProfile);
    const kinds = drillKinds(state.drill).filter((k) => drillSituationsFor(k, ids).length);
    const kind = pick(kinds);
    const { hero, villain, byProfile } = pick(drillSituationsFor(kind, ids));
    const profile = pick(PROFILES.map((p) => p.id).filter((id) => byProfile[id] && (!ids || ids.includes(id))));
    const strat = buildStrategy(byProfile[profile]);
    // Fréquences par réponse proposée ; le 3bet / 5bet all-in compte comme un 3bet.
    const freqsOf = (h) => {
      const s = strat[h];
      return kind === 'open'
        ? { raise: s.raise || 0 }
        : { '3bet': ['5bet', '3bet', '3bvalue', '3blin', '3bpol'].reduce((t, a) => t + (s[a] || 0), 0), call: s.call || 0 };
    };
    const border = borderHands(freqsOf);
    const hand = pickWeightedHand(border.length && Math.random() < DRILL_BORDER_SHARE ? border : allHands());
    // Fréquence mixte : on tire la bonne réponse au prorata de la stratégie (ex. une main
    // ouverte à 50 % sera "raise" une fois sur deux).
    const freqs = freqsOf(hand);
    let r = Math.random();
    const correct = Object.keys(freqs).find((a) => (r -= freqs[a]) < 0) || 'fold';
    state.hero = hero;
    state.profile = profile;
    state.villain = villain ? { [villain]: 'raise' } : {};
    drillQuestion = { kind, villain, hero, profile, hand, correct, freqs: withFoldFreq(freqs) };
    drillAnswered = false;
    renderDrillButtons();
  }

  // Ajoute la fréquence du fold (le reste) aux fréquences des réponses proposées.
  function withFoldFreq(freqs) {
    const sum = Object.values(freqs).reduce((a, b) => a + b, 0);
    return Object.assign({ fold: Math.max(0, 1 - sum) }, freqs);
  }

  function renderDrillButtons() {
    $('#drill-actions').innerHTML = DRILL_ANSWERS[drillQuestion.kind].map((a) =>
      '<button class="drill-btn ' + (a === '3bet' ? 'threebet' : a) + '" type="button" data-answer="' + a + '">' +
      window.ACTIONS[a].label.toUpperCase() + '</button>').join('');
  }

  const SUITS = [{ s: '♠', color: 'black' }, { s: '♥', color: 'red' }, { s: '♦', color: 'red' }, { s: '♣', color: 'black' }];

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
      el.classList.toggle('red', c.suit.color === 'red');
    });
  }

  function renderDrillScore() {
    $('#drill-score').textContent = drillStats.correct + ' / ' + drillStats.total + ' bonnes réponses';
  }

  function answerDrill(action) {
    if (!drillQuestion) return;
    const ok = action === drillQuestion.correct;
    recordDrillAnswer(drillQuestion, action);
    drillStats.total++;
    if (ok) drillStats.correct++;
    drillAnswered = true;

    const feedback = $('#drill-feedback');
    feedback.textContent = ok ? 'Correct !' : 'Perdu — la bonne réponse était ' + window.ACTIONS[drillQuestion.correct].label.toLowerCase() + '.';
    feedback.className = 'drill-feedback ' + (ok ? 'correct' : 'wrong');
    document.querySelectorAll('.drill-btn').forEach((b) => { b.disabled = true; });
    renderGrid();
    renderDrillScore();

    const question = drillQuestion;
    setTimeout(() => {
      if (drillQuestion !== question) return; // drill arrêté ou relancé entre-temps
      newDrillQuestion();
      render();
      feedback.textContent = '';
      feedback.className = 'drill-feedback';
    }, 1800);
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
    $('#drill-menu').hidden = true;
    closeDrillSubmenus();
    const btn = $('#drill-toggle');
    btn.classList.toggle('active', !!mode);
    btn.textContent = mode
      ? 'Drill · ' + DRILL_MODES.find((m) => m.id === mode).label + (profile ? ' · ' + profileOf(profile).label : '')
      : 'Drill';
    $('#drill-feedback').textContent = '';
    $('#drill-feedback').className = 'drill-feedback';
    if (mode) {
      drillStats = { correct: 0, total: 0 };
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

  function recordDrillAnswer(q, action) {
    const log = loadDrillLog();
    const key = [q.kind, q.hero, q.villain || '', q.profile, q.hand].join('|');
    const e = log[key] || (log[key] = { n: 0, w: 0, mix: 0, m: {} });
    e.n++;
    if (action !== q.correct) {
      e.w++;
      if ((q.freqs[action] || 0) > 0.001) e.mix++;
      const k = action + '>' + q.correct;
      e.m[k] = (e.m[k] || 0) + 1;
    }
    saveDrillLog(log);
  }

  // Entrées du journal, filtrées par type de question ('all' | 'open' | 'threebet') et par profil.
  function drillLogEntries(mode, profile) {
    return Object.entries(loadDrillLog()).map(([key, e]) => {
      const [kind, hero, villain, prof, hand] = key.split('|');
      return Object.assign({ key, kind, hero, villain: villain || null, profile: prof, hand }, e);
    }).filter((e) => profileOf(e.profile) && (mode === 'all' || e.kind === mode) && (!profile || e.profile === profile));
  }

  const drillSpotLabel = (e) => (e.kind === 'open' ? e.hero + ' – Open' : e.hero + ' vs ' + e.villain + ' – 3bet');
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0) + ' %';
  const profileBadge = (id) =>
    '<span class="profile-badge" style="--pc:' + profileOf(id).color + '">' + profileOf(id).label + '</span>';

  // Confusion la plus fréquente d'une main, ex. « Fold au lieu de Raise ».
  function mainMistake(m) {
    const top = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    if (!top) return '';
    const [given, correct] = top[0].split('>');
    return window.ACTIONS[given].label + ' au lieu de ' + window.ACTIONS[correct].label;
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
        '<td>' + mainMistake(e.m) + '</td>' +
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
    state.hero = hero;
    state.villain = kind === 'threebet' ? { [villain]: 'raise' } : {};
    state.profile = profile;
    state.hovered = hand;
    hideMenu();
    render();
  }

  function bindErrors() {
    $('#errors-close').addEventListener('click', closeErrors);
    $('#errors-modal').addEventListener('click', (e) => { if (e.target.id === 'errors-modal') closeErrors(); });
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
  // gauche coïncide avec celui de la grille de range, quelle que soit sa largeur réelle.
  function positionDrillToggle() {
    const btn = $('#drill-toggle');
    if (getComputedStyle(btn).position !== 'absolute') return;
    const navRect = $('#positions').getBoundingClientRect();
    const gridRect = gridEl.getBoundingClientRect();
    btn.style.left = (gridRect.left - navRect.left) + 'px';
    $('#drill-menu').style.left = btn.style.left;
  }

  function render() {
    renderPositionsNav();
    renderTable();
    renderProfiles();
    renderGrid();
    renderPanel();
    positionDrillToggle();
  }

  function buildPositions(nav) {
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
      b.addEventListener('click', () => selectProfile(id));
      li.appendChild(b);
      list.appendChild(li);
      profileEls[id] = b;
    });
  }

  function renderProfiles() {
    const { profile, profiles } = currentSpot();
    PROFILES.forEach(({ id }) => {
      profileEls[id].classList.toggle('active', id === profile);
      profileEls[id].parentElement.hidden = !profiles.includes(id);
      profileEls[id].disabled = state.drill;
    });
  }

  function bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { $('#drill-menu').hidden = true; closeErrors(); }
      if (state.drill) { if (e.key === 'Escape') hideMenu(); return; }
      if (e.key === 'Escape') {
        hideMenu();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const i = posIdx(state.hero) + (e.key === 'ArrowRight' ? 1 : -1);
        selectHero(POSITIONS[(i + 6) % 6]);
      } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const { profile, profiles } = currentSpot();
        const next = profiles[profiles.indexOf(profile) + (e.key === 'ArrowDown' ? 1 : -1)];
        if (next) selectProfile(next);
      }
    });
  }

  $('#drill-toggle').addEventListener('click', toggleDrill);
  $('#drill-actions').addEventListener('click', (e) => {
    const b = e.target.closest('.drill-btn');
    if (b && !b.disabled) answerDrill(b.dataset.answer);
  });
  window.addEventListener('resize', positionDrillToggle);

  buildPositions($('#positions'));
  buildTable();
  buildProfiles();
  buildDrillMenu();
  bindErrors();
  buildGrid();
  bindKeys();
  selectHero(state.hero);
})();
