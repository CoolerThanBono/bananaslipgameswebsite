/* ============================================================
   Feed Luna — banana incremental (luna.js)
   ------------------------------------------------------------
   - "Total bananas fed" only ever goes up. Reaching WIN_AT wins.
   - Every banana fed also earns 1 Banana Buck, which is what
     upgrades cost. Buying upgrades never lowers the total.
   - Progress + Winners are saved in this browser (localStorage).
     To make Winners shared between visitors, swap out
     WinnersStore below for a real database (e.g. Supabase).
   ============================================================ */

(function () {
  'use strict';

  /* ── Tuning ── */
  const WIN_AT = 10000;
  const UPGRADES = [
    { id: 'x2', mult: 2, cost: 25 },
    { id: 'x3', mult: 3, cost: 200 },
    { id: 'x4', mult: 4, cost: 1000 },
  ];
  const SAVE_KEY    = 'feedLuna.save.v1';
  const WINNERS_KEY = 'feedLuna.winners.v1';
  const FLIGHT_MS   = 650;

  /* ── Storage helpers (never let storage errors break the game) ── */
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* private mode etc. — play on without saving */ }
  }

  /* ── Winners store: swap this object for a shared backend later ──
     Keep the same two async methods and nothing else has to change. */
  const WinnersStore = {
    async list() {
      const list = readJSON(WINNERS_KEY, []);
      return Array.isArray(list) ? list : [];
    },
    async add(name) {
      const list = await this.list();
      list.push({ name: name, at: Date.now() });
      writeJSON(WINNERS_KEY, list);
      return list;
    },
  };

  /* ── State ── */
  const defaults = { total: 0, bucks: 0, owned: [], won: false, submitted: false };
  const saved = readJSON(SAVE_KEY, {});
  const state = Object.assign({}, defaults, saved);
  if (!Array.isArray(state.owned)) state.owned = [];

  function save() { writeJSON(SAVE_KEY, state); }

  function perClick() {
    let m = 1;
    UPGRADES.forEach((u) => { if (state.owned.includes(u.id)) m = Math.max(m, u.mult); });
    return m;
  }

  /* ── Elements ── */
  const $ = (id) => document.getElementById(id);
  const stage      = $('luna-stage');
  const box        = $('banana-box');
  const luna       = $('luna');
  const totalEl    = $('luna-total');
  const bucksEl    = $('luna-bucks');
  const progressEl = $('luna-progress');
  const progLabel  = $('luna-progress-label');
  const feedBtn    = $('feed-btn');
  const rateEl     = $('feed-rate');
  const upgradesEl = $('upgrades');
  const winPanel   = $('win-panel');
  const winForm    = $('win-form');
  const winName    = $('win-name');
  const winDone    = $('win-done');
  const winPrompt  = $('win-prompt');
  const playAgain  = $('play-again');
  const winnersEl  = $('winners-list');

  if (!stage || !feedBtn) return;

  const fmt = (n) => n.toLocaleString('en-US');

  /* ── Upgrade buttons ── */
  const upgradeButtons = UPGRADES.map((u, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'upgrade-btn';
    btn.innerHTML =
      '<span class="up-name">' + u.mult + 'x clicks</span>' +
      '<span class="up-cost"></span>';
    btn.addEventListener('click', () => buy(u, i));
    upgradesEl.appendChild(btn);
    return btn;
  });

  function buy(u, i) {
    if (state.owned.includes(u.id)) return;
    const prevOwned = i === 0 || state.owned.includes(UPGRADES[i - 1].id);
    if (!prevOwned || state.bucks < u.cost) return;
    state.bucks -= u.cost;          // only Banana Bucks are spent
    state.owned.push(u.id);         // total bananas fed is untouched
    save();
    render();
  }

  /* ── Rendering ── */
  function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  function render() {
    totalEl.textContent = fmt(state.total);
    bucksEl.textContent = fmt(state.bucks);

    const pct = Math.min(100, (state.total / WIN_AT) * 100);
    progressEl.style.width = pct + '%';
    progLabel.textContent = fmt(Math.min(state.total, WIN_AT)) + ' / ' + fmt(WIN_AT) +
      ' bananas to win the website';

    const pc = perClick();
    rateEl.textContent = 'Each click feeds ' + pc + ' banana' + (pc === 1 ? '' : 's');

    UPGRADES.forEach((u, i) => {
      const btn = upgradeButtons[i];
      const costEl = btn.querySelector('.up-cost');
      const owned = state.owned.includes(u.id);
      const prevOwned = i === 0 || state.owned.includes(UPGRADES[i - 1].id);
      btn.classList.toggle('owned', owned);
      if (owned) {
        costEl.textContent = '✓ Owned';
        btn.disabled = true;
      } else if (!prevOwned) {
        costEl.textContent = '🔒 Buy ' + UPGRADES[i - 1].mult + 'x first';
        btn.disabled = true;
      } else {
        costEl.textContent = fmt(u.cost) + ' 💵';
        btn.disabled = state.bucks < u.cost;
      }
    });

    feedBtn.disabled = state.won;
    feedBtn.textContent = state.won ? '🐶 Luna is stuffed!' : '🍌 Feed Luna';

    winPanel.hidden = !state.won;
    winForm.hidden = state.submitted;
    winPrompt.hidden = state.submitted;
    winDone.hidden = !state.submitted;
  }

  async function renderWinners() {
    const list = await WinnersStore.list();
    winnersEl.innerHTML = '';
    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No winners yet. Will you be the first?';
      winnersEl.appendChild(li);
      return;
    }
    list.forEach((w) => {
      const li = document.createElement('li');
      li.textContent = '🍌 ' + w.name; // textContent keeps names safe
      winnersEl.appendChild(li);
    });
  }

  /* ── Feeding animation ── */
  function pointIn(el, fx, fy) {
    const s = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - s.left + r.width * fx, y: r.top - s.top + r.height * fy };
  }

  let inFlight = 0;

  const VOLLEY_GAP_MS = 80; // delay between bananas in one click

  // One click = one banana per multiplier, launched as a little volley
  function launchVolley(amount) {
    for (let i = 0; i < amount; i++) {
      setTimeout(() => launchBanana(i, amount), i * VOLLEY_GAP_MS);
    }
  }

  function launchBanana(i, count) {
    const from = pointIn(box, 0.5, 0.18);
    const to   = pointIn(luna, 0.24, 0.48);

    // fan each banana in the volley onto a slightly different arc
    const spread = count > 1 ? (i / (count - 1)) - 0.5 : 0;   // -0.5 .. 0.5
    const lift   = 70 + spread * 60 + (Math.random() * 16 - 8);
    const peak   = Math.min(from.y, to.y) - lift;
    const startX = from.x + spread * 40;
    const spin   = 520 + Math.round(Math.random() * 120) * (i % 2 ? -1 : 1);

    const b = document.createElement('span');
    b.className = 'flying-banana';
    b.textContent = '🍌';
    stage.appendChild(b);

    // centre the emoji on the path
    const half = b.offsetWidth / 2;
    const at = (x, y, rot, s) =>
      'translate(' + (x - half) + 'px,' + (y - half) + 'px) rotate(' + rot + 'deg) scale(' + s + ')';
    const mid = { x: (startX + to.x) / 2, y: peak };

    box.classList.remove('pop');
    void box.offsetWidth;
    box.classList.add('pop');

    inFlight++;
    luna.classList.add('open', 'happy');

    const anim = b.animate([
      { transform: at(startX, from.y, 0, 0.6) },
      { transform: at((startX + mid.x) / 2, (from.y + peak) / 2 - 20, spin * 0.3, 1) },
      { transform: at(mid.x, mid.y, spin * 0.55, 1.1) },
      { transform: at((mid.x + to.x) / 2, (peak + to.y) / 2 - 10, spin * 0.8, 1) },
      { transform: at(to.x, to.y, spin, 0.5) },
    ], { duration: FLIGHT_MS, easing: 'ease-in-out' });

    anim.onfinish = () => {
      b.remove();
      chomp(to, i);
    };
  }

  function chomp(at, i) {
    inFlight = Math.max(0, inFlight - 1);
    luna.classList.remove('chomp');
    void luna.getBoundingClientRect();
    luna.classList.add('chomp');
    if (inFlight === 0) luna.classList.remove('open');

    const yum = document.createElement('span');
    yum.className = 'yum';
    yum.textContent = '+1';
    yum.style.left = (at.x + (i % 2 ? 14 : -14)) + 'px';
    yum.style.top = (at.y - 30) + 'px';
    stage.appendChild(yum);
    yum.addEventListener('animationend', () => yum.remove(), { once: true });

    clearTimeout(chomp.t);
    chomp.t = setTimeout(() => luna.classList.remove('chomp', 'happy'), 600);
  }

  /* ── Feed! ── */
  feedBtn.addEventListener('click', () => {
    if (state.won) return;
    const amount = perClick();
    // Count immediately so nothing is lost if the page closes mid-flight
    state.total += amount;
    state.bucks += amount;
    if (state.total >= WIN_AT) state.won = true;
    save();
    render();
    bump(totalEl);
    bump(bucksEl);
    launchVolley(amount);
    if (state.won) setTimeout(() => winName.focus({ preventScroll: true }), 300);
  });

  /* ── Winning ── */
  winForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = winName.value.replace(/\s+/g, ' ').trim().slice(0, 24);
    if (!name || state.submitted) return;
    state.submitted = true;
    save();
    await WinnersStore.add(name);
    render();
    renderWinners();
  });

  playAgain.addEventListener('click', () => {
    Object.assign(state, defaults, { owned: [] });
    save();
    render();
  });

  render();
  renderWinners();
})();
