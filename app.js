// Hitaarth — vanilla-JS PWA. No frameworks, no build step. Keeps it tiny + fast.
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};

const SITE = "the-awakening-quotes.netlify.app";

const state = {
  quotes: [],
  current: 0,
  favorites: new Set(store.get("favorites", [])),
  notes: store.get("notes", {}),
  actions: store.get("actions", {}),   // "id::YYYY-MM-DD" -> ISO timestamp of the move
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
  state.current = dayIndex();           // open on today's idea
  renderFeed();
  bindReaderGestures();
  bindTabs();
  bindActions();
  bindSettings();
  computeStreak();
  scheduleReminder();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

// Deterministic "idea of the day": same idea all day, a different one tomorrow.
function dayIndex() {
  if (!state.quotes.length) return 0;
  const z = new Date(); z.setHours(0, 0, 0, 0);
  const epochDay = Math.floor(z.getTime() / 86400000);
  return ((epochDay % state.quotes.length) + state.quotes.length) % state.quotes.length;
}
function dayKey(d) {
  const z = d ? new Date(d) : new Date(); z.setHours(0, 0, 0, 0);
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, "0")}-${String(z.getDate()).padStart(2, "0")}`;
}

// ---------- reader feed ----------
function renderFeed() {
  const feed = $("#feed");
  const di = dayIndex();
  // Today's idea is pinned first (the daily anchor); the rest are shuffled for fresh browsing.
  const rest = state.quotes.map((q, i) => ({ q, i })).filter(x => x.i !== di);
  shuffle(rest);
  const rotated = state.quotes.length ? [{ q: state.quotes[di], i: di }, ...rest] : [];
  feed.innerHTML = rotated.map(({ q, i }) => `
    <article class="quote" data-i="${i}">
      <div class="inner">
        ${i === di ? `<span class="today-badge">Today's idea</span>` : ""}
        <div class="qmark">&#8220;</div>
        <p class="text">${escapeHTML(q.text)}</p>
        <div class="meta">
          <div class="byline"><span class="author">${escapeHTML(q.author)}</span>${q.category ? `<span class="chip">${escapeHTML(q.category)}</span>` : ""}</div>
          ${q.lesson ? `<div class="lesson"><span class="kicker">Lesson</span>${escapeHTML(q.lesson)}</div>` : ""}
          ${q.action ? `<div class="todo"><span class="kicker">Today's move</span><span class="todo-text">${escapeHTML(q.action)}</span><button type="button" class="todo-done${isActionDone(q.id) ? " on" : ""}" data-done="${escapeHTML(q.id)}">${isActionDone(q.id) ? "✓ Done today" : "Did it"}</button></div>` : ""}
          ${q.source ? `<div class="source"><span class="kicker">Source</span>${escapeHTML(q.source)}</div>` : ""}
        </div>
      </div>
    </article>`).join("");

  $$(".todo-done", feed).forEach(b => b.onclick = () => toggleActionDone(b));

  // Track which quote is centered, to drive the action bar state.
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { state.current = +e.target.dataset.i; refreshActionBar(); }
    });
  }, { threshold: 0.6 });
  $$(".quote", feed).forEach(el => io.observe(el));
}

function currentQuote() { return state.quotes[state.current]; }

// ---------- today's move (the practice loop) ----------
function isActionDone(id) { return !!state.actions[`${id}::${dayKey()}`]; }
function toggleActionDone(btn) {
  const id = btn.dataset.done; if (!id) return;
  const key = `${id}::${dayKey()}`;
  if (state.actions[key]) {
    delete state.actions[key];
    btn.classList.remove("on"); btn.textContent = "Did it";
  } else {
    state.actions[key] = new Date().toISOString();
    btn.classList.add("on"); btn.textContent = "✓ Done today";
    toast("Move logged ✓");
  }
  store.set("actions", state.actions);
  updateActionsStat(); haptic();
}
function actionStats() {
  const keys = Object.keys(state.actions);
  const weekAgo = Date.now() - 7 * 86400000;
  let week = 0;
  for (const k of keys) { const t = Date.parse(state.actions[k]); if (t && t >= weekAgo) week++; }
  return { total: keys.length, week };
}
function updateActionsStat() {
  const el = $("#actionsStat"); if (!el) return;
  const { total, week } = actionStats();
  el.textContent = total
    ? `${total} move${total === 1 ? "" : "s"} taken · ${week} this week`
    : "No moves yet — do today's one move.";
}

// ---------- gestures ----------
function bindReaderGestures() {
  const feed = $("#feed");
  let lastTap = 0, pressTimer = null, startX = 0, startY = 0;

  feed.addEventListener("pointerdown", (e) => {
    startX = e.clientX; startY = e.clientY;
    pressTimer = setTimeout(() => { pressTimer = null; copyQuote(); }, 500); // long-press = copy
  });
  feed.addEventListener("pointermove", (e) => {                    // movement means scroll/rest, not a long-press
    if (pressTimer && (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10)) {
      clearTimeout(pressTimer); pressTimer = null;
    }
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
  feed.addEventListener("pointercancel", () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });
}

// ---------- actions ----------
function bindActions() {
  $("#favBtn").onclick = favoriteWithPop;
  $("#shareBtn").onclick = openShareMenu;
  $("#noteBtn").onclick = toggleNote;
  const sb = $("#surpriseBtn"); if (sb) sb.onclick = surpriseMe;
}
function refreshActionBar() {
  const q = currentQuote(); if (!q) return;
  $("#favBtn").textContent = state.favorites.has(q.id) ? "♥" : "♡";
  $("#favBtn").classList.toggle("on", state.favorites.has(q.id));
  $("#noteBtn").classList.toggle("on", hasNote(q.id));
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

// ---------- share ----------
function quoteShareText(q) { return `${q.text}\n— ${q.author}\n\nvia Hitaarth · ${SITE}/?s=card`; }

function openShareMenu() {
  const q = currentQuote(); if (!q) return;
  const dlg = $("#shareSheet");
  $("#shareImageBtn").onclick = () => { dlg.close(); saveQuoteImage(); };
  $("#shareTextBtn").onclick = () => { dlg.close(); shareText(); };
  dlg.showModal();
}
async function saveQuoteImage() {
  const q = currentQuote(); if (!q) return;
  toast("Rendering image…");
  let blob; try { blob = await renderQuoteImage(q); } catch { blob = null; }
  if (!blob) { toast("Couldn't make image"); return; }
  await shareCanvasBlob(blob, `hitaarth-${q.id}`, quoteShareText(q));
}
async function shareText() {
  const q = currentQuote(); if (!q) return;
  const text = quoteShareText(q);
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
// Phones: share the PNG file (Save to Photos / IG / LinkedIn). Desktop: download.
async function shareCanvasBlob(blob, base, text) {
  const file = new File([blob], `${base}.png`, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Image saved");
}

function toggleNote() {
  const q = currentQuote(); if (!q) return;
  const dlg = $("#noteSheet"), ta = $("#noteText");
  ta.value = state.notes[q.id] || "";
  dlg.showModal();
  $("#noteSave").onclick = () => { state.notes[q.id] = ta.value.trim(); store.set("notes", state.notes); refreshActionBar(); renderSaved(); };
}

// ---------- quote -> shareable PNG (1080x1350, vanilla canvas) ----------
let _qrImg;                                  // cached QR <img>, undefined until first load
function loadQR() {
  if (_qrImg !== undefined) return Promise.resolve(_qrImg);
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => { _qrImg = img; res(img); };
    img.onerror = () => { _qrImg = null; res(null); };
    img.src = "icons/qr.png";
  });
}
function drawBrandFooter(ctx, W, H, PAD, SANS, qr) {
  const footY = H - 210;
  ctx.strokeStyle = "rgba(244,244,242,0.16)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(PAD, footY); ctx.lineTo(W - PAD, footY); ctx.stroke();
  if (qr) {                                  // QR bottom-right on a white quiet-zone
    const qs = 130, qx = W - PAD - qs, qy = H - PAD - qs - 4;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(qx - 12, qy - 12, qs + 24, qs + 24);
    ctx.drawImage(qr, qx, qy, qs, qs);
  }
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#F4F4F2"; ctx.font = `800 36px ${SANS}`;
  ctx.fillText("Hitaarth", PAD, footY + 66);
  ctx.fillStyle = "#8a8a8e"; ctx.font = `600 25px ${SANS}`;
  ctx.fillText(SITE, PAD, footY + 106);
  ctx.fillText("One idea. One move. Every day.", PAD, footY + 142);
}
async function renderQuoteImage(q) {
  const qr = await loadQR();
  return new Promise((resolve) => {
    const W = 1080, H = 1350, PAD = 96;
    const SERIF = 'Georgia, "Times New Roman", serif';
    const SANS = '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // background (always the dark brand look, regardless of app theme)
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);

    // opening quote mark
    ctx.fillStyle = "#FF5F6D";
    ctx.globalAlpha = 0.5;
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = `700 220px ${SERIF}`;
    ctx.fillText("“", PAD - 8, PAD + 150);
    ctx.globalAlpha = 1;

    // quote text — auto-fit into the available box (above the footer band)
    const maxW = W - PAD * 2;
    const topY = PAD + 200;
    const footY = H - 210;
    const maxTextH = footY - topY - 150;       // leave room for the author line
    const fit = fitText(ctx, q.text, maxW, maxTextH, 64, 28, 1.32, SERIF, 600);
    ctx.fillStyle = "#F4F4F2";
    ctx.font = `600 ${fit.size}px ${SERIF}`;
    ctx.textBaseline = "top";
    let y = topY;
    fit.lines.forEach(line => { ctx.fillText(line, PAD, y); y += fit.lineH; });

    // author
    ctx.fillStyle = "#FFA63D";
    ctx.font = `700 38px ${SANS}`;
    ctx.fillText(`— ${q.author}`, PAD, y + 34);

    drawBrandFooter(ctx, W, H, PAD, SANS, qr);
    canvas.toBlob(b => resolve(b), "image/png");
  });
}
// Streak-as-image: turns retention into a shareable artifact.
async function renderStreakImage(count) {
  const qr = await loadQR();
  return new Promise((resolve) => {
    const W = 1080, H = 1350, PAD = 96;
    const SERIF = 'Georgia, "Times New Roman", serif';
    const SANS = '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "left"; ctx.textBaseline = "top";

    ctx.fillStyle = "#FF5F6D"; ctx.font = `800 42px ${SANS}`;
    ctx.fillText("PRACTICE STREAK", PAD, PAD + 24);

    ctx.fillStyle = "#F4F4F2"; ctx.font = `800 320px ${SANS}`;
    ctx.fillText(String(count), PAD - 6, PAD + 110);

    ctx.fillStyle = "#FFA63D"; ctx.font = `700 70px ${SANS}`;
    ctx.fillText(count === 1 ? "day" : "days", PAD, PAD + 500);

    ctx.fillStyle = "#cfcfd4"; ctx.font = `600 46px ${SERIF}`;
    const lines = wrapText(ctx, "Showing up daily — one idea, one move at a time.", W - PAD * 2);
    let y = PAD + 640;
    lines.forEach(l => { ctx.fillText(l, PAD, y); y += 46 * 1.35; });

    drawBrandFooter(ctx, W, H, PAD, SANS, qr);
    canvas.toBlob(b => resolve(b), "image/png");
  });
}
async function shareStreak() {
  const n = (store.get("streak", { count: 1 }).count) || 1;
  toast("Rendering image…");
  let blob; try { blob = await renderStreakImage(n); } catch { blob = null; }
  if (!blob) { toast("Couldn't make image"); return; }
  await shareCanvasBlob(blob, `hitaarth-day-${n}`, `Day ${n} of my practice.\n\nvia Hitaarth · ${SITE}/?s=streak`);
}
// Shrink font until wrapped text fits the box; returns { size, lineH, lines }.
function fitText(ctx, text, maxW, maxH, startSize, minSize, lineRatio, family, weight) {
  for (let size = startSize; size >= minSize; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrapText(ctx, text, maxW);
    const lineH = size * lineRatio;
    if (lines.length * lineH <= maxH) return { size, lineH, lines };
  }
  ctx.font = `${weight} ${minSize}px ${family}`;
  return { size: minSize, lineH: minSize * lineRatio, lines: wrapText(ctx, text, maxW) };
}
function wrapText(ctx, text, maxW) {
  const words = String(text).split(/\s+/);
  const lines = []; let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
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

// ---------- saved (favorites + notes) ----------
function hasNote(id) { return !!(state.notes[id] && state.notes[id].trim()); }
function renderSaved() {
  const wrap = $("#savedList");
  // Show anything the user has acted on: a favorite, a note, or both.
  const items = state.quotes.filter(q => state.favorites.has(q.id) || hasNote(q.id));
  $("#savedEmpty").hidden = items.length > 0;
  wrap.innerHTML = items.map(q => {
    const note = hasNote(q.id)
      ? `<div class="note"><span class="kicker">Note</span><span class="note-text">${escapeHTML(state.notes[q.id])}</span><button class="note-del" data-del="${escapeHTML(q.id)}" aria-label="Delete note">✕</button></div>`
      : "";
    return `<div class="item"><div class="t">${escapeHTML(q.text)}</div><div class="a">— ${escapeHTML(q.author)}</div>${note}</div>`;
  }).join("");
  $$(".note-del", wrap).forEach(b => b.onclick = () => deleteNote(b.dataset.del));
}
function deleteNote(id) {
  delete state.notes[id];
  store.set("notes", state.notes);
  refreshActionBar(); renderSaved(); haptic();
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
      if (typeof Notification === "undefined") {                  // older iOS Safari: no Notification API
        e.target.checked = false; state.settings.reminders = false;
        toast("Reminders aren't supported on this browser");
        saveSettings(); return;
      }
      const ok = await Notification.requestPermission();
      state.settings.reminders = ok === "granted";
      if (ok !== "granted") e.target.checked = false;
    } else {
      state.settings.reminders = false;
    }
    saveSettings();
    scheduleReminder();
  };
  $("#remTime").onchange = (e) => { state.settings.remTime = e.target.value; saveSettings(); scheduleReminder(); };
  // share streak
  const ssb = $("#shareStreakBtn"); if (ssb) ssb.onclick = shareStreak;
  // premium (placeholder)
  $("#premiumBtn").onclick = (ev) => { ev.preventDefault(); toast("Premium / widgets: coming soon"); };
  // reset
  $("#resetBtn").onclick = () => { localStorage.removeItem("settings"); state.settings = { appearance: "dark", font: "system", size: 20, reminders: false, remTime: "08:00", premium: false }; saveSettings(); scheduleReminder(); };

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
  $("#remNote").textContent = "Reminders only fire while the app is open or running in the background — the browser may not deliver them once it's fully closed.";
}

// ---------- reminders (in-app, best-effort; no backend) ----------
let reminderTimer = null;
function scheduleReminder() {
  clearTimeout(reminderTimer); reminderTimer = null;
  if (!state.settings.reminders) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const [h, m] = (state.settings.remTime || "08:00").split(":").map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(h || 0, m || 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);             // already past today → tomorrow
  reminderTimer = setTimeout(() => { fireReminder(); scheduleReminder(); }, next - now);
}
function fireReminder() {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const q = state.quotes.length ? state.quotes[dayIndex()] : null;   // today's idea, not random
  const body = q ? `${q.text} — ${q.author}` : "A moment of stillness is waiting.";
  try { new Notification("Hitaarth · Today's idea", { body, icon: "icons/icon-192.png" }); } catch {}
}

// ---------- streak (with freeze economy) ----------
function computeStreak() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const data = store.get("streak", { count: 0, last: null, freezes: 0, frozenDates: [] });
  if (data.freezes == null) data.freezes = 0;
  if (!Array.isArray(data.frozenDates)) data.frozenDates = [];

  if (data.last) {
    const diff = Math.round((today - new Date(data.last)) / 86400000);
    if (diff === 1) {
      data.count += 1;
    } else if (diff === 2 && data.freezes > 0) {         // missed exactly one day → spend a freeze
      data.freezes -= 1;
      const miss = new Date(today); miss.setDate(miss.getDate() - 1);
      data.frozenDates.push(dayKey(miss));
      data.count += 1;
    } else if (diff > 1) {
      data.count = 1;                                      // streak broke
    }
    if (data.count === 0) data.count = 1;
    // award a freeze on each 7-day milestone (cap 3)
    if (diff === 1 && data.count % 7 === 0) data.freezes = Math.min(3, data.freezes + 1);
  } else {
    data.count = 1;
  }
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
  const fz = $("#streakFreeze");
  if (fz) fz.textContent = data.freezes
    ? `❄ ${data.freezes} streak freeze${data.freezes === 1 ? "" : "s"} banked — protects you if you miss a day`
    : "Earn a streak freeze every 7 days — it saves your streak if you miss a day";
  updateActionsStat();
}

// ---------- browse: shuffle + surprise ----------
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function surpriseMe() {
  const feed = $("#feed"); const cards = $$(".quote", feed);
  if (cards.length < 2) return;
  const curPos = cards.findIndex(c => +c.dataset.i === state.current);
  let pos; do { pos = Math.floor(Math.random() * cards.length); } while (pos === curPos);
  feed.scrollTo({ top: pos * feed.clientHeight, behavior: "smooth" });
  state.current = +cards[pos].dataset.i; refreshActionBar();
  haptic();
}

// ---------- utils ----------
function escapeHTML(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function haptic() { try { navigator.vibrate?.(8); } catch {} }
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 1300); }
