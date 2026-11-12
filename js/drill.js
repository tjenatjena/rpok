/* Drill : questions tirées dans les ranges, verdicts, fin de série (score + erreurs) et journal
   des erreurs. S'appuie sur le cœur exposé par app.js (window.RPok) et s'y branche en
   remplissant RPok.drill, que app.js interroge pour la table, la grille et le panneau. */
(function () {
  'use strict';

  const R = window.RPok;
  // POSITIONS et tableLevel changent (format, table) : toujours lus via R.POSITIONS / R.tableLevel.
  const {
    state, PROFILES, profileOf, CENTER, tableEl, $, fmt, lerp, seatXY, combos, allHands, handAt,
    buildStrategy, heroOpenStrategy, render, renderTable, renderGrid, renderProfiles, hideMenu, setFormat,
  } = R;

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
    return out.filter((s) => R.POSITIONS.includes(s.hero) && (!cfg.hero || cfg.hero(s.hero)) &&
      (!s.villain || s.villain.split('+').every((v) => R.POSITIONS.includes(v))));
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
    if (a === 'call') return fmt(R.tableLevel);
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
    if (!R.POSITIONS.includes(hero)) setFormat('9max');
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

  /* ---------- Clavier et boutons du drill ---------- */

  function bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { $('#drill-menu').hidden = true; closeErrors(); closeResults(); }
      if (!state.drill) return;
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
    });
  }

  function bindControls() {
    $('#drill-toggle').addEventListener('click', toggleDrill);
    $('#drill-actions').addEventListener('click', (e) => {
      const b = e.target.closest('.drill-btn');
      if (b && !b.disabled) answerDrill(b.dataset.answer);
    });
    $('#drill-next').addEventListener('click', nextDrillQuestion);
    document.addEventListener('click', () => { $('#drill-menu').hidden = true; });
  }

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

  /* ---------- Interface pour app.js ---------- */

  R.drill = {
    // Appelé par app.js une fois le format posé (le menu dépend des positions du format).
    init() {
      buildDrillMenu();
      bindErrors();
      bindResults();
      bindControls();
      bindKeys();
    },
    question: () => drillQuestion,
    answered: () => drillAnswered,
    questionVillains: drillQuestionVillains,
    toggleHeroLock: toggleDrillLock,
    toggleVillainLock: toggleDrillVillainLock,
    toggleProfileLock: toggleDrillProfileLock,
    // Partie du panneau propre au drill (cartes et compteur).
    renderPanel() {
      renderDrillCards();
      renderDrillScore();
    },
    // Changement de format : libère les verrous hors format et repart sur une question.
    onFormatChange() {
      const P = R.POSITIONS;
      if (state.drillHero && !P.includes(state.drillHero)) state.drillHero = null;
      if (state.drillVillain && !state.drillVillain.split('+').every((v) => P.includes(v))) state.drillVillain = null;
      if (state.drill) newDrillQuestion();
    },
  };
})();
