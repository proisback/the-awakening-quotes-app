// Hitaarth — vanilla-JS PWA. No frameworks, no build step. Keeps it tiny + fast.
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};

const SITE = "the-awakening-quotes.netlify.app";

// ---------- analytics (privacy-first: no cookies, no IDs, respects DNT) ----------
// Local day-counters always (inspect via hitaarthStats() in the console). Remote aggregation
// pings GoatCounter only once GC_SITE is set — free account, code goes here, nothing else.
const GC_SITE = "";                            // e.g. "hitaarth" → hitaarth.goatcounter.com
function track(ev) {
  try {
    const s = store.get("stats", {});
    const day = dayKey();
    (s[day] = s[day] || {})[ev] = (s[day][ev] || 0) + 1;
    const days = Object.keys(s).sort();        // keep the last 30 days only
    while (days.length > 30) delete s[days.shift()];
    store.set("stats", s);
    if (!GC_SITE || navigator.doNotTrack === "1" || location.hostname === "localhost") return;
    new Image().src = `https://${GC_SITE}.goatcounter.com/count?p=${encodeURIComponent("/e/" + ev)}&t=${encodeURIComponent(ev)}`;
  } catch {}
}
window.hitaarthStats = () => store.get("stats", {});

const state = {
  quotes: [],
  current: 0,
  favorites: new Set(store.get("favorites", [])),
  notes: store.get("notes", {}),
  actions: store.get("actions", {}),   // "id::YYYY-MM-DD" -> ISO timestamp of the move
  settings: store.get("settings", { appearance: "dark", skin: "", font: "fraunces", size: 22, reminders: false, remTime: "08:00", premium: false, lang: "en", cardStyle: "noir" })
};
if (!state.settings.lang) state.settings.lang = "en";

// ---------- i18n ----------
// English UI strings live here; other languages load from i18n/<lang>.json (_ui + per-quote).
let localeData = null;
const I18N = {
  en: {
    savedTitle: "Saved", savedEmpty: "Double-tap a quote, or tap ♡, to save it here.",
    settingsTitle: "Settings", streak: "STREAK", shareStreak: "Share streak ↗",
    language: "Language", languageSub: "App language",
    appearance: "Appearance", appearanceSub: "Light / Dark / System",
    segSystem: "SYSTEM", segLight: "LIGHT", segDark: "DARK",
    typography: "Typography", typographySub: "Font and size",
    fontSystem: "System", fontMono: "Monospaced",
    reminders: "Reminders", remindersSub: "Daily quote reminder",
    enableReminders: "Enable reminders", timeLabel: "Time",
    premium: "Get Premium", premiumSub: "Unlock widgets & packs", unlock: "Unlock",
    reset: "↺ Reset to defaults", privacy: "Hitaarth · your data stays on this device",
    noteTitle: "Your note", notePh: "A thought on this quote…", cancel: "Cancel", save: "Save",
    shareTitle: "Share quote", saveImageStatus: "Status image — WhatsApp story", saveImageBig: "Big image — full card", saveImageSmall: "Small image — quote only", shareTextOpt: "Share as text",
    cardStyle: "Card style",
    lessonLabel: "Lesson", moveLabel: "Today's move", sourceLabel: "Source", noteLabel: "Note",
    todayBadge: "Today's idea", didIt: "Did it", doneToday: "✓ Done today", translated: "translated",
    dayOne: "{n} day", dayMany: "{n} days",
    levelTo: "Level {level} — to {m}",
    nextMilestone: "Next milestone in {n} day", nextMilestoneN: "Next milestone in {n} days",
    milestoneReached: "Milestone reached! 🎉",
    freezeBanked: "❄ {n} streak freeze banked — protects you if you miss a day",
    freezeBankedN: "❄ {n} streak freezes banked — protects you if you miss a day",
    freezeEarn: "Earn a streak freeze every 7 days — it saves your streak if you miss a day",
    movesTaken: "{t} move taken · {w} this week", movesTakenN: "{t} moves taken · {w} this week",
    noMoves: "No moves yet — do today's one move.",
    remNote: "Reminders only fire while the app is open or running in the background — the browser may not deliver them once it's fully closed.",
    langNote: "Quotes in another language are machine-translated and marked.",
    tCopied: "Copied", tMoveLogged: "Move logged ✓", tImageSaved: "Image saved",
    tRendering: "Rendering image…", tCantImage: "Couldn't make image",
    tCopiedClip: "Copied to clipboard", tCantShare: "Couldn't share",
    tRemUnsupported: "Reminders aren't supported on this browser",
    tNoTTS: "Read aloud isn't supported on this browser",
    tPremiumSoon: "Premium / widgets: coming soon",
    browseTitle: "Browse", byGenre: "By genre", byAuthor: "By author", browseBack: "← Back", searchPh: "Search quotes, authors…", resultOne: "result", resultMany: "results", noResults: "No matches",
    skins: "Themes",
    pwSub: "Own the full editorial experience.",
    pwFeatThemes: "All theme packs — Dawn, Ink, Forest",
    pwFeatFonts: "The complete font library",
    pwFeatFuture: "Every future pack, included",
    pwCta: "Notify me when it's ready", pwCtaDone: "✓ You're on the list", pwLater: "Maybe later",
    tNotifyMe: "Noted — you'll be first to know"
  }
};
function lang() { return state.settings.lang || "en"; }
function t(k) {
  if (lang() !== "en" && localeData && localeData._ui && k in localeData._ui) return localeData._ui[k];
  return (k in I18N.en) ? I18N.en[k] : k;
}
function tq(q, field) {                       // translated quote field, falling back to English
  if (lang() === "en" || !localeData) return q[field];
  const tr = localeData[q.id];
  return (tr && tr[field]) || q[field];
}
function isTranslated(q) {
  return lang() !== "en" && !!(localeData && localeData[q.id] && localeData[q.id].text);
}
async function loadLocale(lng) {
  if (lng === "en") { localeData = null; return; }
  try { const r = await fetch(`i18n/${lng}.json`); localeData = await r.json(); }
  catch { localeData = null; }
}
function applyStaticI18n() {
  $$("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.documentElement.lang = lang();
}
async function applyLanguage(lng) {
  state.settings.lang = lng;
  store.set("settings", state.settings);
  await loadLocale(lng);
  applyStaticI18n();
  renderFeed();
  renderSaved();
  renderBrowse();
  computeStreak();
  syncSettingsUI();
}

// ---------- boot ----------
init();
async function init() {
  applySettings();
  track("open");
  window.addEventListener("appinstalled", () => track("install"));
  // First-open splash cleans itself out of the DOM once its exit animation is done.
  setTimeout(() => { const s = $("#splash"); if (s) s.remove(); }, 2000);
  try {
    const res = await fetch("quotes.json");
    state.quotes = await res.json();
  } catch { state.quotes = []; }
  state.current = dayIndex();           // open on today's idea
  await loadLocale(lang());
  renderFeed();
  bindReaderGestures();
  bindTabs();
  bindActions();
  bindBrowse();
  bindSettings();
  computeStreak();
  applyStaticI18n();
  scheduleReminder();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js").catch(() => {});
  // Ask the browser to keep our data — stops eviction of localStorage/cache under storage pressure.
  if (navigator.storage?.persist) {
    navigator.storage.persisted().then(p => { if (!p) navigator.storage.persist().catch(() => {}); }).catch(() => {});
  }
  // App-shortcut / deep-link routing (?go=…) — feed + screens already exist at this point.
  const go = new URLSearchParams(location.search).get("go");
  if (go === "saved") showScreen("saved");
  else if (go === "browse") showScreen("browse");
  else if (go === "surprise") surpriseMe();
  // "today"/absent → default reader screen, no action
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
// Genre → tint slug for the reader's ambient wash (styles.css .quote[data-g=...]).
const GENRE_SLUG = {
  "Stoicism": "stoic", "Eastern Wisdom": "eastern", "Building & Startups": "startup",
  "Systems & Science": "science", "Strategy & Money": "money", "Craft & Creativity": "craft",
  "Mind & Character": "mind", "Cinema": "cinema"
};
function renderFeed() {
  const feed = $("#feed");
  const di = dayIndex();
  // Today's idea is pinned first (the daily anchor); the rest are shuffled for fresh browsing.
  const rest = state.quotes.map((q, i) => ({ q, i })).filter(x => x.i !== di);
  shuffle(rest);
  const rotated = state.quotes.length ? [{ q: state.quotes[di], i: di }, ...rest] : [];
  feed.innerHTML = rotated.map(({ q, i }) => `
    <article class="quote" data-i="${i}" data-g="${GENRE_SLUG[q.genre] || ""}">
      <div class="inner">
        ${i === di ? `<span class="today-badge">${t("todayBadge")}</span>` : ""}
        <div class="qmark">&#8220;</div>
        <p class="text">${escapeHTML(tq(q, "text"))}</p>
        <div class="meta">
          <div class="byline"><span class="author">${escapeHTML(q.author)}</span>${q.category ? `<span class="chip">${escapeHTML(q.category)}</span>` : ""}${isTranslated(q) ? `<span class="tr-badge">${t("translated")}</span>` : ""}</div>
          ${q.lesson ? `<div class="lesson"><span class="kicker">${t("lessonLabel")}</span>${escapeHTML(tq(q, "lesson"))}</div>` : ""}
          ${q.action ? `<div class="todo"><span class="kicker">${t("moveLabel")}</span><span class="todo-text">${escapeHTML(tq(q, "action"))}</span><button type="button" class="todo-done${isActionDone(q.id) ? " on" : ""}" data-done="${escapeHTML(q.id)}">${isActionDone(q.id) ? t("doneToday") : t("didIt")}</button></div>` : ""}
          ${q.source ? `<div class="source"><span class="kicker">${t("sourceLabel")}</span>${escapeHTML(q.source)}</div>` : ""}
        </div>
      </div>
    </article>`).join("");

  $$(".todo-done", feed).forEach(b => b.onclick = () => toggleActionDone(b));

  // Track which quote is centered, to drive the action bar state.
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const i = +e.target.dataset.i;
        if (i !== state.current) { stopSpeech(); track("read"); }   // never read a stale quote
        state.current = i; refreshActionBar();
      }
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
    btn.classList.remove("on"); btn.textContent = t("didIt");
  } else {
    state.actions[key] = new Date().toISOString();
    btn.classList.add("on"); btn.textContent = t("doneToday");
    toast(t("tMoveLogged"));
    track("did-it");
  }
  store.set("actions", state.actions);
  updateActionsStat(); haptic();
}
function actionStats() {
  const keys = Object.keys(state.actions);
  const weekAgo = Date.now() - 7 * 86400000;
  let week = 0;
  for (const k of keys) { const ts = Date.parse(state.actions[k]); if (ts && ts >= weekAgo) week++; }
  return { total: keys.length, week };
}
function updateActionsStat() {
  const el = $("#actionsStat"); if (!el) return;
  const { total, week } = actionStats();
  el.textContent = total
    ? (total === 1 ? t("movesTaken") : t("movesTakenN")).replace("{t}", total).replace("{w}", week)
    : t("noMoves");
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
  const spk = $("#speakBtn"); if (spk) spk.onclick = toggleSpeak;
  const sb = $("#surpriseBtn"); if (sb) sb.onclick = surpriseMe;
}
function refreshActionBar() {
  const q = currentQuote(); if (!q) return;
  $("#favBtn").classList.toggle("on", state.favorites.has(q.id));   // .on fills the heart via CSS
  $("#noteBtn").classList.toggle("on", hasNote(q.id));
}
function toggleFavorite() {
  const q = currentQuote(); if (!q) return;
  if (state.favorites.has(q.id)) state.favorites.delete(q.id); else { state.favorites.add(q.id); track("save"); }
  store.set("favorites", [...state.favorites]);
  refreshActionBar(); renderSaved(); haptic();
}
function favoriteWithPop() {
  const q = currentQuote(); if (!q) return;
  if (!state.favorites.has(q.id)) {
    const pop = document.createElement("div"); pop.className = "heart-pop show";
    pop.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-heart"/></svg>';
    document.body.appendChild(pop); setTimeout(() => pop.remove(), 700);
  }
  toggleFavorite();
}
function copyQuote() {
  const q = currentQuote(); if (!q) return;
  navigator.clipboard?.writeText(`${tq(q, "text")}\n— ${q.author}`);
  toast(t("tCopied")); haptic();
}

// ---------- read aloud (Web Speech, 100% client-side) ----------
const TTS_LANG = { en: "en-US", hi: "hi-IN", es: "es-ES", fr: "fr-FR" };
let _speaking = false;
function setSpeakBtn(on) {
  const b = $("#speakBtn"); if (!b) return;
  b.classList.toggle("on", on);                 // .on swaps the volume/stop SVGs via CSS
}
// Stop any ongoing speech (called on quote change / screen change / re-tap).
function stopSpeech() {
  if (!("speechSynthesis" in window)) return;
  try { speechSynthesis.cancel(); } catch {}
  _speaking = false; setSpeakBtn(false);
}
function toggleSpeak() {
  if (!("speechSynthesis" in window)) { toast(t("tNoTTS")); return; }
  if (_speaking) { stopSpeech(); haptic(); return; }
  const q = currentQuote(); if (!q) return;
  let text = `${tq(q, "text")} — ${q.author}`;
  if (q.action) text += `. ${t("moveLabel")}: ${tq(q, "action")}`;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = TTS_LANG[lang()] || "en-US";
  u.onend = () => { _speaking = false; setSpeakBtn(false); };
  u.onerror = () => { _speaking = false; setSpeakBtn(false); };
  try { speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { return; }
  _speaking = true; setSpeakBtn(true); haptic();
  setMediaSession(q);
}
// Progressive enhancement: lock-screen / headset controls. Never let this break TTS.
function setMediaSession(q) {
  if (!("mediaSession" in navigator)) return;
  try {
    const snippet = tq(q, "text");
    navigator.mediaSession.metadata = new MediaMetadata({
      title: snippet.length > 80 ? snippet.slice(0, 77) + "…" : snippet,
      artist: q.author,
      album: "Hitaarth"
    });
    navigator.mediaSession.setActionHandler("play", () => { if (!_speaking) toggleSpeak(); });
    navigator.mediaSession.setActionHandler("pause", () => stopSpeech());
    navigator.mediaSession.setActionHandler("stop", () => stopSpeech());
  } catch {}
}

// ---------- share ----------
function quoteShareText(q) { return `${tq(q, "text")}\n— ${q.author}\n\nvia Hitaarth · ${SITE}/?s=card`; }

function openShareMenu() {
  const q = currentQuote(); if (!q) return;
  const dlg = $("#shareSheet");
  const cur = state.settings.cardStyle || "noir";
  $$(".card-style").forEach(b => {
    b.classList.toggle("on", b.dataset.style === cur);
    b.onclick = () => {
      state.settings.cardStyle = b.dataset.style; saveSettings(); track("style-" + b.dataset.style);
      $$(".card-style").forEach(x => x.classList.toggle("on", x === b));
    };
  });
  $("#shareStatusBtn").onclick = () => { dlg.close(); track("share-status"); saveQuoteImage("status"); };
  $("#shareImageFullBtn").onclick = () => { dlg.close(); track("share-card-full"); saveQuoteImage("full"); };
  $("#shareImageBtn").onclick = () => { dlg.close(); track("share-card-small"); saveQuoteImage("small"); };
  $("#shareTextBtn").onclick = () => { dlg.close(); track("share-text"); shareText(); };
  dlg.showModal();
}
async function saveQuoteImage(mode) {
  const q = currentQuote(); if (!q) return;
  toast(t("tRendering"));
  let blob; try {
    blob = await (mode === "full" ? renderQuoteImageFull(q)
                : mode === "status" ? renderQuoteImageStatus(q)
                : renderQuoteImage(q));
  } catch { blob = null; }
  if (!blob) { toast(t("tCantImage")); return; }
  await shareCanvasBlob(blob, `hitaarth-${q.id}${mode === "small" ? "" : "-" + mode}`, quoteShareText(q));
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
    toast(t("tCopiedClip"));
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast(t("tCopiedClip")); }
    catch { toast(t("tCantShare")); }
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
  toast(t("tImageSaved"));
}

function toggleNote() {
  const q = currentQuote(); if (!q) return;
  const dlg = $("#noteSheet"), ta = $("#noteText");
  ta.value = state.notes[q.id] || "";
  dlg.showModal();
  $("#noteSave").onclick = () => { state.notes[q.id] = ta.value.trim(); if (state.notes[q.id]) track("note"); store.set("notes", state.notes); refreshActionBar(); renderSaved(); };
}

// ---------- quote -> shareable PNG (1080x1350, vanilla canvas) ----------
// Card style templates — free tier. Each style owns its palette + background painter.
const CARD_STYLES = {
  noir: {
    fg: "#F4F4F2", muted: "#8a8a8e", accent: "#FF5F6D", accent2: "#FFA63D",
    lesson: "#e4e4e7", line: "rgba(244,244,242,0.16)", chip: "rgba(255,95,109,0.5)",
    paint(ctx, W, H) { ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, W, H); }
  },
  paper: {
    fg: "#1D1912", muted: "#8A8378", accent: "#C13440", accent2: "#B45309",
    lesson: "#3F3A30", line: "rgba(29,25,18,0.18)", chip: "rgba(193,52,64,0.55)",
    paint(ctx, W, H) { ctx.fillStyle = "#FAF7F2"; ctx.fillRect(0, 0, W, H); }
  },
  dusk: {
    fg: "#F4F4F2", muted: "#9A97A6", accent: "#FF5F6D", accent2: "#FFA63D",
    lesson: "#E4E4E7", line: "rgba(244,244,242,0.16)", chip: "rgba(255,95,109,0.5)",
    paint(ctx, W, H) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#1A1030"); g.addColorStop(0.55, "#0B0817"); g.addColorStop(1, "#07070A");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const r = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, H * 0.55);
      r.addColorStop(0, "rgba(255,95,109,0.10)"); r.addColorStop(1, "rgba(255,95,109,0)");
      ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    }
  }
};
function activeCardStyle() { return CARD_STYLES[state.settings.cardStyle] || CARD_STYLES.noir; }
// Devanagari needs a capable font and taller lines (matras stack above/below the base glyphs).
const DEVA_RE = /[ऀ-ॿ]/;
function isDevanagari(s) { return DEVA_RE.test(String(s)); }
function cardFont(text) {
  const SERIF = 'Georgia, "Times New Roman", serif';
  if (isDevanagari(text)) return '"Noto Serif Devanagari", "Noto Sans Devanagari", "Mangal", "Nirmala UI", serif';
  return ((getComputedStyle(document.documentElement).getPropertyValue("--quote-font")) || SERIF).trim() || SERIF;
}
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
function drawBrandFooter(ctx, W, H, PAD, SANS, qr, S = CARD_STYLES.noir) {
  const footY = H - 210;
  ctx.strokeStyle = S.line;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(PAD, footY); ctx.lineTo(W - PAD, footY); ctx.stroke();
  if (qr) {                                  // QR bottom-right on a white quiet-zone
    const qs = 130, qx = W - PAD - qs, qy = H - PAD - qs - 4;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(qx - 12, qy - 12, qs + 24, qs + 24);
    ctx.drawImage(qr, qx, qy, qs, qs);
  }
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = S.fg; ctx.font = `800 36px ${SANS}`;
  ctx.fillText("Hitaarth", PAD, footY + 66);
  ctx.fillStyle = S.muted; ctx.font = `600 25px ${SANS}`;
  ctx.fillText(SITE, PAD, footY + 106);
  ctx.fillText("One idea. One move. Every day.", PAD, footY + 142);
}
async function renderQuoteImage(q) {
  try { await document.fonts.ready; } catch {}
  const qr = await loadQR();
  return new Promise((resolve) => {
    const W = 1080, H = 1350, PAD = 96;
    const SERIF = 'Georgia, "Times New Roman", serif';
    const SANS = '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
    const S = activeCardStyle();
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    S.paint(ctx, W, H);

    // opening quote mark
    ctx.fillStyle = S.accent;
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
    const qtext = tq(q, "text");
    const QFONT = cardFont(qtext);
    const fit = fitText(ctx, qtext, maxW, maxTextH, 64, 28, isDevanagari(qtext) ? 1.6 : 1.32, QFONT, 600);
    ctx.fillStyle = S.fg;
    ctx.font = `600 ${fit.size}px ${QFONT}`;
    ctx.textBaseline = "top";
    let y = topY;
    fit.lines.forEach(line => { ctx.fillText(line, PAD, y); y += fit.lineH; });

    // author
    ctx.fillStyle = S.accent2;
    ctx.font = `700 38px ${SANS}`;
    ctx.fillText(`— ${q.author}`, PAD, y + 34);

    drawBrandFooter(ctx, W, H, PAD, SANS, qr, S);
    canvas.toBlob(b => resolve(b), "image/png");
  });
}
// WhatsApp Status / story card: 1080x1920, quote block vertically centered above the brand footer.
async function renderQuoteImageStatus(q) {
  try { await document.fonts.ready; } catch {}
  const qr = await loadQR();
  return new Promise((resolve) => {
    const W = 1080, H = 1920, PAD = 110;
    const SERIF = 'Georgia, "Times New Roman", serif';
    const SANS = '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
    const qtext = tq(q, "text");
    const QFONT = cardFont(qtext);
    const S = activeCardStyle();
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    S.paint(ctx, W, H);
    ctx.textAlign = "left";

    const maxW = W - PAD * 2;
    const footY = H - 210;
    const markH = 200, authorH = 120;
    const maxTextH = footY - PAD - markH - authorH - 120;
    const fit = fitText(ctx, qtext, maxW, maxTextH, 78, 32, isDevanagari(qtext) ? 1.62 : 1.42, QFONT, 600);
    const blockH = markH + fit.lines.length * fit.lineH + authorH;
    let y = PAD + Math.max(0, (footY - PAD - blockH) / 2);

    ctx.fillStyle = S.accent; ctx.globalAlpha = 0.5;
    ctx.textBaseline = "alphabetic"; ctx.font = `700 250px ${SERIF}`;
    ctx.fillText("“", PAD - 8, y + 170);
    ctx.globalAlpha = 1;
    y += markH;

    ctx.fillStyle = S.fg; ctx.font = `600 ${fit.size}px ${QFONT}`; ctx.textBaseline = "top";
    fit.lines.forEach(line => { ctx.fillText(line, PAD, y); y += fit.lineH; });

    ctx.fillStyle = S.accent2; ctx.font = `700 42px ${SANS}`;
    ctx.fillText(`— ${q.author}`, PAD, y + 44);

    drawBrandFooter(ctx, W, H, PAD, SANS, qr, S);
    canvas.toBlob(b => resolve(b), "image/png");
  });
}
function rrect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
// Full-card image: mirrors the app card (selected quote font, white author + coral category chip,
// coral lesson accent, Did-it pill, kicker hierarchy) and centers the content block in the card.
async function renderQuoteImageFull(q) {
  try { await document.fonts.ready; } catch {}
  const qr = await loadQR();
  return new Promise((resolve) => {
    const W = 1080, H = 1350, PAD = 80;
    const SERIF = 'Georgia, "Times New Roman", serif';
    const SANS = '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif';
    const QFONT = cardFont(tq(q, "text"));
    const QRATIO = isDevanagari(tq(q, "text")) ? 1.6 : 1.34;
    const S = activeCardStyle();
    const FG = S.fg, MUTED = S.muted, CORAL = S.accent;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    S.paint(ctx, W, H);
    ctx.textAlign = "left";
    const maxW = W - PAD * 2;
    const topY = PAD;
    const footTop = H - 210;
    const availH = footTop - topY - 16;

    function build(scale) {
      const px = n => Math.max(8, Math.round(n * scale));
      const Q = px(54), A = px(38), K = px(21), L = px(33), Mv = px(32), Src = px(26);
      const els = [];

      // quote mark
      els.push({ gap: 0, h: px(86), draw: (y) => {
        ctx.globalAlpha = 0.5; ctx.fillStyle = CORAL; ctx.textBaseline = "alphabetic";
        ctx.font = `700 ${px(116)}px ${SERIF}`; ctx.fillText("“", PAD - 6, y + px(84)); ctx.globalAlpha = 1;
      }});

      // quote text (app font)
      ctx.font = `600 ${Q}px ${QFONT}`;
      const ql = wrapText(ctx, tq(q, "text"), maxW);
      const qlh = Math.round(Q * QRATIO);
      els.push({ gap: px(16), h: ql.length * qlh, draw: (y) => {
        ctx.fillStyle = FG; ctx.font = `600 ${Q}px ${QFONT}`; ctx.textBaseline = "top";
        let yy = y; ql.forEach(l => { ctx.fillText(l, PAD, yy); yy += qlh; });
      }});

      // byline: author (white) + category chip (coral outline)
      ctx.font = `700 ${A}px ${SANS}`;
      const authorLines = wrapText(ctx, q.author, maxW);
      const alh = Math.round(A * 1.26);
      const lastW = ctx.measureText(authorLines[authorLines.length - 1]).width;
      const label = q.category ? q.category.toUpperCase() : "";
      const cs = px(20), chipPadX = px(11), chipH = cs + px(12);
      ctx.font = `700 ${cs}px ${SANS}`;
      const chipW = label ? ctx.measureText(label).width + chipPadX * 2 : 0;
      const inline = label && (lastW + px(16) + chipW) <= maxW;
      const bylineH = (authorLines.length - 1) * alh + Math.max(A, inline ? chipH : 0) + (label && !inline ? chipH + px(12) : 0);
      els.push({ gap: px(26), h: bylineH, draw: (y) => {
        ctx.textBaseline = "top"; ctx.fillStyle = FG; ctx.font = `700 ${A}px ${SANS}`;
        let yy = y;
        for (let i = 0; i < authorLines.length; i++) { ctx.fillText(authorLines[i], PAD, yy); if (i < authorLines.length - 1) yy += alh; }
        if (label) {
          let cx, cy;
          if (inline) { ctx.font = `700 ${A}px ${SANS}`; const lw = ctx.measureText(authorLines[authorLines.length - 1]).width; cx = PAD + lw + px(16); cy = yy + Math.round((A - chipH) / 2) + px(2); }
          else { cx = PAD; cy = yy + alh + px(2); }
          ctx.strokeStyle = S.chip; ctx.lineWidth = 2;
          rrect(ctx, cx, cy, chipW, chipH, chipH / 2); ctx.stroke();
          ctx.fillStyle = CORAL; ctx.font = `700 ${cs}px ${SANS}`; ctx.textBaseline = "top";
          ctx.fillText(label, cx + chipPadX, cy + px(6));
        }
      }});

      // lesson: coral left accent + kicker + italic
      if (q.lesson) {
        const indent = px(18);
        ctx.font = `italic 400 ${L}px ${SANS}`;
        const ll = wrapText(ctx, tq(q, "lesson"), maxW - indent);
        const klh = Math.round(K * 1.55), llh = Math.round(L * 1.34);
        const h = klh + ll.length * llh;
        els.push({ gap: px(26), h, draw: (y) => {
          ctx.strokeStyle = CORAL; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(PAD + 1.5, y + px(1)); ctx.lineTo(PAD + 1.5, y + h - px(2)); ctx.stroke();
          ctx.textBaseline = "top"; ctx.fillStyle = MUTED; ctx.font = `800 ${K}px ${SANS}`;
          ctx.fillText(t("lessonLabel").toUpperCase(), PAD + indent, y);
          ctx.fillStyle = S.lesson; ctx.font = `italic 400 ${L}px ${SANS}`;
          let yy = y + klh; ll.forEach(l => { ctx.fillText(l, PAD + indent, yy); yy += llh; });
        }});
      }

      // today's move: kicker + text
      if (q.action) {
        ctx.font = `600 ${Mv}px ${SANS}`;
        const ml = wrapText(ctx, tq(q, "action"), maxW);
        const klh = Math.round(K * 1.55), mlh = Math.round(Mv * 1.3);
        const h = klh + ml.length * mlh;
        els.push({ gap: px(24), h, draw: (y) => {
          ctx.textBaseline = "top"; ctx.fillStyle = MUTED; ctx.font = `800 ${K}px ${SANS}`;
          ctx.fillText(t("moveLabel").toUpperCase(), PAD, y);
          ctx.fillStyle = FG; ctx.font = `600 ${Mv}px ${SANS}`;
          let yy = y + klh; ml.forEach(l => { ctx.fillText(l, PAD, yy); yy += mlh; });
        }});
      }

      // source: kicker + muted text
      if (q.source) {
        ctx.font = `400 ${Src}px ${SANS}`;
        const sl = wrapText(ctx, q.source, maxW);
        const klh = Math.round(K * 1.55), slh = Math.round(Src * 1.3);
        const h = klh + sl.length * slh;
        els.push({ gap: px(24), h, draw: (y) => {
          ctx.textBaseline = "top"; ctx.fillStyle = MUTED; ctx.font = `800 ${K}px ${SANS}`;
          ctx.fillText(t("sourceLabel").toUpperCase(), PAD, y);
          ctx.fillStyle = MUTED; ctx.font = `400 ${Src}px ${SANS}`;
          let yy = y + klh; sl.forEach(l => { ctx.fillText(l, PAD, yy); yy += slh; });
        }});
      }

      const blockH = els.reduce((s, e) => s + e.gap + e.h, 0);
      return { els, blockH };
    }

    let scale = 1, layout = build(1);
    while (layout.blockH > availH && scale > 0.5) { scale -= 0.05; layout = build(scale); }
    let y = topY + Math.max(0, (availH - layout.blockH) / 2);   // vertically centered
    for (const e of layout.els) { y += e.gap; e.draw(y); y += e.h; }

    drawBrandFooter(ctx, W, H, PAD, SANS, qr, S);
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
  toast(t("tRendering"));
  let blob; try { blob = await renderStreakImage(n); } catch { blob = null; }
  if (!blob) { toast(t("tCantImage")); return; }
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

// ---------- tabs / screens ----------
function bindTabs() {
  $$(".tab").forEach(tb => tb.onclick = () => showScreen(tb.dataset.screen, tb));
}
function showScreen(name, tabEl) {
  stopSpeech();                                   // don't keep reading after leaving the reader
  $$(".screen").forEach(s => { s.hidden = (s.id !== name); s.classList.toggle("active", s.id === name); });
  $$(".tab").forEach(tb => tb.classList.remove("active"));
  (tabEl || $(`.tab[data-screen="${name}"]`)).classList.add("active");
  $("#actions").style.display = name === "reader" ? "flex" : "none";
  if (name === "saved") renderSaved();
  if (name === "browse") renderBrowse();
}

// ---------- saved (favorites + notes) ----------
function hasNote(id) { return !!(state.notes[id] && state.notes[id].trim()); }
function renderSaved() {
  const wrap = $("#savedList"); if (!wrap) return;
  // Show anything the user has acted on: a favorite, a note, or both.
  const items = state.quotes.filter(q => state.favorites.has(q.id) || hasNote(q.id));
  $("#savedEmpty").hidden = items.length > 0;
  wrap.innerHTML = items.map(q => {
    const note = hasNote(q.id)
      ? `<div class="note"><span class="kicker">${t("noteLabel")}</span><span class="note-text">${escapeHTML(state.notes[q.id])}</span><button class="note-del" data-del="${escapeHTML(q.id)}" aria-label="Delete note"><svg class="ic-svg" aria-hidden="true"><use href="#i-x"/></svg></button></div>`
      : "";
    return `<div class="item"><div class="t">${escapeHTML(tq(q, "text"))}</div><div class="a">— ${escapeHTML(q.author)}</div>${note}</div>`;
  }).join("");
  $$(".note-del", wrap).forEach(b => b.onclick = () => deleteNote(b.dataset.del));
}
function deleteNote(id) {
  delete state.notes[id];
  store.set("notes", state.notes);
  refreshActionBar(); renderSaved(); haptic();
}

// ---------- browse (by genre / by author) ----------
const GENRE_ORDER = ["Stoicism", "Eastern Wisdom", "Building & Startups", "Systems & Science", "Strategy & Money", "Craft & Creativity", "Mind & Character", "Cinema"];
let browseMode = "genre", browseSel = null, browseQuery = "";
function openQuote(id) {
  const idx = state.quotes.findIndex(q => q.id === id);
  if (idx < 0) return;
  state.current = idx;
  showScreen("reader");
  const feed = $("#feed"); const cards = $$(".quote", feed);
  const pos = cards.findIndex(c => +c.dataset.i === idx);
  if (pos >= 0) feed.scrollTo({ top: pos * feed.clientHeight, behavior: "auto" });
  refreshActionBar();
}
function bindBrowse() {
  $$("[data-browse]").forEach(b => b.onclick = () => { browseMode = b.dataset.browse; browseSel = null; browseQuery = ""; const sb = $("#browseSearch"); if (sb) sb.value = ""; renderBrowse(); });
  const s = $("#browseSearch");
  if (s) s.oninput = () => { browseQuery = s.value; browseSel = null; renderBrowse(); };
}
function quoteHaystack(q) {
  return [tq(q, "text"), q.author, tq(q, "lesson"), tq(q, "action"), q.category, q.genre, q.text, q.source].join(" | ").toLowerCase();
}
function quoteRow(q) {
  return `<div class="item item-open" data-open="${escapeHTML(q.id)}"><div class="t">${escapeHTML(tq(q, "text"))}</div><div class="a">— ${escapeHTML(q.author)}</div></div>`;
}
function renderBrowse() {
  const wrap = $("#browseList"); if (!wrap) return;
  $$("[data-browse]").forEach(b => b.classList.toggle("on", b.dataset.browse === browseMode));
  const query = browseQuery.trim().toLowerCase();
  if (query) {
    const items = state.quotes.filter(q => quoteHaystack(q).includes(query));
    const head = items.length ? `${items.length} ${items.length === 1 ? t("resultOne") : t("resultMany")}` : t("noResults");
    wrap.innerHTML = `<div class="browse-head">${head}</div>` + items.map(quoteRow).join("");
  } else if (browseSel != null) {
    const items = state.quotes.filter(q => (browseMode === "genre" ? q.genre : q.author) === browseSel);
    wrap.innerHTML =
      `<button type="button" class="browse-back" id="browseBack">${t("browseBack")}</button>` +
      `<div class="browse-head">${escapeHTML(browseSel)} · ${items.length}</div>` +
      items.map(quoteRow).join("");
    $("#browseBack").onclick = () => { browseSel = null; renderBrowse(); };
  } else {
    let groups;
    if (browseMode === "genre") {
      groups = GENRE_ORDER.filter(g => state.quotes.some(q => q.genre === g))
        .map(g => ({ key: g, n: state.quotes.filter(q => q.genre === g).length }));
    } else {
      groups = [...new Set(state.quotes.map(q => q.author))]
        .map(a => ({ key: a, n: state.quotes.filter(q => q.author === a).length }));
    }
    groups.sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));
    wrap.innerHTML = groups.map(g =>
      `<button type="button" class="browse-group" data-group="${escapeHTML(g.key)}"><span class="bg-name">${escapeHTML(g.key)}</span><span class="bg-count">${g.n}</span></button>`).join("");
    $$(".browse-group", wrap).forEach(b => b.onclick = () => { browseSel = b.dataset.group; renderBrowse(); });
  }
  $$(".item-open", wrap).forEach(el => el.onclick = () => openQuote(el.dataset.open));
}

// ---------- settings ----------// ---------- settings ----------
function bindSettings() {
  // expandable cards
  $$(".row[data-toggle]").forEach(r => r.onclick = () => r.closest(".card").classList.toggle("open"));

  // language
  $$("[data-lang]").forEach(b => b.onclick = () => applyLanguage(b.dataset.lang));
  // appearance
  $$("[data-appearance]").forEach(b => b.onclick = () => { state.settings.appearance = b.dataset.appearance; saveSettings(); });
  // theme packs (skins) — premium ones open the paywall until unlocked
  $$(".skin").forEach(b => b.onclick = () => {
    const sk = b.dataset.skin;
    if (PREMIUM_SKINS.has(sk) && !state.settings.premium) { openPaywall(); return; }
    state.settings.skin = sk === "noir" ? "" : sk; saveSettings();
  });
  // fonts — premium faces open the paywall until unlocked
  $$(".font-opt").forEach(b => b.onclick = () => {
    if (PREMIUM_FONTS.has(b.dataset.font) && !state.settings.premium) { openPaywall(); return; }
    state.settings.font = b.dataset.font; saveSettings();
  });
  // size
  $("#sizeRange").oninput = (e) => { state.settings.size = +e.target.value; saveSettings(); };
  // reminders
  $("#remToggle").onchange = async (e) => {
    if (e.target.checked) {
      if (typeof Notification === "undefined") {                  // older iOS Safari: no Notification API
        e.target.checked = false; state.settings.reminders = false;
        toast(t("tRemUnsupported"));
        saveSettings(); return;
      }
      const ok = await Notification.requestPermission();
      state.settings.reminders = ok === "granted";
      if (ok !== "granted") e.target.checked = false; else track("reminder-on");
    } else {
      state.settings.reminders = false;
    }
    saveSettings();
    scheduleReminder();
    if (state.settings.reminders) {                               // one-shot bell ring when armed
      const ic = $('[data-toggle="reminders"] .ic');
      if (ic) { ic.classList.remove("ring"); void ic.offsetWidth; ic.classList.add("ring"); ic.onanimationend = () => ic.classList.remove("ring"); }
    }
  };
  $("#remTime").onchange = (e) => { state.settings.remTime = e.target.value; saveSettings(); scheduleReminder(); };
  $("#remTime").onclick = (e) => { try { e.target.showPicker(); } catch (_) {} }; // desktop: open the clock dropdown (indicator is hidden)
  // share streak
  const ssb = $("#shareStreakBtn"); if (ssb) ssb.onclick = shareStreak;
  // premium
  $("#premiumBtn").onclick = (ev) => { ev.preventDefault(); openPaywall(); };
  // Demand signal for premium: no payment rails yet, just count raised hands.
  const cta = $("#pwCta"); if (cta) cta.onclick = () => {
    if (!store.get("notifyMe", false)) { store.set("notifyMe", true); track("notify-me"); }
    cta.textContent = t("pwCtaDone");
    toast(t("tNotifyMe"));
  };
  // reset
  $("#resetBtn").onclick = () => { localStorage.removeItem("settings"); state.settings = { appearance: "dark", skin: "", font: "fraunces", size: 22, reminders: false, remTime: "08:00", premium: false, lang: lang(), cardStyle: "noir" }; saveSettings(); scheduleReminder(); };

  syncSettingsUI();
}
// Premium gates — checked against state.settings.premium before applying.
const PREMIUM_SKINS = new Set(["dawn", "ink", "forest"]);
const PREMIUM_FONTS = new Set(["playfair", "cormorant", "spectral"]);
function openPaywall() {
  const d = $("#paywall"); if (!d) return;
  track("paywall");
  const c = $("#pwCta"); if (c) c.textContent = store.get("notifyMe", false) ? t("pwCtaDone") : t("pwCta");
  d.showModal();
}

function saveSettings() { store.set("settings", state.settings); applySettings(); syncSettingsUI(); }
function applySettings() {
  const s = state.settings;
  document.documentElement.dataset.theme = s.appearance;
  if (s.skin) document.documentElement.dataset.skin = s.skin; else delete document.documentElement.dataset.skin;
  document.documentElement.dataset.premium = s.premium ? "1" : "0";
  const fam = s.font === "mono" ? 'ui-monospace,Menlo,Consolas,monospace'
            : s.font === "cursive" ? '"Snell Roundhand","Brush Script MT",cursive'
            : s.font === "playfair" ? '"Playfair Display",Georgia,serif'
            : s.font === "fraunces" ? '"Fraunces",Georgia,serif'
            : s.font === "cormorant" ? '"Cormorant Garamond",Georgia,serif'
            : s.font === "spectral" ? '"Spectral",Georgia,serif'
            : s.font === "georgia" ? 'Georgia, "Times New Roman", serif'
            : '-apple-system,system-ui,"Segoe UI",Roboto,sans-serif';
  document.documentElement.style.setProperty("--quote-font", fam);
  document.documentElement.style.setProperty("--quote-size", s.size + "px");
}
function syncSettingsUI() {
  const s = state.settings;
  $$("[data-lang]").forEach(b => b.classList.toggle("on", b.dataset.lang === lang()));
  $$("[data-appearance]").forEach(b => b.classList.toggle("on", b.dataset.appearance === s.appearance));
  $$(".skin").forEach(b => b.classList.toggle("on", (s.skin || "noir") === b.dataset.skin));
  $$(".font-opt").forEach(b => b.classList.toggle("on", b.dataset.font === s.font));
  $("#sizeRange").value = s.size; $("#sizeVal").textContent = s.size;
  $("#remToggle").checked = s.reminders; $("#remTime").value = s.remTime;
  const remCard = $("#remToggle").closest(".card"); if (remCard) remCard.classList.toggle("rem-on", s.reminders);
  $("#remNote").textContent = t("remNote");
  const ln = $("#langNote"); if (ln) ln.textContent = t("langNote");
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
  const body = q ? `${tq(q, "text")} — ${q.author}` : "A moment of stillness is waiting.";
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
  const dEl = $("#streakDays"); if (!dEl) return;
  dEl.textContent = (data.count === 1 ? t("dayOne") : t("dayMany")).replace("{n}", data.count);
  $("#streakLevel").textContent = t("levelTo").replace("{level}", level).replace("{m}", milestone);
  const ring = $("#streakRing");
  if (ring) {
    const C = 2 * Math.PI * 32;                          // matches r="32" in the ring SVG
    ring.style.strokeDashoffset = String(C * (1 - pct / 100));
  }
  const seals = $("#streakSeals");
  if (seals) seals.innerHTML = Array.from({ length: milestone }, (_, i) => `<span class="seal${i < dayInLevel ? " on" : ""}"></span>`).join("");
  const left = milestone - dayInLevel;
  $("#streakNext").textContent = left === 0 ? t("milestoneReached")
    : (left === 1 ? t("nextMilestone") : t("nextMilestoneN")).replace("{n}", left);
  const fz = $("#streakFreeze");
  if (fz) fz.textContent = data.freezes
    ? (data.freezes === 1 ? t("freezeBanked") : t("freezeBankedN")).replace("{n}", data.freezes)
    : t("freezeEarn");
  updateActionsStat();
}

// ---------- utils ----------
function escapeHTML(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function haptic() {
  // Skip if there's been no user gesture yet (e.g. ?go=surprise on load) — the browser
  // blocks vibrate without activation and logs a console intervention otherwise.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { navigator.vibrate?.(8); } catch {}
}
function toast(msg) { const el = $("#toast"); el.textContent = msg; el.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => el.hidden = true, 1300); }
