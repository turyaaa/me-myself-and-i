from pathlib import Path
p=Path('index.html');s=p.read_text(encoding='utf-8')
s=s.replace('  #theme {','  #sound { position:fixed; top:max(10px, env(safe-area-inset-top)); right:54px; width:34px; height:34px; border-radius:50%; border:1px solid var(--line); background:var(--card); color:var(--muted); padding:7px; cursor:pointer; z-index:20; }\n  #sound[aria-pressed="true"] { color:var(--icon); border-color:var(--icon); }\n  #sound svg { display:block; width:100%; height:100%; }\n  #theme {')
marker='// ---------- ТЕМА ----------'
sound='''// ---------- ЗВУКИ: local synthesis, opt-in, no external audio files ----------
let soundEnabled = store.get("sound") === "on", audioContext = null, soundMaster = null;
const activeVoices = new Set();
const SOUND_NOTES = {
  click:[[640,0,.035]], move:[[480,0,.045],[660,.035,.055]],
  reveal:[[440,0,.07],[554,.055,.09]],
  success:[[523,0,.10],[659,.07,.11],[784,.14,.14]],
  error:[[220,0,.10],[175,.08,.14]],
  win:[[523,0,.12],[659,.09,.12],[784,.18,.12],[1047,.28,.22]],
};
function updateSoundButton() {
  const label=soundEnabled?"Вимкнути звуки":"Увімкнути звуки";
  $("sound").title=label; $("sound").setAttribute("aria-label",label);
  $("sound").setAttribute("aria-pressed",String(soundEnabled));
  $("sound").innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4Z"/>'+(soundEnabled?'<path d="M17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>':'<path d="m17 9 5 6m0-6-5 6"/>')+'</svg>';
}
async function playSound(kind) {
  if (!soundEnabled || document.hidden) return;
  try {
    const Audio=window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!audioContext || audioContext.state === "closed") {
      audioContext=new Audio(); soundMaster=audioContext.createGain();
      soundMaster.gain.value=.18; soundMaster.connect(audioContext.destination);
    }
    if (audioContext.state === "suspended") await audioContext.resume();
    if (!soundEnabled || document.hidden || audioContext.state!=="running") return;
    // No queues: rapid repeated gestures cannot build up a wall of sound.
    if (activeVoices.size>=8) return;
    const now=audioContext.currentTime;
    for (const [frequency,delay,duration] of SOUND_NOTES[kind] || SOUND_NOTES.click) {
      const oscillator=audioContext.createOscillator(), envelope=audioContext.createGain();
      oscillator.type=kind==="error"?"sine":"triangle";
      oscillator.frequency.value=frequency;
      const start=now+delay;
      envelope.gain.setValueAtTime(0,start);
      envelope.gain.linearRampToValueAtTime(.22,start+.008);
      envelope.gain.exponentialRampToValueAtTime(.001,start+duration);
      oscillator.connect(envelope); envelope.connect(soundMaster);
      activeVoices.add(oscillator);
      oscillator.onended=()=>{ activeVoices.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
      oscillator.start(start); oscillator.stop(start+duration+.01);
    }
  } catch (_) { /* Audio failures must never interrupt gameplay. */ }
}
function muteSounds() {
  if (soundMaster && audioContext) soundMaster.gain.setValueAtTime(0,audioContext.currentTime);
  for (const voice of activeVoices) { try { voice.stop(); } catch (_) {} }
  activeVoices.clear();
}
$("sound").onclick=()=>{
  soundEnabled=!soundEnabled; store.set("sound",soundEnabled?"on":"off");
  if (!soundEnabled) muteSounds();
  else { if (soundMaster && audioContext) soundMaster.gain.setValueAtTime(.18,audioContext.currentTime); playSound("success"); }
  updateSoundButton();
};
updateSoundButton();
document.addEventListener("visibilitychange",()=>{ if (document.hidden) muteSounds(); else if (soundEnabled && soundMaster && audioContext) soundMaster.gain.setValueAtTime(.18,audioContext.currentTime); });
document.addEventListener("click",e=>{
  const button=e.target.closest("button");
  if (!button || button.disabled || button.id==="sound" || button.id==="btn" || button.id==="gbtn" || button.closest("#qactions, #board")) return;
  playSound("click");
});

'''
s=s.replace(marker,sound+marker)
s=s.replace('    el.classList.remove("drag");\n    renumber();', '    el.classList.remove("drag");\n    if (to !== from) playSound("move");\n    renumber();')
s=s.replace('  G.score += right; G.max += PER_ROUND;', '  playSound(right === PER_ROUND ? "win" : right >= 3 ? "success" : "error");\n  G.score += right; G.max += PER_ROUND;')
s=s.replace('  renderQuestion();\n}\n\n// фази:', '  playSound("click");\n  renderQuestion();\n}\n\n// фази:')
s=s.replace('Q.open.phase = "judge"; renderQuestion();', 'Q.open.phase = "judge"; playSound("reveal"); renderQuestion();')
s=s.replace('function judge(ok) {\n  const o', 'function judge(ok) {\n  playSound(ok ? "success" : "error");\n  const o')
s=s.replace('  const t = item[1], pts = guessScore(cat, g, t);', '  const t = item[1], pts = guessScore(cat, g, t);\n  playSound(pts >= 95 ? "win" : pts >= 50 ? "success" : "error");')
s=s.replace('  confetti(60);\n  renderPlayers();\n}', '  confetti(60);\n  playSound("win");\n  renderPlayers();\n}')
s=s.replace('$("gzoom").onclick =', '$("gslider").addEventListener("change", () => { if (V && V.phase === "guess") playSound("click"); });\n$("gzoom").onclick =')
s=s.replace('/^(theme|best_|bestg_|quiz_players|custom_quiz)/', '/^(theme|sound$|best_|bestg_|quiz_players|custom_quiz)/')
s=s.replace('  PL = null; CUSTOM = null; Q = null;\n  applyTheme', '  PL = null; CUSTOM = null; Q = null;\n  soundEnabled=false; muteSounds(); updateSoundButton();\n  applyTheme')
s=s.replace('<tr><td>theme</td>', '<tr><td>sound</td><td>Увімкнені чи вимкнені звукові ефекти</td><td>Пам’ятати твій вибір звуку</td></tr>\n<tr><td>theme</td>')
p.write_text(s,encoding='utf-8')
