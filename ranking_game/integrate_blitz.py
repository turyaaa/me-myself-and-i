from pathlib import Path
p=Path('index.html');s=p.read_text(encoding='utf-8')
s=s.replace('  /* Home branding shares the navigation\'s top edge; side lanes reserve controls. */\n  body.wide.home-view { padding-top:max(10px, env(safe-area-inset-top)); }\n  .home-view .logo-main { width:min(300px, calc(100vw - 208px)); margin:0 auto 22px; }\n','')
s=s.replace('  document.body.classList.toggle("home-view", name === "home");\n','')
s=s.replace('</style>',Path('blitz.css').read_text(encoding='utf-8')+'\n</style>')
s=s.replace('    <button class="mode" id="mode-guess">','    <button class="mode" id="mode-blitz"><span class="mt">Блітз</span><small>10 секунд на відповідь. Грай сам або в онлайн-дуелі з другом.</small></button>\n    <button class="mode" id="mode-guess">')
s=s.replace('<div id="editor" hidden>',Path('blitz-ui.html').read_text(encoding='utf-8')+'\n<div id="editor" hidden>')
s=s.replace('const SCREENS = ["home", "menu", "game", "guess", "quiz", "editor", "legal"];','const SCREENS = ["home", "menu", "game", "guess", "quiz", "editor", "legal", "blitz"];')
s=s.replace('function show(name) {\n  closeSidebar();','''function show(name) {
  if(name !== 'blitz') {
    if(B?.online && !['setup','end','cancelled'].includes(B.phase)) {
      duelRequest('leave',{room:B.room,token:B.token}).catch(()=>{});rememberDuel(null);
    }
    cleanupBlitz();
  }
  closeSidebar();''')
s=s.replace('[["mode-rank", "rank"], ["mode-guess", "guess"],', '[["mode-rank", "rank"], ["mode-blitz", "blitz"], ["mode-guess", "guess"],')
s=s.replace('ICONS["Українська література"] =', 'ICONS.blitz = svg(\'<path d="m14 2-9 12h6l-1 8 9-12h-6Z"/>\');\nICONS["Українська література"] =')
s=s.replace('[["best_", "Порядок"], ["bestg_", "Значення"]]', '[["best_", "Порядок"], ["bestg_", "Значення"], ["bestb_", "Блітз"]]')
s=s.replace('function inProgress() {','function inProgress() {\n  if (!$("blitz").hidden) return !!B && !["setup","end","cancelled"].includes(B.phase);')
s=s.replace('  if (!$("home").hidden) return "home";','  if (!$("blitz").hidden) return "blitz";\n  if (!$("home").hidden) return "home";')
s=s.replace('  item(ICONS.quiz, "Вікторина",', '  item(ICONS.blitz, "Блітз", showBlitzSetup, cm === "blitz");\n  item(ICONS.quiz, "Вікторина",')
s=s.replace('sound$|best_|bestg_', 'sound$|best_|bestg_|bestb_')
s=s.replace('button.id==="gbtn" || button.closest("#qactions, #board")','button.id==="gbtn" || button.classList.contains("boption") || button.closest("#qactions, #board")')
js=Path('blitz.js').read_text(encoding='utf-8')
invite=js[js.index("if(typeof location!=='undefined'){const invited="):]
js=js[:js.index("if(typeof location!=='undefined'){const invited=")]
at=s.rfind('showHome();')
s=s[:at]+js+'\nshowHome();\n'+invite+s[at+len('showHome();'):]
p.write_text(s,encoding='utf-8')
