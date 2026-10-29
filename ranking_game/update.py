from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
def replace(a,b):
 global s
 assert a in s, a[:100]
 s=s.replace(a,b)
replace('</style>', '''/* Reserve a separate row for fixed navigation, including safe-area devices. */
  body, body.wide { padding-top:calc(64px + env(safe-area-inset-top)); }
  #gtext { display:grid; gap:10px; text-align:left; white-space:normal; }
  .gresult-row { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:14px 16px; border:1px solid var(--line); border-radius:12px; background:var(--card); }
  .gresult-row span { color:var(--muted); font-size:14px; }
  .gresult-row strong { text-align:right; overflow-wrap:anywhere; }
  .gresult-row.correct strong { color:var(--ok); }
  .gsummary { padding:12px; text-align:center; }
  #list .card:not(.reveal) { animation:none; }
  :focus-visible { outline:2px solid var(--icon); outline-offset:3px; }
  </style>''')
start=s.index('function drawItems(cat) {')
end=s.index('\n// ---------- РАУНД',start)
s=s[:start]+'''function drawItems(cat) {
  // Sorted greedy search is complete for a minimum additive/logarithmic gap.
  let q = G.queues[cat.title] || [];
  if (q.length < PER_ROUND) q = q.concat(shuffle(cat.items.filter(it => !q.includes(it))));
  const metric = it => cat.minDiff ? it[1] : Math.log(it[1]);
  const target = cat.minDiff || Math.log(cat.minRatio || 1.1);
  const select = (pool, gap) => {
    const sorted = pool.slice().sort((a,b) => metric(a)-metric(b));
    const candidates = [];
    for (let start=0; start<sorted.length; start++) {
      const chosen = [sorted[start]];
      for (let i=start+1; i<sorted.length && chosen.length<PER_ROUND; i++) {
        if (metric(sorted[i])-metric(chosen[chosen.length-1]) >= gap-1e-10) chosen.push(sorted[i]);
      }
      if (chosen.length===PER_ROUND) candidates.push(chosen);
    }
    return candidates.length ? candidates[Math.floor(Math.random()*candidates.length)] : null;
  };
  let chosen = select(q, target);
  if (!chosen) {
    q = q.concat(shuffle(cat.items.filter(it => !q.includes(it))));
    chosen = select(q, target);
  }
  if (!chosen) {
    // Find the largest feasible separation instead of an unchecked fallback.
    let lo=0, hi=target;
    chosen=select(q, 0);
    for (let i=0; i<32; i++) {
      const mid=(lo+hi)/2, trial=select(q, mid);
      if (trial) { lo=mid; chosen=trial; } else hi=mid;
    }
  }
  if (!chosen) throw new Error("Недостатньо карток для раунду.");
  G.queues[cat.title] = q.filter(it => !chosen.includes(it));
  return chosen.map(([name,value]) => ({name,value}));
}
''' +s[end:]
replace('THIS_YEAR = 2026','THIS_YEAR = new Date().getFullYear()')
start=s.index('  if (isYear(cat)) {   // шкала')
end=s.index('\n  let lo = vmin',start)
s=s[:start]+'''  if (isYear(cat)) {
    const margin = Math.max(5, Math.ceil((vmax-vmin)*0.08));
    const lo = Math.max(1, vmin-margin), hi = Math.max(lo+1, vmax, Math.min(THIS_YEAR, vmax+margin));
    return {
      toVal: p => Math.round(lo+(hi-lo)*Math.min(1,Math.max(0,p))),
      toPos: v => Math.min(1,Math.max(0,(v-lo)/(hi-lo))),
      minLabel:lo, maxLabel:hi,
    };
  }''' +s[end:]
replace('  if (!(g > 0)) return 0;', '  if (!Number.isFinite(g) || !(g > 0) || (isYear(cat) && !Number.isInteger(g))) return 0;')
replace('function confirmGuess() {\n', 'function confirmGuess() {\n  if (!V || V.phase !== "guess") return;\n')
replace('  if (!(g > 0)) { $("gerr").textContent = "Введи додатне число."; return; }', '''  if (!Number.isFinite(g) || !(g > 0)) { $("gerr").textContent = "Введи додатне скінченне число."; return; }
  if (isYear(cat) && !Number.isInteger(g)) { $("gerr").textContent = "Введи цілий рік."; return; }
  if (g < sc.minLabel || g > sc.maxLabel) { $("gerr").textContent = "Введи значення від " + fv(cat, sc.minLabel) + " до " + fv(cat, sc.maxLabel) + "."; return; }''')
replace('  $("gtext").textContent = text;', '''  const box = $("gtext"); box.replaceChildren();
  [["Правильно", fv(cat,t)+" "+cat.unit, "correct"], ["Твоя відповідь", fv(cat,g)+" "+cat.unit, ""], ["Відхилення", dev.replace(/^(Помилка|Відхилення): /, ""), ""]].forEach(([label,value,cls]) => {
    const row=document.createElement("div"); row.className="gresult-row "+cls;
    const caption=document.createElement("span"), result=document.createElement("strong");
    caption.textContent=label; result.textContent=value; row.append(caption,result); box.append(row);
  });
  if (V.phase === "end") { const summary=document.createElement("div"); summary.className="gsummary"; summary.textContent=text.split("\\n\\n")[1]; box.append(summary); }''')
replace('let editIdx = -1, editDraft = null;', 'let editIdx = -1, editDraft = null, editBaseline = "";\nconst editorDirty = () => !$("editor").hidden && !$("edit").hidden && JSON.stringify(editDraft) !== editBaseline;')
replace('  $("edlist").hidden = true; const box', '  editBaseline = JSON.stringify(editDraft);\n  $("edlist").hidden = true; const box')
replace('cancel.onclick = showEditorList;', 'cancel.onclick = () => navigate(showEditorList);')
replace('    saveCustom(); showEditorList();', '    if (!saveCustom()) { err.textContent = "Не вдалося зберегти. Експортуй питання або звільни місце у браузері."; return; }\n    showEditorList();')
replace('set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },','set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },')
replace('  if (!$("game").hidden) return !!G && (G.round > 1 || locked);','  if (!$("game").hidden) return !!G && mode !== "menu";')
replace('  if (!$("guess").hidden) return !!V && (V.round > 1 || V.phase !== "guess");','  if (!$("guess").hidden) return !!V && V.phase !== "end";')
replace('  if (inProgress() && !confirm(', '  if (editorDirty() && !confirm("Вийти з редактора? Незбережені зміни буде втрачено.")) return;\n  if (inProgress() && !confirm(')
replace('$("back").onclick = () => {','$("back").onclick = () => navigate(() => {')
replace('  showHome();\n};\n$("mode-rank")','  showHome();\n});\nwindow.addEventListener("beforeunload", e => { if (editorDirty() || inProgress()) { e.preventDefault(); e.returnValue = ""; } });\n$("mode-rank")')
replace('  row.push(cell); if (row.some(x => x.trim())) rows.push(row);','  if (inQ) throw new Error("незакриті лапки у CSV");\n  row.push(cell); if (row.some(x => x.trim())) rows.push(row);')
replace('    name = String(name || "").trim(); if (!name) return null;', '    if (typeof name !== "string") return null;\n    name = name.trim(); if (!name || name.length > 30) return null;')
replace('    q = String(q || "").trim(); a = String(a || "").trim();','    if (typeof q !== "string" || typeof a !== "string") { skipped++; return; }\n    q = q.trim(); a = a.trim();')
replace('    let slot = Math.round(Number(pts) / 100) - 1;\n    if (!(slot >= 0 && slot < 5)) slot = cat.qs.findIndex(p => !p[0]);\n    if (slot < 0)', '    let slot = pts == null ? cat.qs.findIndex(p => !p[0]) : QPTS.indexOf(Number(pts));\n    if (slot < 0 || cat.qs[slot][0])')
replace('    (Array.isArray(j) ? j : (j.categories || [])).forEach(cj => {','    const categories = Array.isArray(j) ? j : j && j.categories;\n    if (!Array.isArray(categories)) throw new Error("очікується масив categories");\n    categories.forEach(cj => {\n      if (!cj || typeof cj !== "object" || !Array.isArray(cj.questions || cj.qs)) { skipped++; return; }')
replace('(cj.questions || cj.qs || []).forEach(x => Array.isArray(x) ? addQ(c, 0, x[0], x[1]) : addQ(c, x.points ?? x.pts, x.q ?? x.question, x.a ?? x.answer));','(cj.questions || cj.qs).forEach((x,i) => { if (Array.isArray(x)) addQ(c, QPTS[i], x[0], x[1]); else if (x && typeof x === "object") addQ(c, x.points ?? x.pts, x.q ?? x.question, x.a ?? x.answer); else skipped++; });')
replace('if (rows.length && !Number.isFinite(Number(String(rows[0][1] || "").trim()))) rows.shift();', 'if (rows.length && /^(бали|points|pts)$/i.test(String(rows[0][1]).trim())) rows.shift();')
replace('const c = r.length >= 4 ?', 'const c = r.length === 4 ?')
start=s.index('  let qn = 0;\n  incoming.forEach')
end=s.index('\n}\nfunction initEditor',start)
s=s[:start]+'''  const merged = CUSTOM.map(c => ({name:c.name, qs:c.qs.map(p => p.slice())}));
  let qn=0, cats=0;
  incoming.forEach(c => {
    let ex=merged.find(x => x.name===c.name), added=0;
    if (!ex) ex={name:c.name, qs:Array.from({length:5},()=>["",""])};
    c.qs.forEach((p,i) => {
      if (!p[0] || !p[1]) return;
      if (ex.qs[i][0] || ex.qs[i][1]) { skipped++; return; }
      ex.qs[i]=p; qn++; added++;
    });
    if (added) { cats++; if (!merged.includes(ex)) merged.push(ex); }
  });
  if (qn && !store.set("custom_quiz", JSON.stringify(merged))) throw new Error("не вдалося зберегти питання у браузері");
  CUSTOM=merged;
  return {cats,qn,skipped};''' +s[end:]
p.write_text(s,encoding='utf-8')
