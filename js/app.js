(function () {
  'use strict';

  const RANKS = 'AKQJT98765432'.split('');
  const POSITIONS = ['LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
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


  // Actions qu'on peut donner à un vilain en cliquant sur son siège.
  const VILLAIN_ACTIONS = ['raise', 'call', '3bet', 'limp'];
  const EMPTY_SPOT = { size: 0, actions: {} };

  // villain : { position: 'raise' | 'call' | '3bet' } pour les vilains dont on a donné l'action.
  const state = { hero: 'LJ', profile: 'gto', hovered: null, villain: {}, drill: false };

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
    const profile = byProfile[state.profile] ? state.profile : (byProfile.gto ? 'gto' : profiles[0]);
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
          ['BB (×4,7)', '9,5 bb', '12 bb', '14 bb'],
        ],
      },
    },
    vs3bet: { title: 'Sizing 4bet', pair: ['IP (×2,2)', 'OOP (×2,7)'] },
    squeeze: { title: 'Sizing squeeze', pair: ['IP (×4,5)', 'OOP (×5)'] },
  };

  function renderSizingNote(cur) {
    const el = $('#sizing-note');
    const note = SIZING_NOTES[cur.kind];
    if (!note) { el.hidden = true; el.innerHTML = ''; return; }
    let html = '<h3>' + note.title + '</h3>';
    if (note.table) {
      html += '<table><thead><tr>' + note.table.head.map((h) => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' +
        note.table.rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') +
        '</tbody></table>';
    } else if (note.pair) {
      html += '<div class="sizing-pair">' + note.pair.map((c) => '<span>' + c + '</span>').join('') + '</div>';
    }
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

  function buildTable() {
    POSITIONS.forEach((pos) => {
      const seat = document.createElement('button');
      seat.className = 'seat';
      seat.type = 'button';
      seat.innerHTML =
        '<div class="plate"><span class="pos">' + pos + '</span><span class="stack"></span></div>' +
        '<div class="tag"></div>';
      seat.addEventListener('click', (e) => {
        e.stopPropagation();
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

      let act = null, amt = 0;
      if (isHero) {
        if (heroAct) [act, amt] = heroAct;
      } else if (state.villain[pos]) {
        act = state.villain[pos];
        amt = act === 'call' ? level : act === 'limp' ? 1 : level <= 1 ? openSize(pos) : level * 3;
      }
      if (act) level = Math.max(level, amt);
      const folded = !act && i < heroIdx;

      let bet = act ? amt : 0;
      if (!act && pos === 'SB') bet = 0.5;
      else if (!act && pos === 'BB') bet = 1;
      pot += bet;

      seat.style.left = x + '%';
      seat.style.top = y + '%';
      seat.classList.toggle('hero', isHero);
      seat.classList.toggle('folded', folded);
      seat.querySelector('.stack').textContent = fmt(100 - bet) + ' BB';

      const tag = seat.querySelector('.tag');
      tag.className = 'tag';
      tag.style.background = '';
      tag.style.color = '';
      if (folded) {
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

    const [bx, by] = seatXY('BTN');
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

  function background(s) {
    const stops = [];
    let acc = 0;
    actionOrder().forEach((a) => {
      const f = s[a] || 0;
      if (f <= 0) return;
      const color = window.ACTIONS[a].color;
      stops.push(color + ' ' + acc * 100 + '%', color + ' ' + (acc + f) * 100 + '%');
      acc += f;
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
    const { spot } = currentSpot();
    strategy = buildStrategy(spot);
    marks = buildMarks(spot);
    // Main interrogée dans le drill : entourée une fois la range révélée, pour la repérer.
    const highlight = (state.drill && drillAnswered && drillQuestion) ? drillQuestion.hand : null;
    Object.entries(cellEls).forEach(([h, cell]) => {
      cell.classList.toggle('drill-hit', h === highlight);
      if (state.drill && !drillAnswered) {
        cell.style.background = 'var(--surface-2)';
        cell.style.boxShadow = '';
        cell.classList.remove('out');
        return;
      }
      const s = strategy[h];
      const m = markOf(h);
      cell.style.background = background(s);
      let shadow = m ? 'inset 0 0 0 3px ' + window.MARKS[m].color : '';
      if (h === highlight) {
        const ring = '0 0 0 2px rgba(0,0,0,.65), 0 0 0 4px #ff2d2d';
        shadow = shadow ? shadow + ', ' + ring : ring;
      }
      cell.style.boxShadow = shadow;
      cell.classList.toggle('out', s.fold >= 0.999);
    });
  }

  function spotTitle(cur) {
    if (cur.kind === 'open') return state.hero + ' — Open';
    if (cur.kind === 'threebet') return state.hero + ' vs ' + cur.villain + ' — 3bet';
    if (cur.kind === 'vs3bet') return state.hero + ' vs ' + cur.villain + ' — Défense vs 3bet';
    if (cur.kind === 'iso') return state.hero + ' vs ' + cur.villain + ' — Iso sur limp';
    if (cur.kind === 'squeeze') return state.hero + ' vs ' + cur.villain + ' + ' + cur.caller + ' — Squeeze';
    return state.hero + ' — Spot non couvert';
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
    if (cur.kind === 'vs3bet') {
      return state.hero + ' ouvre à ' + fmt(openSize(state.hero)) + ' BB · ' + cur.villain + ' 3bet à ' +
        fmt(openSize(state.hero) * 3) + ' BB · 4bet à ' + fmt(cur.spot.size) + ' BB';
    }
    if (cur.kind === 'iso') return cur.villain + ' limp · iso à ' + fmt(cur.spot.size) + ' BB';
    if (cur.kind === 'squeeze') {
      return cur.villain + ' ouvre à ' + fmt(openSize(cur.villain)) + ' BB · ' + cur.caller + ' call · squeeze à ' +
        fmt(cur.spot.size) + ' BB';
    }
    return cur.villain + ' ouvre à ' + fmt(openSize(cur.villain)) + ' BB · 3bet à ' + fmt(cur.spot.size) + ' BB';
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
    const sub = $('#spot-sub');
    sub.classList.toggle('warn', cur.missing);
    sub.textContent = spotSub(cur);
    sub.hidden = !sub.textContent;
    renderSizingNote(cur);

    $('#legend').innerHTML = actionOrder().map((a) => {
      const act = window.ACTIONS[a];
      const label = ['raise', '3bet', '4bet', 'squeeze', 'iso'].includes(a) ? act.label + ' ' + fmt(spot.size) : act.label;
      return '<li><span class="sw" style="background:' + window.ACTIONS[a].color + '"></span>' +
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

  /* ---------- Drill (entraînement à l'open) ---------- */

  // Positions qui ont une range d'open (BB ne peut pas ouvrir).
  const openPositions = () => POSITIONS.filter((p) => window.RANGES.open[p]);

  let drillStats = { correct: 0, total: 0 };
  let drillQuestion = null;
  // true une fois la question courante répondue : affiche alors toute la range de l'exercice.
  let drillAnswered = false;

  // Tire une main au hasard pondérée par son nombre de combos (une main offsuit sort plus
  // souvent qu'une paire, comme à la table).
  function pickWeightedHand() {
    const hands = allHands();
    const weights = hands.map(combos);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < hands.length; i++) {
      r -= weights[i];
      if (r <= 0) return hands[i];
    }
    return hands[hands.length - 1];
  }

  function newDrillQuestion() {
    const positions = openPositions();
    const hero = positions[Math.floor(Math.random() * positions.length)];
    const byProfile = window.RANGES.open[hero];
    const profiles = PROFILES.map((p) => p.id).filter((id) => byProfile[id]);
    const profile = profiles[Math.floor(Math.random() * profiles.length)];
    const strat = buildStrategy(byProfile[profile]);
    const hand = pickWeightedHand();
    // Fréquence mixte : on tire la bonne réponse au prorata de la stratégie (ex. une main
    // ouverte à 50 % sera "raise" une fois sur deux).
    const correct = Math.random() < (strat[hand].raise || 0) ? 'raise' : 'fold';
    state.hero = hero;
    state.profile = profile;
    state.villain = {};
    drillQuestion = { hero, profile, hand, correct };
    drillAnswered = false;
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
    drillStats.total++;
    if (ok) drillStats.correct++;
    drillAnswered = true;

    const feedback = $('#drill-feedback');
    feedback.textContent = ok ? 'Correct !' : 'Perdu — la bonne réponse était ' + window.ACTIONS[drillQuestion.correct].label.toLowerCase() + '.';
    feedback.className = 'drill-feedback ' + (ok ? 'correct' : 'wrong');
    $('#drill-fold').disabled = true;
    $('#drill-raise').disabled = true;
    renderGrid();
    renderDrillScore();

    setTimeout(() => {
      newDrillQuestion();
      render();
      feedback.textContent = '';
      feedback.className = 'drill-feedback';
      $('#drill-fold').disabled = false;
      $('#drill-raise').disabled = false;
    }, 1800);
  }

  function toggleDrill() {
    state.drill = !state.drill;
    $('#drill-toggle').classList.toggle('active', state.drill);
    hideMenu();
    if (state.drill) {
      drillStats = { correct: 0, total: 0 };
      newDrillQuestion();
    } else {
      drillQuestion = null;
    }
    render();
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
    document.querySelectorAll('.positions button').forEach((b) => {
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
    const alreadyOpened = posIdx(pos) > posIdx(state.hero) ||
      Object.entries(state.villain).some(([p, a]) => a === 'raise' && posIdx(p) < posIdx(pos));
    // '3bet' = le vilain 3bet l'open du héros : n'a de sens que si ce vilain parle après le héros.
    const actions = VILLAIN_ACTIONS.filter((a) =>
      (a !== '3bet' || posIdx(pos) > posIdx(state.hero)) && (a !== 'raise' || !alreadyOpened));
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
  $('#drill-fold').addEventListener('click', () => answerDrill('fold'));
  $('#drill-raise').addEventListener('click', () => answerDrill('raise'));
  window.addEventListener('resize', positionDrillToggle);

  buildPositions($('#positions'));
  buildTable();
  buildProfiles();
  buildGrid();
  bindKeys();
  selectHero(state.hero);
})();
