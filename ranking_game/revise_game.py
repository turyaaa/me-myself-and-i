from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('margin:36px auto 22px;', 'margin:12px auto 22px;')
s=s.replace('<div class="gscale"><span id="gmin"></span><span id="gmax"></span></div>', '<div class="gscale"><span id="gmin"></span><span id="gmax"></span></div>\n    <div class="scale-tools"><button type="button" id="gzoom">Звузити діапазон ×10</button><button type="button" id="greset">Увесь діапазон</button></div>')
s=s.replace('  :focus-visible {', '  .scale-tools { display:flex; flex-wrap:wrap; justify-content:center; gap:8px; margin-bottom:16px; }\n  .scale-tools button { padding:9px 12px; border:1px solid var(--line); border-radius:9px; background:var(--card); color:var(--ink); font:13px system-ui; cursor:pointer; }\n  .scale-tools button:disabled { opacity:.45; cursor:default; }\n  :focus-visible {')
start=s.index('// Діапазон повзунка:')
end=s.index('\nfunction guessScore',start)
s=s[:start]+'''// All sliders are linear: the same movement always means the same difference.
// The log-based relative-error scoring below is independent of the slider.
function linearScale(lo, hi, step) {
  const decimals = Math.max(0, Math.min(3, Math.round(-Math.log10(step))));
  const clean = v => Number(v.toFixed(decimals));
  const clamp = v => Math.min(hi, Math.max(lo, v));
  return {
    minLabel:lo, maxLabel:hi, step, decimals,
    ticks:Math.max(1, Math.round((hi-lo)/step)),
    toVal:p => clean(clamp(lo+Math.round(Math.min(1,Math.max(0,p))*(hi-lo)/step)*step)),
    toPos:v => Math.min(1, Math.max(0, (v-lo)/(hi-lo))),
  };
}
function makeScale(cat, whole) {
  const vals=cat.items.map(i=>i[1]), vmin=Math.min(...vals), vmax=Math.max(...vals);
  if (isYear(cat)) {
    const span=vmax-vmin, unit=span<=100?5:span<=500?10:50;
    const margin=Math.max(5,span*.1);
    const lo=Math.max(1,Math.floor((vmin-margin)/unit)*unit);
    const hi=Math.max(vmax, Math.min(THIS_YEAR,Math.ceil((vmax+margin)/unit)*unit));
    return linearScale(lo,Math.max(lo+1,hi),1);
  }
  const decimals=whole?0:Math.min(3,Math.max(...vals.map(v=>(String(v).split('.')[1]||'').length)));
  const step=10**(-decimals), span=Math.max(vmax-vmin,vmax*.2);
  const rough=span/10, magnitude=10**Math.floor(Math.log10(rough));
  const nice=[1,2,5,10].map(n=>n*magnitude).find(n=>n>=rough);
  const lo=Math.max(step,Math.floor((vmin-span*.1)/nice)*nice);
  const hi=Math.ceil((vmax+span*.1)/nice)*nice;
  return linearScale(Number(lo.toFixed(decimals)),Number(Math.max(lo+step,hi).toFixed(decimals)),step);
}
const gfmt = (cur,v) => String(Number(v.toFixed(cur.sc.decimals)));
const glab = (cur,v) => isYear(cur.cat) ? String(Math.round(v)) : fmt(v);
function updateGuessSlider(value) {
  const {sc}=V.cur;
  const slider=$("gslider"); slider.max=sc.ticks; slider.value=Math.round(sc.toPos(value)*sc.ticks);
  slider.setAttribute("aria-valuetext",fv(V.cur.cat,value)+" "+V.cur.cat.unit);
  $("gmin").textContent=glab(V.cur,sc.minLabel); $("gmax").textContent=glab(V.cur,sc.maxLabel);
  $("gzoom").disabled=sc.ticks<=20;
  $("greset").disabled=sc===V.cur.bounds;
}
function refineGuessScale(reset=false) {
  if (!V || V.phase!=="guess") return;
  const cur=V.cur, value=parseNum($("gval").value), base=cur.bounds;
  if (!Number.isFinite(value) || value<base.minLabel || value>base.maxLabel) { $("gerr").textContent="Спочатку введи число в межах повного діапазону."; return; }
  if (reset) cur.sc=base;
  else {
    const width=Math.min(base.maxLabel-base.minLabel,Math.max(20*base.step,(cur.sc.maxLabel-cur.sc.minLabel)/10));
    let lo=Math.max(base.minLabel,Math.min(base.maxLabel-width,value-width/2));
    lo=Number((Math.round(lo/base.step)*base.step).toFixed(base.decimals));
    const hi=Number(Math.min(base.maxLabel,lo+Math.ceil(width/base.step)*base.step).toFixed(base.decimals));
    cur.sc=linearScale(lo,hi,base.step);
  }
  updateGuessSlider(value); $("gerr").textContent="";
}
''' +s[end:]
s=s.replace('const whole = Number.isInteger(item[1]), sc = makeScale(cat, whole); V.cur = { cat, item, sc, whole };','const whole = cat.items.every(i => Number.isInteger(i[1])), sc = makeScale(cat, whole); V.cur = { cat, item, sc, bounds:sc, whole };')
s=s.replace('  $("gslider").max = isYear(cat) ? sc.maxLabel-sc.minLabel : 1000;\n  $("gslider").value = Math.round(Number($("gslider").max)/2);','  updateGuessSlider(mid);')
s=s.replace('"Бали залежать від відстані в часі: чим ближче рік, тим більше." : "Бали за відношення: ×1,1 → 83 · ×2 → 25 · ×5 → 4."','"Рівномірна шкала років · крок 1 рік. Ближча відповідь — більше балів." : "Рівномірна шкала. Для точності звузь діапазон або введи число. Бали: ×1,1 → 83 · ×2 → 25."')
s=s.replace('const { cat, item, sc } = V.cur;', 'const { cat, item, bounds:sc } = V.cur;')
s=s.replace('  $("gval").value = gfmt(V.cur, v);\n  $("gerr")','  $("gval").value = gfmt(V.cur, v);\n  $("gslider").setAttribute("aria-valuetext", fv(V.cur.cat,v)+" "+V.cur.cat.unit);\n  $("gerr")')
s=s.replace('$("gbtn").onclick =', '$("gzoom").onclick = () => refineGuessScale();\n$("greset").onclick = () => refineGuessScale(true);\n$("gbtn").onclick =')
p.write_text(s,encoding='utf-8')
