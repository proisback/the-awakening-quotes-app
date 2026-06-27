// Stillpoint — vanilla-JS PWA. No frameworks, no build step. Keeps it tiny + fast.
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};

const state = {
  quotes: [],
  current: 0,
  favorites: new Set(store.get("favorites", [])),
  notes: store.get("notes", {}),
  settings: store.get("settings", { appearance: "dark", font: "system", size: 20, reminders: false, remTime: "08:00", premium: false })
};

// ---------- boot ----------
init();
async function init() {
  applySettings();
  try {
    const res = await fetch("quotes.json");
    state.quotes = await res.json();
  } catch { state.quotes = []; }
  renderFeed();
  bindReaderGestures();
  bindTabs();
  bindActions();
  bindSettings();
  computeStreak();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

// ---------- reader feed ----------
function renderFeed() {
  const feed = $("#feed");
  feed.innerHTML = state.quotes.map((q, i) => `
    <article class="quote" data-i="${i}">
      <div class="inner">
        <div class="qmark">&#8220;</div>
        <p class="text">${escapeHTML(q.text)}</p>
        <div class="meta">
          <div class="byline"><span class="author">${escapeHTML(q.author)}</span>${q.category ? `<span class="chip">${escapeHTML(q.category)}</span>` : ""}</div>
          ${q.lesson ? `<div class="lesson"><span class="kicker">Lesson</span>${escapeHTML(q.lesson)}</div>` : ""}
          ${q.source ? `<div class="source"><span class="kicker">Source</span>${escapeHTML(q.source)}</div>` : ""}
        </div>
      </div>
    </article>`).join("");

  // Track which quote is centered, to drive the action bar state.
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { state.current = +e.target.dataset.i; refreshActionBar(); }
    });
  }, { threshold: 0.6 });
  $$(".quote", feed).forEach(el => io.observe(el));
}

function currentQuote() { return state.quotes[state.current]; }

// ---------- gestures ----------
function bindReaderGestures() {
  const feed = $("#feed");
  let lastTap = 0, pressTimer = null, startX = 0, startY = 0;

  feed.addEventListener("pointerdown", (e) => {
    startX = e.clientX; startY = e.clientY;
    pressTimer = setTimeout(() => { pressTimer = null; copyQuote(); }, 500); // long-press = copy
  });
  feed.addEventListener("pointerup", (e) => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } else return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy)) {        // horizontal swipe
      if (dx > 0) toggleFavorite(); else toggleNote();
      return;
    }
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {                  // a tap
      const now = Date.now();
      if (now - lastTap < 280) { lastTap = 0; favoriteWithPop(); }  // double tap = favorite
      else { lastTap = now; setTimeout(() => { if (lastTap) { document.body.classList.toggle("immersive"); lastTap = 0; } }, 280); }
    }
  });
  feed.addEventListener("pointercancel", () => { if (pressTimer) clearTimeout(pressTimer); });
}

// ---------- actions ----------
function bindActions() {
  $("#favBtn").onclick = favoriteWithPop;
  $("#shareBtn").onclick = shareQuote;
  $("#noteBtn").onclick = toggleNote;
  $("#moreBtn").onclick = moreMenu;
}
function refreshActionBar() {
  const q = currentQuote(); if (!q) return;
  $("#favBtn").textContent = state.favorites.has(q.id) ? "♥" : "♡";
  $("#favBtn").classList.toggle("on", state.favorites.has(q.id));
  $("#noteBtn").classList.toggle("on", !!state.notes[q.id]);
}
function toggleFavorite() {
  const q = currentQuote(); if (!q) return;
  if (state.favorites.has(q.id)) state.favorites.delete(q.id); else state.favorites.add(q.id);
  store.set("favorites", [...state.favorites]);
  refreshActionBar(); renderSaved(); haptic();
}
function favoriteWithPop() {
  const q = currentQuote(); if (!q) return;
  if (!state.favorites.has(q.id)) {
    const pop = document.createElement("div"); pop.className = "heart-pop show"; pop.textContent = "♥";
    document.body.appendChild(pop); setTimeout(() => pop.remove(), 700);
  }
  toggleFavorite();
}
function copyQuote() {
  const q = currentQuote(); if (!q) return;
  navigator.clipboard?.writeText(`${q.text}\n— ${q.author}`);
  toast("Copied"); haptic();
}
async function shareQuote() {
  const q = currentQuote(); if (!q) return;
  const text = `${q.text}\n— ${q.author}`;
  const data = { text };
  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try { await navigator.share(data); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("Copied to clipboard"); }
    catch { toast("Couldn't share"); }
    ta.remove();
  }
}
function moreMenu() {
  const q = currentQuote(); if (!q) return;
  copyQuote();
}
function toggleNote() {
  const q = currentQuote(); if (!q) return;
  const dlg = $("#noteSheet"), ta = $("#noteText");
  ta.value = state.notes[q.id] || "";
  dlg.showModal();
  $("#noteSave").onclick = () => { state.notes[q.id] = ta.value.trim(); store.set("notes", state.notes); refreshActionBar(); };
}

// ---------- tabs / screens ----------
function bindTabs() {
  $$(".tab").forEach(t => t.onclick = () => showScreen(t.dataset.screen, t));
}
function showScreen(name, tabEl) {
  $$(".screen").forEach(s => { s.hidden = (s.id !== name); s.classList.toggle("active", s.id === name); });
  $$(".tab").forEach(t => t.classList.remove("active"));
  (tabEl || $(`.tab[data-screen="${name}"]`)).classList.add("active");
  $("#actions").style.display = name === "reader" ? "flex" : "none";
  if (name === "saved") renderSaved();
}

// ---------- saved ----------
function renderSaved() {
  const wrap = $("#savedList"); const favs = state.quotes.filter(q => state.favorites.has(q.id));
  $("#savedEmpty").hidden = favs.length > 0;
  wrap.innerHTML = favs.map(q => `<div class="item"><div class="t">${escapeHTML(q.text)}</div><div class="a">— ${escapeHTML(q.author)}</div></div>`).join("");
}

// ---------- settings ----------
function bindSettings() {
  // expandable cards
  $$(".row[data-toggle]").forEach(r => r.onclick = () => r.closest(".card").classList.toggle("open"));

  // appearance
  $$("[data-appearance]").forEach(b => b.onclick = () => { state.settings.appearance = b.dataset.appearance; saveSettings(); });
  // fonts
  $$(".font-opt").forEach(b => b.onclick = () => { state.settings.font = b.dataset.font; saveSettings(); });
  // size
  $("#sizeRange").oninput = (e) => { state.settings.size = +e.target.value; saveSettings(); };
  // reminders
  $("#remToggle").onchange = async (e) => {
    if (e.target.checked) {
      const ok = await Notification.requestPermission?.();
      state.settings.reminders = ok === "granted";
      if (ok !== "granted") { e.target.checked = false; }
    } else state.settings.reminders = false;
    saveSettings();
  };
  $("#remTime").onchange = (e) => { state.settings.remTime = e.target.value; saveSettings(); };
  // premium (placeholder)
  $("#premiumBtn").onclick = (ev) => { ev.preventDefault(); toast("Premium / widgets: coming soon"); };
  // reset
  $("#resetBtn").onclick = () => { localStorage.removeItem("settings"); state.settings = { appearance: "dark", font: "system", size: 20, reminders: false, remTime: "08:00", premium: false }; saveSettings(); };

  syncSettingsUI();
}
function saveSettings() { store.set("settings", state.settings); applySettings(); syncSettingsUI(); }
function applySettings() {
  const s = state.settings;
  document.documentElement.dataset.theme = s.appearance;
  const fam = s.font === "mono" ? 'ui-monospace,Menlo,Consolas,monospace'
            : s.font === "cursive" ? '"Snell Roundhand","Brush Script MT",cursive'
            : '-apple-system,system-ui,"Segoe UI",Roboto,sans-serif';
  document.documentElement.style.setProperty("--quote-font", fam);
  document.documentElement.style.setProperty("--quote-size", s.size + "px");
}
function syncSettingsUI() {
  const s = state.settings;
  $$("[data-appearance]").forEach(b => b.classList.toggle("on", b.dataset.appearance === s.appearance));
  $$(".font-opt").forEach(b => b.classList.toggle("on", b.dataset.font === s.font));
  $("#sizeRange").value = s.size; $("#sizeVal").textContent = s.size;
  $("#remToggle").checked = s.reminders; $("#remTime").value = s.remTime;
  $("#remNote").textContent = "Note: web reminders fire only while the app is open or installed; reliable daily alerts need a native build.";
}

// ---------- streak ----------
function computeStreak() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const data = store.get("streak", { count: 0, last: null });
  if (data.last) {
    const diff = Math.round((today - new Date(data.last)) / 86400000);
    if (diff === 1) data.count += 1; else if (diff > 1) data.count = 1; // same day: unchanged
    if (data.count === 0) data.count = 1;
  } else data.count = 1;
  data.last = today.toISOString();
  store.set("streak", data);

  const milestone = 7;
  const dayInLevel = ((data.count - 1) % milestone) + 1;
  const level = Math.floor((data.count - 1) / milestone) + 1;
  const pct = Math.round((dayInLevel / milestone) * 100);
  $("#streakDays").textContent = data.count + (data.count === 1 ? " day" : " days");
  $("#streakPct").textContent = pct + "%";
  $("#streakLevel").textContent = `Level ${level} — to ${milestone}`;
  $("#streakBar").style.width = pct + "%";
  const left = milestone - dayInLevel;
  $("#streakNext").textContent = left === 0 ? "Milestone reached! 🎉" : `Next milestone in ${left} day${left === 1 ? "" : "s"}`;
}

// ---------- utils ----------
function escapeHTML(s) { return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 1300); }
