#!/usr/bin/env node
// Fails loudly if any locale is missing a quote translation or a UI string.
// Run before every push that touches quotes.json, app.js (I18N.en), or i18n/*.json:
//   node tools/check-i18n.js
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const LANGS = ["hi", "es", "fr"];

const quotes = JSON.parse(fs.readFileSync(path.join(root, "read", "quotes.json"), "utf8"));
const ids = quotes.map(q => q.id);

// English UI keys are the source of truth, declared in app.js (I18N.en { ... }).
const app = fs.readFileSync(path.join(root, "read", "app.js"), "utf8");
const enBlock = (app.match(/en:\s*\{([\s\S]*?)\n  \}/) || [])[1] || "";
// keys are `name: "..."` — matches multiple-per-line, ignores `word:` inside string values
const enKeys = [...enBlock.matchAll(/([A-Za-z][A-Za-z0-9]*):\s*"/g)].map(m => m[1]);

let failed = false;
for (const l of LANGS) {
  const file = path.join(root, "read", "i18n", `${l}.json`);
  let d;
  try { d = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { console.error(`[${l}] INVALID JSON: ${e.message}`); failed = true; continue; }

  const ui = d._ui || {};
  const missUi = enKeys.filter(k => !(k in ui));
  const missQ = ids.filter(id => !d[id] || !d[id].text || !d[id].lesson || !d[id].action);

  if (missUi.length) { failed = true; console.error(`[${l}] missing ${missUi.length} UI key(s): ${missUi.join(", ")}`); }
  if (missQ.length) { failed = true; console.error(`[${l}] missing ${missQ.length} quote translation(s): ${missQ.slice(0, 12).join(", ")}${missQ.length > 12 ? " …" : ""}`); }
  const orphans = Object.keys(ui).filter(k => !enKeys.includes(k));  // not a failure, just noise to clean up
  if (orphans.length) console.warn(`[${l}] note: ${orphans.length} unused _ui key(s) (not in I18N.en): ${orphans.join(", ")}`);
  if (!missUi.length && !missQ.length) console.log(`[${l}] OK — ${ids.length} quotes + ${enKeys.length} UI keys`);
}

if (failed) {
  console.error("\n✗ i18n check FAILED — add the missing entries to i18n/<lang>.json (text/lesson/action per quote id, and any new UI keys) before pushing.");
  process.exit(1);
}
console.log(`\n✓ i18n check PASSED — all ${LANGS.length} locales cover ${ids.length} quotes + ${enKeys.length} UI keys.`);
