from pathlib import Path
import re,json
p=Path('index.html');s=p.read_text(encoding='utf-8');old=Path('index.original.html').read_text(encoding='utf-8')
logo=re.search(r'const LOGO = "([^"]+)";',old).group(1)
s=re.sub(r'<svg class="(logo[^\"]*)"[\s\S]*?</svg>',lambda m:'<img class="'+m.group(1)+'" src="'+logo+'" alt="The Ranking Game">',s)
s=s.replace('width:128px; height:auto; margin:0 auto 14px;', 'width:88px; height:auto; margin:0 auto 14px;')
# A top-down open-wheel car: distinct front/rear wings, cockpit and four tyres.
car='<path d="M7 3h10M8 5h8M10 5l-1 5v6l-2 3h10l-2-3v-6l-1-5M6 21h12"/><rect x="3.5" y="7" width="3" height="5" rx="1"/><rect x="17.5" y="7" width="3" height="5" rx="1"/><rect x="3.5" y="15" width="3" height="5" rx="1"/><rect x="17.5" y="15" width="3" height="5" rx="1"/><path d="M6.5 9h3m5 0h3.5M6.5 17H9m6 0h2.5M12 10v4"/>'
s=re.sub(r'  "Формула 1": .*', '  "Формула 1": '+json.dumps(car,ensure_ascii=False)+',',s)
s=s.replace('    if (to !== from) playSound("move");\n','')
s=s.replace('$("gslider").addEventListener("change", () => { if (V && V.phase === "guess") playSound("click"); });\n','')
# The long, warm chime is reserved for genuinely perfect answers.
s=s.replace('right === PER_ROUND ? "win"', 'right === PER_ROUND ? "perfect"')
s=s.replace('playSound(pts >= 95 ? "win" : pts >= 50 ? "success" : "error");','playSound(g === t ? "perfect" : pts >= 50 ? "success" : "error");')
s=s.replace('  click:[[640,0,.035]], move:[[480,0,.045],[660,.035,.055]],','''  click:[[640,0,.035]],
  perfect:[
    [261.626,0,1.05,.11], [391.995,.08,1.05,.08],
    [523.251,0,.32,.20], [659.255,.09,.34,.19],
    [783.991,.18,.40,.18], [1046.502,.30,.72,.17],
    [659.255,.43,.85,.10], [1318.510,.47,.88,.065],
  ],''')
s=s.replace('    // No queues: rapid repeated gestures cannot build up a wall of sound.', '''    // Let the exclusive reward ring clearly rather than mixing it with clicks.
    if (kind === "perfect") {
      for (const voice of activeVoices) { try { voice.stop(); } catch (_) {} }
      activeVoices.clear();
    }
    // No queues: rapid repeated gestures cannot build up a wall of sound.''')
s=s.replace('for (const [frequency,delay,duration] of SOUND_NOTES[kind]', 'for (const [frequency,delay,duration,level=.22] of SOUND_NOTES[kind]')
s=s.replace('oscillator.type=kind==="error"?"sine":"triangle";', 'oscillator.type=(kind==="error" || (kind==="perfect" && frequency<500))?"sine":"triangle";')
s=s.replace('envelope.gain.linearRampToValueAtTime(.22,start+.008);','envelope.gain.linearRampToValueAtTime(level,start+(kind==="perfect"?.015:.008));')
p.write_text(s,encoding='utf-8')
