(function () {
  'use strict';

  const RANKS = 'AKQJT98765432'.split('');
  const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const TOTAL_COMBOS = 1326;

  // Emplacements des sièges sur la table (en % du conteneur), dans le sens horaire
  // en partant du héros en bas.
  const SLOTS = [[50, 80], [8, 66], [8, 28], [50, 12], [92, 28], [92, 66]];
  const CENTER = [50, 48];

  // Indices de déviation (voir CLAUDE.md) : fish - regs forts parmi les joueurs restant à parler.
  const DEVIATIONS = [3, 2, 1, 0, -1];

  const state = { hero: 'UTG', dev: 0, hovered: null };

  const hasOpen = (pos) => !!window.RANGES.open[pos];

  // Range à afficher pour la position et l'indice courants (repli sur l'indice 0).
  function currentSpot() {
    const byDev = window.RANGES.open[state.hero];
    const spot = byDev[state.dev];
    return { spot: spot || byDev[0], fallback: !spot };
  }

  const signed = (v) => (v > 0 ? '+' + v : v < 0 ? '−' + -v : '0');

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
      seat.addEventListener('click', () => selectHero(pos));
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

  function renderTable() {
    const heroIdx = POSITIONS.indexOf(state.hero);
    const { spot } = currentSpot();
    let pot = 0;

    POSITIONS.forEach((pos, i) => {
      const slot = (i - heroIdx + 6) % 6;
      const [x, y] = SLOTS[slot];
      const seat = seatEls[pos];
      const isHero = pos === state.hero;
      const folded = i < heroIdx;

      let bet = 0;
      if (isHero) bet = spot.size;
      else if (pos === 'SB') bet = 0.5;
      else if (pos === 'BB') bet = 1;
      pot += bet;

      seat.style.left = x + '%';
      seat.style.top = y + '%';
      seat.classList.toggle('hero', isHero);
      seat.classList.toggle('folded', folded);
      seat.classList.toggle('disabled', !hasOpen(pos));
      seat.querySelector('.stack').textContent = fmt(100 - bet) + ' BB';

      const tag = seat.querySelector('.tag');
      tag.className = 'tag';
      if (folded) { tag.textContent = 'Fold'; tag.classList.add('show', 'fold'); }
      else if (isHero) { tag.textContent = 'Raise ' + fmt(spot.size); tag.classList.add('show', 'raise'); }
      else tag.textContent = '';

      const b = betEls[pos];
      b.style.left = lerp(x, CENTER[0], 0.42) + '%';
      b.style.top = lerp(y, CENTER[1], 0.42) + '%';
      b.classList.toggle('show', bet > 0);
      b.classList.toggle('raise', isHero);
      b.querySelector('.amt').textContent = fmt(bet);
    });

    const [bx, by] = SLOTS[(POSITIONS.indexOf('BTN') - heroIdx + 6) % 6];
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

  function renderGrid() {
    strategy = buildStrategy(currentSpot().spot);
    Object.entries(cellEls).forEach(([h, cell]) => {
      const s = strategy[h];
      cell.style.background = background(s);
      cell.classList.toggle('out', s.fold >= 0.999);
    });
  }

  function renderPanel() {
    const { spot, fallback } = currentSpot();
    const totals = {};
    actionOrder().forEach((a) => { totals[a] = 0; });
    Object.entries(strategy).forEach(([h, s]) => {
      actionOrder().forEach((a) => { totals[a] += (s[a] || 0) * combos(h); });
    });
    const played = TOTAL_COMBOS - totals.fold;

    $('#spot-title').innerHTML = state.hero + ' — Open <span class="dev-badge" data-sign="' + Math.sign(state.dev) + '">' + signed(state.dev) + '</span>';
    const sub = $('#spot-sub');
    sub.classList.toggle('warn', fallback);
    sub.textContent = fallback
      ? "Pas de range définie pour l'indice " + signed(state.dev) + ' : stratégie de base affichée.'
      : 'Premier à parler, ouverture à ' + fmt(spot.size) + ' BB';
    $('#stat-pct').textContent = fmt((played / TOTAL_COMBOS) * 100) + ' %';
    $('#stat-combos').textContent = fmt(played);

    $('#legend').innerHTML = actionOrder().map((a) => {
      const act = window.ACTIONS[a];
      const label = a === 'raise' ? act.label + ' ' + fmt(spot.size) : act.label;
      return '<li><span class="sw" style="background:' + act.color + '"></span>' +
        '<span class="lbl">' + label + '</span>' +
        '<span class="val">' + fmt((totals[a] / TOTAL_COMBOS) * 100) + ' %</span>' +
        '<span class="cmb">' + fmt(totals[a]) + ' c.</span></li>';
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
      el.innerHTML = '<span class="muted">Survolez une main pour voir sa stratégie.</span>';
      return;
    }
    const s = strategy[h];
    const rows = actionOrder().filter((a) => s[a] > 0).map((a) =>
      '<div class="hrow"><span class="sw" style="background:' + window.ACTIONS[a].color + '"></span>' +
      window.ACTIONS[a].label + '<span class="val">' + Math.round(s[a] * 100) + ' %</span></div>'
    ).join('');
    el.innerHTML = '<div class="hhand">' + h + ' <span class="muted">· ' + combos(h) + ' combos</span></div>' + rows;
  }

  /* ---------- Interactions ---------- */

  function hover(h) {
    state.hovered = h;
    renderHover();
  }

  function selectHero(pos) {
    if (!hasOpen(pos)) return;
    state.hero = pos;
    document.querySelectorAll('.positions button').forEach((b) => {
      b.classList.toggle('active', b.dataset.pos === pos);
    });
    render();
  }

  function selectDev(v) {
    state.dev = v;
    render();
  }

  function render() {
    renderTable();
    renderDeviation();
    renderGrid();
    renderPanel();
  }

  function buildPositions(nav) {
    POSITIONS.forEach((pos) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.pos = pos;
      b.textContent = pos;
      if (!hasOpen(pos)) {
        b.disabled = true;
        b.title = "Pas de range d'open depuis la BB";
      }
      b.addEventListener('click', () => selectHero(pos));
      nav.appendChild(b);
    });
  }

  /* ---------- Indice de déviation ---------- */

  const devEls = {};

  function buildDeviation() {
    const list = $('#dev-list');
    DEVIATIONS.forEach((d) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.sign = Math.sign(d);
      b.textContent = signed(d);
      b.addEventListener('click', () => selectDev(d));
      li.appendChild(b);
      list.appendChild(li);
      devEls[d] = b;
    });
  }

  function renderDeviation() {
    DEVIATIONS.forEach((d) => {
      devEls[d].classList.toggle('active', d === state.dev);
    });
  }

  function bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const open = POSITIONS.filter(hasOpen);
        const i = open.indexOf(state.hero) + (e.key === 'ArrowRight' ? 1 : -1);
        selectHero(open[(i + open.length) % open.length]);
      } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const v = state.dev + (e.key === 'ArrowUp' ? 1 : -1);
        if (DEVIATIONS.includes(v)) selectDev(v);
      }
    });
  }

  buildPositions($('#positions'));
  buildTable();
  buildDeviation();
  buildGrid();
  bindKeys();
  selectHero(state.hero);
})();
